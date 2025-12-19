import { InsetHeader } from "@/components/sidebar/inset-header";
import { LLMSettings } from "./LLMSettings";

export default function SettingsPage() {
  return (
    <>
      <InsetHeader title="Organization Settings" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          <LLMSettings />
        </div>
      </div>
    </>
  );
}

