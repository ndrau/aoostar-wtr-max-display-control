import { applyConfig } from "./display";
import { readConfig } from "./config";
import type { DisplayConfig } from "./types";

function parseTimeToMinutes(value: string): number {
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
    lastAppliedState = null;
    return;
  }

  const shouldDisplay = isWithinDisplayWindow(config);
  const nextState = shouldDisplay ? "on-window" : "off-window";

  if (lastAppliedState === nextState) {
    return;
  }

  if (shouldDisplay) {
    await applyConfig({
      ...config,
      displayMode:
        config.displayMode === "off" ? "truenas" : config.displayMode,
    });
  } else {
    await applyConfig({ ...config, displayMode: "off" });
  }

  lastAppliedState = nextState;
}

export function startScheduler(): void {
  const tick = () => {
    runScheduledCheck().catch((error) => {
      console.error("[scheduler]", error);
    });
  };

  tick();
  setInterval(tick, 60_000);
}
