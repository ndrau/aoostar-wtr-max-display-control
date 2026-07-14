import { applyConfig } from "./display";
import { appendLog } from "./logger";
import { readConfig } from "./config";
import type { DisplayConfig } from "./types";
import { isValidTime } from "./validation";

function parseTimeToMinutes(value: string): number | null {
  if (!isValidTime(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getCurrentMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function isWithinDisplayWindow(config: DisplayConfig, now = new Date()): boolean {
  const current = getCurrentMinutes(now);
  const onAt = parseTimeToMinutes(config.schedule.displayOnTime);
  const offAt = parseTimeToMinutes(config.schedule.displayOffTime);

  if (onAt === null || offAt === null) {
    return true;
  }

  if (onAt === offAt) {
    return true;
  }

  if (onAt < offAt) {
    return current >= onAt && current < offAt;
  }

  return current >= onAt || current < offAt;
}

let lastAppliedState: "on-window" | "off-window" | null = null;

export async function runScheduledCheck(): Promise<void> {
  const config = await readConfig();

  if (!config.schedule.enabled) {
    if (lastAppliedState === "off-window") {
      await appendLog(
        "info",
        "scheduler",
        "Timer disabled, restoring configured display mode",
        config.displayMode,
      );
      await applyConfig(config);
    }
    lastAppliedState = null;
    return;
  }

  const shouldDisplay = isWithinDisplayWindow(config);
  const nextState = shouldDisplay ? "on-window" : "off-window";

  if (lastAppliedState === nextState) {
    return;
  }

  if (shouldDisplay) {
    await appendLog(
      "info",
      "scheduler",
      "Timer window active, turning display on",
      `on ${config.schedule.displayOnTime}, off ${config.schedule.displayOffTime}`,
    );
    await applyConfig({
      ...config,
      displayMode:
        config.displayMode === "off" ? "truenas" : config.displayMode,
    });
  } else {
    await appendLog(
      "info",
      "scheduler",
      "Timer window inactive, turning display off",
      `on ${config.schedule.displayOnTime}, off ${config.schedule.displayOffTime}`,
    );
    await applyConfig({ ...config, displayMode: "off" });
  }

  lastAppliedState = nextState;
}

export function startScheduler(): void {
  void appendLog("info", "scheduler", "Scheduler started");

  const tick = () => {
    runScheduledCheck().catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      void appendLog("error", "scheduler", "Scheduler tick failed", message);
    });
  };

  tick();
  setInterval(tick, 60_000);
}
