export type SandboxFile = { path: string; content: string };

export type SandboxRunCommand = { cmd: string; args?: string[] };

export type SandboxCreateResult =
  | { unavailable: false; sandboxId: string }
  | { unavailable: true; message: string };

export type SandboxRunResult =
  | { unavailable: false; exitCode: number; stdout: string; stderr: string }
  | { unavailable: true; message: string };

export type SandboxStopResult = { unavailable: boolean; message?: string };

export function unavailableCreate(message: string): SandboxCreateResult {
  return { unavailable: true, message };
}

export function unavailableRun(message: string): SandboxRunResult {
  return { unavailable: true, message };
}
