"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  useDepartmentQuery,
  useDepartmentsQuery,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from "@/lib/queries/departments"
import { DepartmentMembersSection } from "./department-members-section"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import { PencilSimple, Trash, X, Check } from "@phosphor-icons/react"
import { useCan } from "@/components/providers/permission-provider"
import Link from "next/link"

export function DepartmentDetail({ id }: { id: string }) {
  const router = useRouter()
  const { data: department, isLoading, isError } = useDepartmentQuery(id)
  const { data: allDepartments } = useDepartmentsQuery()
  const updateMutation = useUpdateDepartmentMutation(id)
  const deleteMutation = useDeleteDepartmentMutation(id)
  const canWrite = useCan("departments:write")

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState<string>("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !department) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Failed to load department details.</p>
      </div>
    )
  }

  const parentName = department.parent_id
    ? allDepartments?.find((d) => d.id === department.parent_id)?.name
    : null

  // Filter out self from parent options to prevent circular reference
  const parentOptions = allDepartments?.filter((d) => d.id !== id) ?? []

  function startEditing() {
    setName(department!.name)
    setParentId(department!.parent_id ?? "")
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setConfirmDelete(false)
  }

  function handleSave() {
    updateMutation.mutate(
      {
        name,
        parent_id: parentId || null,
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => router.push("/departments"),
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
                <label className="mb-1 block text-xs font-medium text-zinc-500">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 w-64 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Parent Department</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="h-9 w-64 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                >
                  <option value="">None (top-level)</option>
                  {parentOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {department.name}
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
                {parentName ? (
                  <span>
                    Parent:{" "}
                    <Link href={`/departments/${department.parent_id}`} className="text-zinc-700 hover:underline">
                      {parentName}
                    </Link>
                  </span>
                ) : (
                  <span>Top-level department</span>
                )}
                <span>Created {formatDate(department.created_at, "long")}</span>
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
                disabled={updateMutation.isPending || !name.trim()}
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
                    Delete
                  </button>
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Confirm delete"}
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

      {/* Warning when confirming delete */}
      {confirmDelete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Deleting this department will also remove all user memberships associated with it.
          </p>
        </div>
      )}

      {/* Members */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <DepartmentMembersSection departmentId={id} />
      </div>
    </div>
  )
}
