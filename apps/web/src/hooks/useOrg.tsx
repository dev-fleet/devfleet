"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { GhOrganization } from "@/db/schema";

type OrgContextValue = {
  org: GhOrganization | null;
  setOrg: (org: GhOrganization | null) => void;
  refresh: () => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  children,
  initialOrg,
}: {
  children: React.ReactNode;
  initialOrg: GhOrganization; // always provided by server layout
}) {
  const [org, setOrg] = useState<GhOrganization | null>(initialOrg);

  const refresh = useCallback(async () => {
    if (!org) return;
    const res = await fetch(`/api/orgs/${org}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setOrg(data);
    }
  }, [org]);

  return (
    <OrgContext.Provider value={{ org, setOrg, refresh }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used inside <OrgProvider>");
  }
  return ctx;
}
