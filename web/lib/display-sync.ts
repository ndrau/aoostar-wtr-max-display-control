import { readConfig } from "./config";
import { applyConfig, hasCachedScene } from "./display";
import { setDisplayMode } from "./display-state";
import { isSceneMode, sceneNeedsLive } from "./scene";

/** Brings the LCD in line with the saved config after the web UI starts. */
export async function syncDisplayFromConfig(): Promise<void> {
  const config = await readConfig();

  if (config.schedule.enabled) {
    return;
  }

  const needsApply =
    config.displayMode === "sensors" ||
    (isSceneMode(config.displayMode) &&
      (sceneNeedsLive(config) || !(await hasCachedScene())));

  if (needsApply) {
    await applyConfig(config);
    return;
  }

  // The boot script already put the cached image on the LCD.
  setDisplayMode(config.displayMode);
}
