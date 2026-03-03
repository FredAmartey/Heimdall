"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api-client"
import type { Department, CreateDepartmentRequest, UpdateDepartmentRequest } from "@/lib/types"

export const departmentKeys = {
  all: ["departments"] as const,
  list: () => [...departmentKeys.all, "list"] as const,
  detail: (id: string) => [...departmentKeys.all, "detail", id] as const,
}

export async function fetchDepartments(
  accessToken: string,
): Promise<Department[]> {
  return apiClient<Department[]>("/api/v1/departments", accessToken, undefined)
}

export async function fetchDepartment(
  accessToken: string,
  id: string,
): Promise<Department> {
  return apiClient<Department>(`/api/v1/departments/${id}`, accessToken, undefined)
}

export async function createDepartment(
  accessToken: string,
  data: CreateDepartmentRequest,
): Promise<Department> {
  return apiClient<Department>("/api/v1/departments", accessToken, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateDepartment(
  accessToken: string,
  id: string,
  data: UpdateDepartmentRequest,
): Promise<Department> {
  return apiClient<Department>(`/api/v1/departments/${id}`, accessToken, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteDepartment(
  accessToken: string,
  id: string,
): Promise<{ status: string }> {
  return apiClient<{ status: string }>(`/api/v1/departments/${id}`, accessToken, {
    method: "DELETE",
  })
}

export function useDepartmentsQuery() {
  const { data: session } = useSession()
  return useQuery({
    queryKey: departmentKeys.list(),
    queryFn: () => fetchDepartments(session!.accessToken),
    enabled: !!session?.accessToken,
    staleTime: 30_000,
  })
}

export function useDepartmentQuery(id: string) {
  const { data: session } = useSession()
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => fetchDepartment(session!.accessToken, id),
    enabled: !!session?.accessToken && !!id,
  })
}

export function useCreateDepartmentMutation() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) =>
      createDepartment(session!.accessToken, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })
}

export function useUpdateDepartmentMutation(id: string) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateDepartmentRequest) =>
      updateDepartment(session!.accessToken, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: departmentKeys.list() })
    },
  })
}

export function useDeleteDepartmentMutation(id: string) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteDepartment(session!.accessToken, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })
}
