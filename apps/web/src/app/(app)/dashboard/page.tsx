import { InsetHeader } from "@/components/sidebar/inset-header";
import { DashboardMetrics } from "./DashboardMetrics";

export default async function DashboardPage() {
  return (
    <>
      <InsetHeader title="Home" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          <DashboardMetrics />
        </div>
      </div>
    </>
  );
}
