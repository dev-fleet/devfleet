"use client";

import { useState } from "react";
import { AgentWizard } from "./AgentWizard";
import { InsetHeader } from "@/components/sidebar/inset-header";

export default function AgentWizardPage() {
  return (
    <>
      <InsetHeader title="Create New Agent" />
      <div className="container mx-auto max-w-5xl py-8">
        <AgentWizard />
      </div>
    </>
  );
}

