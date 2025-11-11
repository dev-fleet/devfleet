import { Sandbox as E2BSandbox } from "@e2b/code-interpreter";

// This is a wrapper around E2B. If needed we can support other providers in the future.
// eg Daytona, Vercel, Cloudflare, etc.

const DEFAULT_TIMEOUT_MS = 3600000; // 1 hour

// Type definitions
export type SandboxConfig = {
  apiKey: string;
  templateId: string;
};

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CommandOptions = {
  background?: boolean;
  cwd?: string;
  timeout?: number;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
};

export interface AgentSandbox {
  readonly id: string;
  runCommand(command: string, options?: CommandOptions): Promise<CommandResult>;
  kill(): Promise<void>;
  pause(): Promise<void>;
  getHost(port: number): Promise<string>;
}

export async function createAgentSandbox(
  config: SandboxConfig,
  options?: {
    envs?: Record<string, string>;
    timeoutMs?: number;
  }
): Promise<AgentSandbox> {
  const sandbox = await E2BSandbox.create(config.templateId, {
    envs: options?.envs,
    apiKey: config.apiKey,
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  return {
    id: sandbox.sandboxId,

    async runCommand(
      command: string,
      options?: CommandOptions
    ): Promise<CommandResult> {
      const { background, onStdout, onStderr, ...e2bOptions } = options || {};

      if (background) {
        // Start command in background
        await sandbox.commands.run(command, {
          ...e2bOptions,
          background: true,
          onStdout: (data) => console.log("stdout", data),
          onStderr: (data) => console.error("stderr", data),
        });

        return {
          exitCode: 0,
          stdout: "Background command started successfully",
          stderr: "",
        };
      }

      // Run command synchronously
      return await sandbox.commands.run(command, e2bOptions);
    },

    async kill(): Promise<void> {
      await sandbox.kill();
    },

    async pause(): Promise<void> {
      await sandbox.betaPause();
    },

    async getHost(port: number): Promise<string> {
      return await sandbox.getHost(port);
    },
  };
}
