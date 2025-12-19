import { InsetHeader } from "@/components/sidebar/inset-header";
import { SettingsClient } from "./SettingsClient";

export default function SettingsPage() {
  return (
    <>
      <InsetHeader title="Settings" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <SettingsClient />
      </div>
    </>
  );
}
