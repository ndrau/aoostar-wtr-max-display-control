import { appendLog } from "./logger";
import { DEVICE } from "./paths";
import {
  acquireSensorCollector,
  releaseSensorCollector,
} from "./sensor-collector";
import { loadAllSensorValues } from "./sensor-sources";
import { hasCornerSensors } from "./sensor-fields";
import { generateTextBannerImage } from "./text-banner";
import { runAsterctl } from "./asterctl-runner";
import type { TextBannerSettings } from "./types";

const REFRESH_MS = 3_000;

let refreshTimer: NodeJS.Timeout | null = null;
let activeSettings: TextBannerSettings | null = null;

export function isTextBannerLiveRunning(): boolean {
  return refreshTimer !== null;
}

async function refreshTextBanner(): Promise<void> {
  if (!activeSettings) {
    return;
  }

  const snapshot = await loadAllSensorValues();
  const imagePath = await generateTextBannerImage(
    activeSettings,
    snapshot,
  );
  await runAsterctl(["--device", DEVICE, "--image", imagePath]);
}

export async function startTextBannerLive(
  settings: TextBannerSettings,
): Promise<void> {
  await stopTextBannerLive();

  if (!hasCornerSensors(settings.corners)) {
    return;
  }

  activeSettings = settings;
  await acquireSensorCollector("text-banner");
  await appendLog("info", "text-banner", "Started live corner sensor updates");

  try {
    await refreshTextBanner();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await appendLog("error", "text-banner", "Initial refresh failed", message);
  }

  refreshTimer = setInterval(() => {
    refreshTextBanner().catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      void appendLog("error", "text-banner", "Refresh failed", message);
    });
  }, REFRESH_MS);
}

export async function stopTextBannerLive(): Promise<void> {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  activeSettings = null;
  await releaseSensorCollector("text-banner");
}

export function updateTextBannerLiveSettings(
  settings: TextBannerSettings,
): void {
  if (!refreshTimer) {
    return;
  }

  activeSettings = settings;
}
