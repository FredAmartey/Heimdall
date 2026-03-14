package policies

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/valinor-ai/valinor/internal/platform/middleware"
)

func TestEvaluate(t *testing.T) {
	defaults := DefaultPolicySet()
	overrides := PolicySet{
		"sensitive_data_access": DecisionRequireApproval,
	}

	assert.Equal(t, DecisionAllow, Evaluate(defaults, nil, "channel_sends"))
	assert.Equal(t, DecisionRequireApproval, Evaluate(defaults, overrides, "sensitive_data_access"))
	assert.Equal(t, DecisionBlock, Evaluate(defaults, nil, "unknown"))
}

func TestHandleGetDefaults_NilPool(t *testing.T) {
	h := NewHandler(nil, nil)
	req := httptest.NewRequest("GET", "/api/v1/policies/defaults", nil)
	req = req.WithContext(middleware.WithTenantID(req.Context(), "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"))
	w := httptest.NewRecorder()

	h.HandleGetDefaults(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"policies"`)
}

func TestHandlePutDefaults_InvalidBody(t *testing.T) {
	h := NewHandler(nil, nil)
	req := httptest.NewRequest("PUT", "/api/v1/policies/defaults", strings.NewReader(`nope`))
	req = req.WithContext(middleware.WithTenantID(req.Context(), "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"))
	w := httptest.NewRecorder()

	h.HandlePutDefaults(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestHandleGetAgentOverrides_InvalidAgentID(t *testing.T) {
	h := NewHandler(nil, nil)
	req := httptest.NewRequest("GET", "/api/v1/agents/not-a-uuid/policy-overrides", nil)
	req.SetPathValue("id", "not-a-uuid")
	req = req.WithContext(middleware.WithTenantID(req.Context(), "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"))
	w := httptest.NewRecorder()

	h.HandleGetAgentOverrides(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
