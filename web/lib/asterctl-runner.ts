import { execFile } from "child_process";
import { promisify } from "util";
import { enqueueDisplayTask } from "./display-queue";
import { appendLog } from "./logger";
import { ASTERCTL_PATH } from "./paths";

const execFileAsync = promisify(execFile);

async function runAsterctlUnsafe(args: string[]): Promise<string> {
  const command = `${ASTERCTL_PATH} ${args.join(" ")}`;
  await appendLog("info", "asterctl", "Running command", command);

  try {
    const { stdout, stderr } = await execFileAsync(ASTERCTL_PATH, args, {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });

    const output = stderr?.trim() || stdout?.trim() || "Command completed";
    await appendLog("info", "asterctl", "Command finished", output);
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await appendLog("error", "asterctl", "Command failed", message);
    throw error;
  }
}

export async function runAsterctl(args: string[]): Promise<string> {
  return enqueueDisplayTask(() => runAsterctlUnsafe(args));
}
