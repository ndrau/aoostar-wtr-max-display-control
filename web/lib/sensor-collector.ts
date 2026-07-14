import { type ChildProcess, spawn } from "child_process";
import { mkdir } from "fs/promises";
import { appendLog } from "./logger";
import { ASTER_SYSINFO_PATH, SENSOR_DIR } from "./paths";

let sysinfoProcess: ChildProcess | null = null;
let startingCollector = false;
const consumers = new Set<string>();

function killProcess(process: ChildProcess | null): Promise<void> {
  if (!process || process.killed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (!process.killed) {
        process.kill("SIGKILL");
      }
      resolve();
    }, 5_000);

    process.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    process.kill("SIGTERM");
  });
}

async function startSensorCollectorProcess(): Promise<void> {
  if (sysinfoProcess || startingCollector || consumers.size === 0) {
    return;
  }

  startingCollector = true;

  try {
    await mkdir(SENSOR_DIR, { recursive: true });
    await appendLog("info", "sensors", "Starting sensor data collector");

    const smartctlEnabled = process.env.SMARTCTL_ENABLED !== "false";
    const args = [
      "--out",
      `${SENSOR_DIR}/sysinfo.txt`,
      "--temp-dir",
      SENSOR_DIR,
      "--refresh",
      "3",
      "--disk-refresh",
      "60",
    ];

    if (smartctlEnabled) {
      args.push("--smartctl");
    }

    const processHandle = spawn(ASTER_SYSINFO_PATH, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    sysinfoProcess = processHandle;

    processHandle.stderr?.on("data", (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (message) {
        void appendLog("warn", "aster-sysinfo", message);
      }
    });

    processHandle.on("exit", (code, signal) => {
      if (sysinfoProcess === processHandle) {
        sysinfoProcess = null;
      }

      if (consumers.size > 0) {
        void appendLog(
          "error",
          "aster-sysinfo",
          "Sensor collector exited unexpectedly, restarting",
          `code=${code ?? "null"}, signal=${signal ?? "null"}`,
        );
        void startSensorCollectorProcess().catch((error) => {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          void appendLog(
            "error",
            "aster-sysinfo",
            "Failed to restart sensor collector",
            message,
          );
        });
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 1_500));
  } finally {
    startingCollector = false;
  }
}

export function isSensorCollectorRunning(): boolean {
  return sysinfoProcess !== null;
}

export async function acquireSensorCollector(consumer: string): Promise<void> {
  consumers.add(consumer);
  await appendLog("info", "sensors", "Sensor collector requested", consumer);
  await startSensorCollectorProcess();
}

export async function releaseSensorCollector(consumer: string): Promise<void> {
  consumers.delete(consumer);

  if (consumers.size > 0 || !sysinfoProcess) {
    return;
  }

  await appendLog("info", "sensors", "Stopping sensor data collector");
  await killProcess(sysinfoProcess);
  sysinfoProcess = null;
}
