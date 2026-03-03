package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"
)

// Subprocess manages a child process lifecycle.
type Subprocess struct {
	Name      string
	Args      []string
	Env       []string
	Dir       string
	ReadyURL  string        // HTTP URL to poll for readiness
	ReadyWait time.Duration // max time to wait for readiness

	mu      sync.Mutex
	cmd     *exec.Cmd
	running bool
}

// Start launches the subprocess.
func (s *Subprocess) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.cmd = exec.CommandContext(ctx, s.Name, s.Args...)
	s.cmd.Env = append(os.Environ(), s.Env...)
	if s.Dir != "" {
		s.cmd.Dir = s.Dir
	}
	s.cmd.Stdout = os.Stdout
	s.cmd.Stderr = os.Stderr
	s.cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := s.cmd.Start(); err != nil {
		return fmt.Errorf("starting %s: %w", s.Name, err)
	}

	s.running = true
	slog.Info("subprocess started", "name", s.Name, "pid", s.cmd.Process.Pid)

	go func() {
		_ = s.cmd.Wait()
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
		slog.Info("subprocess exited", "name", s.Name)
	}()

	return nil
}

// WaitForReady polls the ReadyURL until it responds or the context expires.
func (s *Subprocess) WaitForReady(ctx context.Context) error {
	if s.ReadyURL == "" {
		return nil
	}

	deadline := s.ReadyWait
	if deadline <= 0 {
		deadline = 10 * time.Second
	}

	waitCtx, cancel := context.WithTimeout(ctx, deadline)
	defer cancel()

	httpClient := &http.Client{Timeout: 1 * time.Second}
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-waitCtx.Done():
			return fmt.Errorf("subprocess %s not ready after %s: %w", s.Name, deadline, waitCtx.Err())
		case <-ticker.C:
			req, err := http.NewRequestWithContext(waitCtx, http.MethodGet, s.ReadyURL, nil)
			if err != nil {
				continue
			}
			resp, err := httpClient.Do(req)
			if err != nil {
				continue
			}
			resp.Body.Close()
			if resp.StatusCode < 500 {
				slog.Info("subprocess ready", "name", s.Name, "url", s.ReadyURL)
				return nil
			}
		}
	}
}

// Stop sends SIGTERM to the process group, then SIGKILL if needed.
func (s *Subprocess) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running || s.cmd == nil || s.cmd.Process == nil {
		return nil
	}

	// Send SIGTERM to process group
	if err := syscall.Kill(-s.cmd.Process.Pid, syscall.SIGTERM); err != nil {
		slog.Warn("SIGTERM failed, sending SIGKILL", "name", s.Name, "error", err)
		_ = s.cmd.Process.Kill()
	}

	s.running = false
	return nil
}

// Running returns whether the subprocess is still running.
func (s *Subprocess) Running() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running
}
