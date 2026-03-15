package proxy

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/valinor-ai/valinor/internal/approvals"
	"github.com/valinor-ai/valinor/internal/connectors"
	"github.com/valinor-ai/valinor/internal/orchestrator"
	"github.com/valinor-ai/valinor/internal/platform/database"
)

type ConnectorActionResolver struct {
	pool        *database.Pool
	connPool    *ConnPool
	agents      AgentLookup
	actionStore *connectors.GovernedActionStore
}

func NewConnectorActionResolver(pool *database.Pool, connPool *ConnPool, agents AgentLookup, actionStore *connectors.GovernedActionStore) *ConnectorActionResolver {
	return &ConnectorActionResolver{
		pool:        pool,
		connPool:    connPool,
		agents:      agents,
		actionStore: actionStore,
	}
}

func (r *ConnectorActionResolver) ResolveConnectorAction(ctx context.Context, tenantID string, request *approvals.Request, approved bool) error {
	if r == nil || r.pool == nil || r.connPool == nil || r.agents == nil || r.actionStore == nil || request == nil {
		return nil
	}

	actionID, ok := extractActionID(request.Metadata)
	if !ok {
		return nil
	}

	var action *connectors.GovernedAction
	err := database.WithTenantConnection(ctx, r.pool, tenantID, func(ctx context.Context, q database.Querier) error {
		var err error
		action, err = r.actionStore.GetByID(ctx, q, actionID)
		if err != nil {
			return err
		}
		if approved {
			action, err = r.actionStore.MarkApproved(ctx, q, action.ID)
		} else {
			action, err = r.actionStore.MarkDenied(ctx, q, action.ID)
		}
		return err
	})
	if err != nil || !approved {
		return err
	}

	if action == nil || action.AgentID == nil {
		return errors.New("governed action has no agent context")
	}

	inst, err := r.agents.GetByID(ctx, action.AgentID.String())
	if err != nil {
		r.markActionFailed(ctx, tenantID, action.ID)
		return fmt.Errorf("loading agent for governed action: %w", err)
	}
	if inst.Status != orchestrator.StatusRunning || inst.VsockCID == nil {
		r.markActionFailed(ctx, tenantID, action.ID)
		return errors.New("agent is not running for governed action")
	}

	conn, err := r.connPool.Get(ctx, inst.ID, *inst.VsockCID)
	if err != nil {
		r.markActionFailed(ctx, tenantID, action.ID)
		return fmt.Errorf("connecting to agent for governed action: %w", err)
	}

	payload, err := json.Marshal(ConnectorActionResumePayload{
		ActionID:    action.ID.String(),
		ApprovalID:  request.ID.String(),
		ConnectorID: action.ConnectorID.String(),
		ToolName:    action.ToolName,
		Arguments:   string(action.Arguments),
		RiskClass:   action.RiskClass,
	})
	if err != nil {
		r.markActionFailed(ctx, tenantID, action.ID)
		return fmt.Errorf("marshaling connector action resume payload: %w", err)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	stream, err := conn.SendRequest(reqCtx, Frame{
		Type:    TypeConnectorActionResume,
		ID:      uuid.NewString(),
		Payload: payload,
	})
	if err != nil {
		r.markActionFailed(ctx, tenantID, action.ID)
		return fmt.Errorf("sending connector action resume request: %w", err)
	}
	defer stream.Close()

	for {
		reply, err := stream.Recv(reqCtx)
		if err != nil {
			r.markActionFailed(ctx, tenantID, action.ID)
			return fmt.Errorf("waiting for connector action resume result: %w", err)
		}

		switch reply.Type {
		case TypeRuntimeEvent:
			continue
		case TypeToolExecuted:
			return database.WithTenantConnection(ctx, r.pool, tenantID, func(ctx context.Context, q database.Querier) error {
				_, err := r.actionStore.MarkExecuted(ctx, q, action.ID)
				return err
			})
		case TypeToolFailed, TypeError:
			r.markActionFailed(ctx, tenantID, action.ID)
			return errors.New("approved connector action execution failed")
		}
	}
}

func (r *ConnectorActionResolver) markActionFailed(ctx context.Context, tenantID string, actionID uuid.UUID) {
	if r == nil || r.pool == nil || r.actionStore == nil {
		return
	}
	_ = database.WithTenantConnection(ctx, r.pool, tenantID, func(ctx context.Context, q database.Querier) error {
		_, err := r.actionStore.MarkFailed(ctx, q, actionID)
		return err
	})
}

func extractActionID(metadata map[string]any) (uuid.UUID, bool) {
	if metadata == nil {
		return uuid.Nil, false
	}
	value, ok := metadata["governed_action_id"]
	if !ok {
		return uuid.Nil, false
	}
	id, ok := value.(string)
	if !ok {
		return uuid.Nil, false
	}
	parsed, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil, false
	}
	return parsed, true
}
