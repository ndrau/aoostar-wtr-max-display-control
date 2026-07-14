import { type ChildProcess, spawn } from "child_process";
import { mkdir } from "fs/promises";
import { appendLog } from "./logger";
import { ASTER_SYSINFO_PATH, SENSOR_DIR } from "./paths";

let sysinfoProcess: ChildProcess | null = null;
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

export function isSensorCollectorRunning(): boolean {
  return sysinfoProcess !== null;
}

export async function acquireSensorCollector(consumer: string): Promise<void> {
  consumers.add(consumer);

  if (sysinfoProcess) {
    return;
  }

  await mkdir(SENSOR_DIR, { recursive: true });
  await appendLog("info", "sensors", "Starting sensor data collector", consumer);

  sysinfoProcess = spawn(
    ASTER_SYSINFO_PATH,
    [
      "--out",
      `${SENSOR_DIR}/sysinfo.txt`,
      "--temp-dir",
      SENSOR_DIR,
      "--refresh",
      "3",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  sysinfoProcess.stderr?.on("data", (chunk: Buffer) => {
    const message = chunk.toString().trim();
    if (message) {
      void appendLog("warn", "aster-sysinfo", message);
    }
  });

  sysinfoProcess.on("exit", (code, signal) => {
    if (consumers.size > 0) {
      void appendLog(
        "error",
        "aster-sysinfo",
        "Sensor collector exited unexpectedly",
        `code=${code ?? "null"}, signal=${signal ?? "null"}`,
      );
    }
    sysinfoProcess = null;
  });

  await new Promise((resolve) => setTimeout(resolve, 1_500));
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
