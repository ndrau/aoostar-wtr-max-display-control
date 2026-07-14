import { execFile } from "child_process";
import { promisify } from "util";
import { appendLog } from "./logger";
import { ASTERCTL_PATH, DEVICE } from "./paths";
import { stopPanelMode, isPanelChildRunning } from "./display-panel";

const execFileAsync = promisify(execFile);

const RELEASE_DELAY_MS = 400;
const BUSY_RETRIES = 4;
const BUSY_RETRY_DELAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDeviceBusyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("device or resource busy") ||
    lower.includes("resource busy") ||
    lower.includes("error opening serial port")
  );
}

async function killStrayAsterctlProcesses(): Promise<void> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-af", "asterctl"], {
      timeout: 5_000,
    });
    const lines = stdout.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      if (!line.includes(DEVICE)) {
        continue;
      }

      const pid = Number.parseInt(line.trim().split(/\s+/)[0] ?? "", 10);
      if (Number.isNaN(pid) || pid === process.pid) {
        continue;
      }

      try {
        process.kill(pid, "SIGTERM");
        await appendLog(
          "info",
          "display",
          "Stopped stray asterctl process",
          String(pid),
        );
      } catch {
        // Process may already have exited.
      }
    }
  } catch {
    // pgrep returns exit code 1 when no processes are found.
  }
}

export async function ensureDisplayDeviceReleased(): Promise<void> {
  await stopPanelMode();
  await killStrayAsterctlProcesses();
  await sleep(RELEASE_DELAY_MS);
}

export function isDisplayPanelActive(): boolean {
  return isPanelChildRunning();
}

export async function runAsterctlWithDeviceLock(
  args: string[],
  runner: (commandArgs: string[]) => Promise<string>,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < BUSY_RETRIES; attempt += 1) {
    await ensureDisplayDeviceReleased();

    try {
      return await runner(args);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (!isDeviceBusyError(message) || attempt === BUSY_RETRIES - 1) {
        throw error;
      }

      await appendLog(
        "warn",
        "display",
        "Serial device busy, retrying",
        `attempt ${attempt + 2}/${BUSY_RETRIES}`,
      );
      await sleep(BUSY_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to run asterctl");
}

export async function listAsterctlProcesses(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-af", ASTERCTL_PATH], {
      timeout: 5_000,
    });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
