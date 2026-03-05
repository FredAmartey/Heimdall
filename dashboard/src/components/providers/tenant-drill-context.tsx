"use client"

import { createContext, useContext } from "react"

interface TenantDrillContextValue {
  tenantId: string
  tenantName: string
}

const TenantDrillContext = createContext<TenantDrillContextValue | null>(null)

export function TenantDrillProvider({
  tenantId,
  tenantName,
  children,
}: TenantDrillContextValue & { children: React.ReactNode }) {
  return (
    <TenantDrillContext.Provider value={{ tenantId, tenantName }}>
      {children}
    </TenantDrillContext.Provider>
  )
}

export function useTenantDrill() {
  const ctx = useContext(TenantDrillContext)
  if (!ctx) throw new Error("useTenantDrill must be used within TenantDrillProvider")
  return ctx
}
