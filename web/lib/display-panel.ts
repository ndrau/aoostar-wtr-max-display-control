import { type ChildProcess, spawn } from "child_process";
import { appendLog } from "./logger";
import {
  acquireSensorCollector,
  releaseSensorCollector,
} from "./sensor-collector";
import {
  startPanelSensorMapper,
  stopPanelSensorMapper,
  writePanelSensorFile,
} from "./sensor-panel-mapper";
import {
  ASTERCTL_PATH,
  CONFIG_DIR,
  DEVICE,
  FONT_DIR,
  SENSOR_DIR,
} from "./paths";

let panelProcess: ChildProcess | null = null;
let panelRunning = false;

function killProcess(
  process: ChildProcess | null,
  name: string,
): Promise<void> {
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
      void appendLog("info", "panel", `${name} stopped`);
      resolve();
    });

    process.kill("SIGTERM");
  });
}

export function isPanelChildRunning(): boolean {
  return panelProcess !== null && !panelProcess.killed;
}

export function isPanelModeRunning(): boolean {
  return panelRunning || isPanelChildRunning();
}

export async function stopPanelMode(): Promise<void> {
  stopPanelSensorMapper();

  if (!panelRunning && !panelProcess) {
    return;
  }

  await appendLog("info", "panel", "Stopping sensor dashboard processes");
  await killProcess(panelProcess, "asterctl panel");
  panelProcess = null;
  panelRunning = false;
  await releaseSensorCollector("panel");
}

export async function startPanelMode(): Promise<string> {
  if (panelRunning) {
    await stopPanelMode();
  }

  await acquireSensorCollector("panel");
  startPanelSensorMapper();
  await writePanelSensorFile();

  const args = [
    "--device",
    DEVICE,
    "--config",
    "monitor.json",
    "--config-dir",
    CONFIG_DIR,
    "--font-dir",
    FONT_DIR,
    "--sensor-path",
    SENSOR_DIR,
  ];

  await appendLog(
    "info",
    "panel",
    "Starting AOOSTAR sensor dashboard",
    `${ASTERCTL_PATH} ${args.join(" ")}`,
  );

  panelProcess = spawn(ASTERCTL_PATH, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  panelProcess.stderr?.on("data", (chunk: Buffer) => {
    const message = chunk.toString().trim();
    if (message) {
      void appendLog("debug", "asterctl-panel", message);
    }
  });

  panelProcess.on("exit", (code, signal) => {
    if (panelRunning) {
      void appendLog(
        "error",
        "asterctl-panel",
        "Sensor dashboard exited unexpectedly",
        `code=${code ?? "null"}, signal=${signal ?? "null"}`,
      );
      panelRunning = false;
      stopPanelSensorMapper();
    }
    panelProcess = null;
  });

  panelRunning = true;
  return "Sensor dashboard started";
}
