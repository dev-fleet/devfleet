import { InsetHeader } from "@/components/sidebar/inset-header";
import { AgentDetailClient } from "./AgentDetailClient";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  return (
    <>
      <InsetHeader title="Agent detail" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <AgentDetailClient agentId={agentId} />
      </div>
    </>
  );
}
