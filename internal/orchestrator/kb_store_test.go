package orchestrator_test

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/valinor-ai/valinor/internal/orchestrator"
	"github.com/valinor-ai/valinor/internal/platform/database"
)

func requireTestDB(t *testing.T) *database.Pool {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://valinor:valinor@localhost:5432/valinor?sslmode=disable"
	}
	pool, err := database.Connect(context.Background(), dsn, 2)
	if err != nil {
		t.Skip("database not available, skipping integration test")
	}
	t.Cleanup(func() { pool.Close() })
	return pool
}

func TestKBStore_GrantsForUser(t *testing.T) {
	pool := requireTestDB(t)
	ctx := context.Background()
	kbStore := orchestrator.NewKBStore()

	// Use known test tenant from seed data
	tenantID := "a1b2c3d4-0001-4000-8000-000000000001" // gondolin-fc

	// With no grants configured, should return empty slice
	grants, err := kbStore.GrantsForUser(ctx, pool, tenantID, "00000000-0000-0000-0000-000000000099", "00000000-0000-0000-0000-000000000099")
	require.NoError(t, err)
	require.Empty(t, grants)
}
