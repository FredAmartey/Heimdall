package orchestrator

import (
	"context"
	"fmt"
	"sync"
)

// DockerDriverConfig holds configuration for the Docker-based VM driver.
type DockerDriverConfig struct {
	Image            string
	NetworkMode      string // "none", "per-tenant", "bridge"
	DefaultCPUs      int
	DefaultMemoryMB  int
	MemoryBasePath   string
	WorkspaceQuotaMB int
}

// DockerDriver manages agent containers via the Docker Engine API.
type DockerDriver struct {
	cfg DockerDriverConfig
	mu  sync.Mutex
}

// NewDockerDriver creates a DockerDriver.
func NewDockerDriver(cfg DockerDriverConfig) *DockerDriver {
	return &DockerDriver{cfg: cfg}
}

func (d *DockerDriver) Start(_ context.Context, _ VMSpec) (VMHandle, error) {
	return VMHandle{}, fmt.Errorf("docker driver: not yet implemented")
}

func (d *DockerDriver) Stop(_ context.Context, _ string) error {
	return fmt.Errorf("docker driver: not yet implemented")
}

func (d *DockerDriver) IsHealthy(_ context.Context, _ string) (bool, error) {
	return false, fmt.Errorf("docker driver: not yet implemented")
}

func (d *DockerDriver) Cleanup(_ context.Context, _ string) error {
	return fmt.Errorf("docker driver: not yet implemented")
}
