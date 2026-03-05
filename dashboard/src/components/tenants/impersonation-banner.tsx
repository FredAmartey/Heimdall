"use client"

import { Warning } from "@phosphor-icons/react"

interface ImpersonationBannerProps {
  tenantName: string
  onExit: () => void
}

export function ImpersonationBanner({ tenantName, onExit }: ImpersonationBannerProps) {
  return (
    <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-sm text-white">
      <div className="flex items-center gap-2">
        <Warning size={16} weight="fill" />
        <span>
          Impersonating <strong>{tenantName}</strong> — Emergency access
        </span>
      </div>
      <button
        onClick={onExit}
        className="rounded border border-red-400 px-3 py-1 text-xs font-medium transition-colors hover:bg-red-700"
      >
        Exit
      </button>
    </div>
  )
}
