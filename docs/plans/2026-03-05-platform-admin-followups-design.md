# Platform Admin Follow-Ups — Design

Three wiring tasks left from PR #76 (platform admin tenant navigation).

## 1. Impersonation JWT Generation

**Problem:** `POST /api/v1/tenants/{id}/impersonate` returns 501. The handler validates the request and logs an audit event but cannot issue a token.

**Design:**

Add `CreateImpersonationToken(identity *Identity, targetTenantID string) (string, error)` to `TokenService` in `internal/auth/token.go`. It creates a 30-minute access token with:

- `tid` = target tenant ID
- `roles` = `["org_admin"]` (full permissions inside the tenant)
- `pa` = true (retained — the user is still a platform admin)
- New claim `imp` = impersonator's original user ID (for audit trail)
- `type` = `"access"`

The handler in `impersonate.go`:
1. Validates tenant exists via `SELECT 1 FROM tenants WHERE id = $1`
2. Builds an `Identity` with the target tenant context
3. Calls `CreateImpersonationToken`
4. Returns `{ token, expires_in, tenant_name }`

No new tables or migrations. The `imp` claim is informational — audit events already capture `impersonator_id` in metadata.

## 2. Impersonation Banner Wiring

**Problem:** `impersonation-banner.tsx` exists but isn't rendered. The session/JWT has no impersonation fields.

**Design:**

**Frontend session changes** (`dashboard/src/lib/auth.ts`):
- Add `impersonatingTenantName?: string` to `User`, `JWT`, and `Session` types
- JWT callback: thread `user.impersonatingTenantName` into `token.impersonatingTenantName`
- Session callback: expose on `session.user.impersonatingTenantName`

**Tenant detail dialog** (`tenant-detail.tsx`):
- Remove the placeholder warning and `disabled` from the "Enter Tenant" button
- On confirm: `POST /api/v1/tenants/{id}/impersonate`, store returned token, call `signIn("credentials", ...)` with impersonation data, redirect to `/`

**Dashboard layout** (`app/(dashboard)/layout.tsx`):
- Read `session.user.impersonatingTenantName`
- If set, render `<ImpersonationBanner>` above the header
- "Exit" button: clear impersonation token, re-auth with original credentials, redirect to `/tenants`

## 3. Overview Stat Cards

**Problem:** "Total Users" and "Active Channels" stat cards show em dashes (`—`) on the overview page for tenant users (org_admin/dept_head role).

**Design:**

In `overview.tsx`:
- Add `useUsersQuery()` and `useChannelLinksQuery()` hooks (already exist in `lib/queries/`)
- Pass user count and active channel count into `buildStatCards`
- Replace hardcoded `"—"` with actual values: `users.length` and `links.filter(l => l.status === "active").length`
- Include both queries in the `isLoading` check

No backend changes — both `GET /api/v1/users` and `GET /api/v1/channels/links` already exist and return the needed data.

## Files Modified

| File | Change |
|------|--------|
| `internal/auth/token.go` | Add `CreateImpersonationToken` method |
| `internal/platform/admin/impersonate.go` | Wire token generation, validate tenant exists |
| `dashboard/src/lib/auth.ts` | Add `impersonatingTenantName` to types/callbacks |
| `dashboard/src/components/tenants/tenant-detail.tsx` | Wire "Enter Tenant" button to impersonate endpoint |
| `dashboard/src/app/(dashboard)/layout.tsx` | Conditionally render impersonation banner |
| `dashboard/src/components/overview/overview.tsx` | Fetch users + channels, pass counts to stat cards |

## Out of Scope

- Impersonation token refresh (30 min is hard limit — re-impersonate if needed)
- Two-person approval for impersonation (enterprise follow-up)
- SSR data fetching for stat cards (client-side queries sufficient)
