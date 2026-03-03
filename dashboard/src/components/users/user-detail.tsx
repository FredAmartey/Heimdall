"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUserQuery, useUpdateUserMutation, useDeleteUserMutation } from "@/lib/queries/users"
import { UserStatusBadge } from "./user-status-badge"
import { UserDepartmentsSection } from "./user-departments-section"
import { UserRolesSection } from "./user-roles-section"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import { PencilSimple, Trash, X, Check } from "@phosphor-icons/react"
import { useCan } from "@/components/providers/permission-provider"

interface UserDetailProps {
  id: string
  tenantId: string
}

export function UserDetail({ id, tenantId }: UserDetailProps) {
  const router = useRouter()
  const { data: user, isLoading, isError } = useUserQuery(id)
  const updateMutation = useUpdateUserMutation(id)
  const deleteMutation = useDeleteUserMutation(id)
  const canWrite = useCan("users:write")

  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [status, setStatus] = useState<"active" | "suspended">("active")
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Failed to load user details.</p>
      </div>
    )
  }

  function startEditing() {
    setDisplayName(user!.display_name || "")
    setStatus(user!.status)
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setConfirmDelete(false)
  }

  function handleSave() {
    updateMutation.mutate(
      { display_name: displayName, status },
      { onSuccess: () => setEditing(false) },
    )
  }

  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => router.push("/users"),
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-9 w-64 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "suspended")}
                  className="h-9 w-40 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  {user.display_name || user.email}
                </h1>
                <UserStatusBadge status={user.status} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
                <span>{user.email}</span>
                <span>Created {formatDate(user.created_at, "long")}</span>
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                <Check size={14} weight="bold" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEditing}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors active:scale-[0.98]"
              >
                <X size={14} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <span
                title={!canWrite ? "You don't have permission to do this." : undefined}
                className={!canWrite ? "cursor-not-allowed" : undefined}
              >
                <button
                  onClick={startEditing}
                  disabled={!canWrite}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                >
                  <PencilSimple size={14} />
                  Edit
                </button>
              </span>
              {!confirmDelete ? (
                <span
                  title={!canWrite ? "You don't have permission to do this." : undefined}
                  className={!canWrite ? "cursor-not-allowed" : undefined}
                >
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={!canWrite}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  >
                    <Trash size={14} />
                    Suspend
                  </button>
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Suspending..." : "Confirm suspend"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-sm text-zinc-500 hover:text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Departments & Roles */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <UserDepartmentsSection userId={id} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <UserRolesSection userId={id} tenantId={tenantId} />
        </div>
      </div>
    </div>
  )
}
