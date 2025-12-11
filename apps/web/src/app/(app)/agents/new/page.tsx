import { redirect } from "next/navigation";

// Redirect to the wizard for creating new agents
export default function NewAgentPage() {
  redirect("/agents/wizard");
}
