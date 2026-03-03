# User & Department CRUD Completion — Design

## Goal

Complete update and delete operations for users and departments across all layers (store, handler, route, query hook, UI) in a single PR.

## Scope

### Users

**Update** (`PUT /api/v1/users/{id}`)
- Editable fields: `display_name`, `status` (active/suspended)
- Email is immutable after creation (OIDC-bound)
- RBAC: `users:write`
- Audit: `user.updated`

**Delete** (soft-delete via existing `status` column)
- `DELETE /api/v1/users/{id}` sets `status = 'suspended'`
- Suspended users filtered from default list; `?include_suspended=true` shows all
- RBAC: `users:write`
- Audit: `user.suspended`

**UI** — inline edit on `/users/[id]` detail page
- Edit button toggles `display_name` to input, adds status dropdown
- Save/Cancel buttons appear in edit mode
- Delete button (suspends) with confirmation dialog

### Departments

**Update** (`PUT /api/v1/departments/{id}`)
- Editable fields: `name`, `parent_id`
- RBAC: `departments:write`
- Audit: `department.updated`

**Delete** (hard-delete)
- `DELETE /api/v1/departments/{id}` removes row from DB
- Cascades to `user_departments` junction rows
- RBAC: `departments:write`
- Audit: `department.deleted`

**UI** — inline edit on `/departments/[id]` detail page
- Edit button toggles `name` to input, `parent` to dropdown
- Save/Cancel buttons appear in edit mode
- Delete button with confirmation dialog

## Layer-by-layer changes

| Layer | Users | Departments |
|-------|-------|-------------|
| Store | `Update(id, displayName, status)`, `SoftDelete(id)` | `Update(id, name, parentID)`, `Delete(id)` |
| Handler | `HandleUpdate`, `HandleDelete` | `HandleUpdate`, `HandleDelete` |
| Routes | `PUT /users/{id}`, `DELETE /users/{id}` | `PUT /departments/{id}`, `DELETE /departments/{id}` |
| Query hooks | `useUpdateUserMutation`, `useDeleteUserMutation` | `useUpdateDepartmentMutation`, `useDeleteDepartmentMutation` |
| Components | Edit mode in `user-detail.tsx` | Edit mode in `department-detail.tsx` |
| Audit labels | `user.updated`, `user.suspended` | `department.updated`, `department.deleted` |

## Out of scope

- Email changes (OIDC-bound)
- `updated_at` column migration
- Connector updates (separate PR)
- Department members list on department detail page

## Risks

- Hard-deleting a department cascades to `user_departments` — users lose their department assignment silently. Acceptable for now; confirmation dialog warns the user.
- Suspending a user does not revoke active JWTs — they remain valid until expiry. Documented behavior; roles baked into JWT at login.
