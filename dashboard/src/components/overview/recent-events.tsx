"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { ApiError } from "@/lib/api-error"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTimeAgo } from "@/lib/format"
import type { AuditEvent } from "@/lib/types"

interface RecentEventsProps {
  canReadAudit: boolean
  hasTenant: boolean
}

export function RecentEvents({ canReadAudit, hasTenant }: RecentEventsProps) {
  const endpoint = canReadAudit ? "/api/v1/audit/events" : "/api/v1/me/activity"
  const queryKey = canReadAudit ? ["audit", "recent"] : ["me", "activity"]

  const { data: events, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      apiClient<{ count: number; events: AuditEvent[] }>(endpoint, {
        params: { limit: "10" },
      }),
    select: (data) => data.events,
    enabled: hasTenant,
    refetchInterval: 30_000,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) return false
      return failureCount < 3
    },
  })

  if (!hasTenant) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-zinc-500">No activity to show yet.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (isError && error instanceof ApiError && (error.status === 403 || error.status === 401)) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-zinc-500">No activity to show yet.</p>
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-zinc-500">Failed to load recent activity.</p>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-zinc-500">No activity recorded yet.</p>
        <p className="mt-1 text-xs text-zinc-400">
          Activity appears here as you interact with the platform.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-zinc-100">
      {events.map((event) => (
        <div key={event.id} className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-900">{event.action}</span>
            {event.resource_type && (
              <span className="text-xs text-zinc-400">{event.resource_type}</span>
            )}
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {formatTimeAgo(event.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
