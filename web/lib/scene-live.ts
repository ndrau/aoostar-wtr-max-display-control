import { appendLog } from "./logger";
import { DEVICE } from "./paths";
import {
  acquireSensorCollector,
  releaseSensorCollector,
} from "./sensor-collector";
import { loadAllSensorValues } from "./sensor-sources";
import { shouldShowCornerSensors } from "./sensor-fields";
import { generateSceneImage, sceneNeedsLive } from "./scene";
import { runAsterctlDirect } from "./asterctl-runner";
import type { DisplayConfig } from "./types";

const LIVE_REFRESH_MS = 3_000;
const STOP_WAIT_MS = 5_000;
const STOP_POLL_MS = 25;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shared across module copies (instrumentation vs. route handlers), otherwise
// a route could not stop the loop that instrumentation started.
interface LiveState {
  refreshTimer: NodeJS.Timeout | null;
  activeConfig: DisplayConfig | null;
  sensorCollectorActive: boolean;
  refreshInFlight: boolean;
  liveGeneration: number;
}

const holder = globalThis as typeof globalThis & { __sceneLive?: LiveState };
const state: LiveState = (holder.__sceneLive ??= {
  refreshTimer: null,
  activeConfig: null,
  sensorCollectorActive: false,
  refreshInFlight: false,
  liveGeneration: 0,
});

export function isSceneLiveRunning(): boolean {
  return state.refreshTimer !== null;
}

async function refreshScene(): Promise<void> {
  if (!state.activeConfig || state.refreshInFlight) {
    return;
  }

  const generation = state.liveGeneration;
  const config = state.activeConfig;
  state.refreshInFlight = true;

  try {
    const snapshot = shouldShowCornerSensors(config.overlay)
      ? await loadAllSensorValues()
      : {};

    if (generation !== state.liveGeneration) {
      return;
    }

    const imagePath = await generateSceneImage(config, snapshot);

    if (generation !== state.liveGeneration) {
      return;
    }

    await runAsterctlDirect(["--device", DEVICE, "--image", imagePath]);
  } finally {
    state.refreshInFlight = false;
  }
}

export async function startSceneLive(config: DisplayConfig): Promise<void> {
  await stopSceneLive();

  if (!sceneNeedsLive(config)) {
    return;
  }

  state.activeConfig = config;

  if (shouldShowCornerSensors(config.overlay)) {
    await acquireSensorCollector("scene-live");
    state.sensorCollectorActive = true;
  }

  await appendLog(
    "info",
    "scene-live",
    "Started live scene updates",
    config.overlay.showClock ? "clock" : "corners",
  );

  try {
    await refreshScene();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await appendLog("error", "scene-live", "Initial refresh failed", message);
  }

  state.refreshTimer = setInterval(() => {
    refreshScene().catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      void appendLog("error", "scene-live", "Refresh failed", message);
    });
  }, LIVE_REFRESH_MS);
}

export async function stopSceneLive(): Promise<void> {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }

  state.liveGeneration += 1;
  state.activeConfig = null;

  const started = Date.now();
  while (state.refreshInFlight && Date.now() - started < STOP_WAIT_MS) {
    await sleep(STOP_POLL_MS);
  }

  if (state.sensorCollectorActive) {
    await releaseSensorCollector("scene-live");
    state.sensorCollectorActive = false;
  }
}
