import { ApprovalsQueue } from "@/components/approvals/approvals-queue";
import { HandPalm } from "@phosphor-icons/react/dist/ssr";

export default async function TenantApprovalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HandPalm size={24} className="text-zinc-400" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Approvals
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review this tenant’s pending and recently resolved approval
            requests.
          </p>
        </div>
      </div>
      <ApprovalsQueue tenantId={id} />
    </div>
  );
}
