import { InsetHeader } from "@/components/sidebar/inset-header";
import { ReposTableClient } from "./repos-table-client";

export default async function ReposPage() {
  return (
    <>
      <InsetHeader title="Repositories" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Repositories</h1>
              <p className="text-muted-foreground">
                Manage your repositories and their agents
              </p>
            </div>
          </div>

          <ReposTableClient />
        </div>
      </div>
    </>
  );
}
