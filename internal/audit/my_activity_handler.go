package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/valinor-ai/valinor/internal/auth"
	"github.com/valinor-ai/valinor/internal/platform/database"
	"github.com/valinor-ai/valinor/internal/platform/middleware"
)

// HandleMyActivity returns audit events for the authenticated user only.
// GET /api/v1/me/activity?limit=10
func (h *Handler) HandleMyActivity(w http.ResponseWriter, r *http.Request) {
	identity := auth.GetIdentity(r.Context())
	if identity == nil {
		writeAuditJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	tenantIDStr := middleware.GetTenantID(r.Context())
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		writeAuditJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid tenant context"})
		return
	}

	userID, err := uuid.Parse(identity.UserID)
	if err != nil {
		writeAuditJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid user identity"})
		return
	}

	limit := 10
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, parseErr := strconv.Atoi(raw); parseErr == nil && n > 0 && n <= 50 {
			limit = n
		}
	}

	params := ListEventsParams{
		TenantID: tenantID,
		UserID:   &userID,
		Limit:    limit,
	}

	if h.pool == nil {
		writeAuditJSON(w, http.StatusOK, map[string]any{"events": []any{}, "count": 0})
		return
	}

	var events []map[string]any
	queryErr := database.WithTenantConnection(r.Context(), h.pool, tenantIDStr, func(ctx context.Context, q database.Querier) error {
		sql, args := buildListQuery(params)
		rows, qErr := q.Query(ctx, sql, args...)
		if qErr != nil {
			return qErr
		}
		defer rows.Close()

		for rows.Next() {
			var (
				id, tid    uuid.UUID
				uid, resID *uuid.UUID
				action     string
				resType    *string
				metadata   json.RawMessage
				source     string
				createdAt  time.Time
			)
			if scanErr := rows.Scan(&id, &tid, &uid, &action, &resType, &resID, &metadata, &source, &createdAt); scanErr != nil {
				slog.Warn("skipping audit event: scan error", "error", scanErr)
				continue
			}
			events = append(events, map[string]any{
				"id":            id,
				"tenant_id":     tid,
				"user_id":       uid,
				"action":        action,
				"resource_type": resType,
				"resource_id":   resID,
				"metadata":      metadata,
				"source":        source,
				"created_at":    createdAt,
			})
		}
		return nil
	})

	if queryErr != nil {
		writeAuditJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}

	if events == nil {
		events = []map[string]any{}
	}

	writeAuditJSON(w, http.StatusOK, map[string]any{"events": events, "count": len(events)})
}
