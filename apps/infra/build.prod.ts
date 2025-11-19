import { Template, defaultBuildLogger } from "e2b";
import { template } from "./template";
import "dotenv/config";

async function main() {
  await Template.build(template, {
    alias: "devfleet",
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);
