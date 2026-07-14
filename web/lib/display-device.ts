import { execFile } from "child_process";
import { promisify } from "util";
import { appendLog } from "./logger";
import { ASTERCTL_PATH, DEVICE } from "./paths";
import { stopPanelModeUnsafe, isPanelChildRunning } from "./display-panel";

const execFileAsync = promisify(execFile);

const RELEASE_DELAY_MS = 500;
const BUSY_RETRIES = 5;
const BUSY_RETRY_DELAY_MS = 700;

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

async function listAsterctlProcessLines(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-af", "asterctl"], {
      timeout: 5_000,
    });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function parseProcessPid(line: string): number | null {
  const pid = Number.parseInt(line.trim().split(/\s+/)[0] ?? "", 10);
  return Number.isNaN(pid) || pid === process.pid ? null : pid;
}

function isManagedAsterctlProcess(line: string): boolean {
  return (
    line.includes(ASTERCTL_PATH) ||
    line.includes("asterctl") ||
    line.includes(DEVICE)
  );
}

export async function killAllAsterctlProcesses(): Promise<void> {
  const lines = await listAsterctlProcessLines();
  const pids = lines
    .filter(isManagedAsterctlProcess)
    .map(parseProcessPid)
    .filter((pid): pid is number => pid !== null);

  if (pids.length === 0) {
    try {
      await execFileAsync("pkill", ["-TERM", "-f", ASTERCTL_PATH], {
        timeout: 5_000,
      });
    } catch {
      // No matching processes.
    }
  } else {
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
        await appendLog(
          "info",
          "display",
          "Stopped asterctl process",
          String(pid),
        );
      } catch {
        // Process may already have exited.
      }
    }
  }

  await sleep(300);

  const remaining = (await listAsterctlProcessLines()).filter(
    isManagedAsterctlProcess,
  );

  if (remaining.length > 0) {
    try {
      await execFileAsync("pkill", ["-KILL", "-f", ASTERCTL_PATH], {
        timeout: 5_000,
      });
      await appendLog(
        "warn",
        "display",
        "Force-killed remaining asterctl processes",
        String(remaining.length),
      );
    } catch {
      // No matching processes.
    }
  }
}

export async function releaseDisplayDeviceUnsafe(): Promise<void> {
  await stopPanelModeUnsafe();
  await killAllAsterctlProcesses();
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
    await releaseDisplayDeviceUnsafe();

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
  return listAsterctlProcessLines();
}
