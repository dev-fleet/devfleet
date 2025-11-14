"use client";

import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { InsetHeader } from "@/components/sidebar/inset-header";
import { AgentsTableClient } from "./table-client";

export default function AgentsPage() {
  const router = useRouter();

  return (
    <>
      <InsetHeader title="Agents">
        <Button onClick={() => router.push("/agents/wizard")}>New Agent</Button>
      </InsetHeader>
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <AgentsTableClient />
      </div>
    </>
  );
}
