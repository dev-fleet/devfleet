import { InsetHeader } from "@/components/sidebar/inset-header";
import { AgentsTableClient } from "./table-client";

export default async function AgentsPage() {
  return (
    <>
      <InsetHeader title="Agents" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <AgentsTableClient />
      </div>
    </>
  );
}
