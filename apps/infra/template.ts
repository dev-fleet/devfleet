import { Template } from "e2b";

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const template: any = Template()
  .fromImage("e2bdev/code-interpreter:latest")
  .setUser("root")
  .setWorkdir("/")
  .runCmd("npm install -g @anthropic-ai/sandbox-runtime@latest")
  .runCmd("npm install -g @anthropic-ai/claude-code@2.0.45")
  .setUser("user")
  .setWorkdir("/home/user")
  .setStartCmd("sudo /bin/bash", "sleep 20");
