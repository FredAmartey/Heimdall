package tenant

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InviteStore struct {
	pool *pgxpool.Pool
}

func NewInviteStore(pool *pgxpool.Pool) *InviteStore {
	return &InviteStore{pool: pool}
}

func generateCode() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generating invite code: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func (s *InviteStore) Create(ctx context.Context, tenantID, createdBy, role string, ttl time.Duration) (*Invite, error) {
	code, err := generateCode()
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().Add(ttl)

	var inv Invite
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tenant_invites (tenant_id, code, role, created_by, expires_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, code, role, created_by, expires_at, used_by, used_at, created_at`,
		tenantID, code, role, createdBy, expiresAt,
	).Scan(&inv.ID, &inv.TenantID, &inv.Code, &inv.Role, &inv.CreatedBy,
		&inv.ExpiresAt, &inv.UsedBy, &inv.UsedAt, &inv.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating invite: %w", err)
	}
	return &inv, nil
}

func (s *InviteStore) GetByCode(ctx context.Context, code string) (*Invite, error) {
	var inv Invite
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, code, role, created_by, expires_at, used_by, used_at, created_at
		 FROM tenant_invites WHERE code = $1`,
		code,
	).Scan(&inv.ID, &inv.TenantID, &inv.Code, &inv.Role, &inv.CreatedBy,
		&inv.ExpiresAt, &inv.UsedBy, &inv.UsedAt, &inv.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, ErrInviteNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting invite by code: %w", err)
	}
	return &inv, nil
}

func (s *InviteStore) ListByTenant(ctx context.Context, tenantID string) ([]Invite, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, code, role, created_by, expires_at, used_by, used_at, created_at
		 FROM tenant_invites WHERE tenant_id = $1 ORDER BY created_at DESC`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing invites: %w", err)
	}
	defer rows.Close()

	var invites []Invite
	for rows.Next() {
		var inv Invite
		if err := rows.Scan(&inv.ID, &inv.TenantID, &inv.Code, &inv.Role, &inv.CreatedBy,
			&inv.ExpiresAt, &inv.UsedBy, &inv.UsedAt, &inv.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning invite: %w", err)
		}
		invites = append(invites, inv)
	}
	return invites, nil
}

func (s *InviteStore) Redeem(ctx context.Context, code, userID string) error {
	inv, err := s.GetByCode(ctx, code)
	if err != nil {
		return err
	}
	if inv.UsedAt != nil {
		return ErrInviteUsed
	}
	if time.Now().After(inv.ExpiresAt) {
		return ErrInviteExpired
	}

	tag, err := s.pool.Exec(ctx,
		`UPDATE tenant_invites SET used_by = $1, used_at = now()
		 WHERE code = $2 AND used_at IS NULL`,
		userID, code,
	)
	if err != nil {
		return fmt.Errorf("redeeming invite: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrInviteUsed
	}
	return nil
}

func (s *InviteStore) Delete(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM tenant_invites WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting invite: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrInviteNotFound
	}
	return nil
}
