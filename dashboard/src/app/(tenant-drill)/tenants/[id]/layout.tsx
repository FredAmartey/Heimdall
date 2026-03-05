import { api } from "@/lib/api"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TenantSidebar } from "@/components/nav/tenant-sidebar"
import { PermissionProvider } from "@/components/providers/permission-provider"
import type { Tenant } from "@/lib/types"

export default async function TenantDrillLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.isPlatformAdmin) {
    redirect("/")
  }

  let tenant: Tenant
  try {
    tenant = await api<Tenant>(`/api/v1/tenants/${id}`)
  } catch {
    redirect("/tenants")
  }

  const roles = session.user.roles ?? []

  return (
    <PermissionProvider roles={roles} isPlatformAdmin>
      <div className="flex min-h-[100dvh]">
        <div className="hidden lg:block">
          <TenantSidebar tenantId={id} tenantName={tenant.name} />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex h-14 items-center border-b border-zinc-200 bg-white px-4 lg:px-6">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
              Viewing <strong>{tenant.name}</strong> &mdash; Read only
            </div>
          </div>
          <main className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </PermissionProvider>
  )
}
