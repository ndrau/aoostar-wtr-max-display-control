import { access } from "fs/promises";
import { enqueueDisplayTask } from "./display-queue";
import { setDisplayMode } from "./display-state";
import { startPanelModeDirect } from "./display-panel";
import { runAsterctlDirect } from "./asterctl-runner";
import { appendLog } from "./logger";
import { DEVICE, SCENE_PATH } from "./paths";
import { generateSceneImage, isSceneMode } from "./scene";
import { shouldShowCornerSensors } from "./sensor-fields";
import { loadAllSensorValues } from "./sensor-sources";
import { startSceneLive, stopSceneLive } from "./scene-live";
import type { DisplayConfig } from "./types";

export async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function applyConfigInner(config: DisplayConfig): Promise<string> {
  await stopSceneLive();
  const mode = config.displayMode;
  await appendLog("info", "display", `Applying display mode: ${mode}`);

  if (mode === "sensors") {
    const output = await startPanelModeDirect();
    setDisplayMode(mode);
    return output;
  }

  if (mode === "off") {
    const output = await runAsterctlDirect(["--device", DEVICE, "--off"]);
    setDisplayMode(mode);
    return output;
  }

  if (mode === "custom") {
    const imagePath = config.customImagePath;
    if (!imagePath || !(await fileExists(imagePath))) {
      throw new Error("Custom image file not found");
    }

    const output = await runAsterctlDirect(["--device", DEVICE, "--image", imagePath]);
    setDisplayMode(mode);
    return output;
  }

  if (isSceneMode(mode)) {
    const snapshot = shouldShowCornerSensors(config.overlay)
      ? await loadAllSensorValues()
      : {};
    const imagePath = await generateSceneImage(config, snapshot);
    await runAsterctlDirect(["--device", DEVICE, "--image", imagePath]);
    await startSceneLive(config);
    setDisplayMode(mode);
    return "Scene applied";
  }

  throw new Error(`Unsupported display mode: ${mode}`);
}

export async function applyConfig(config: DisplayConfig): Promise<string> {
  return enqueueDisplayTask(() => applyConfigInner(config));
}

/** True when the cached scene on disk can be reused instead of re-rendering. */
export async function hasCachedScene(): Promise<boolean> {
  return fileExists(SCENE_PATH);
}

export async function quickCommand(
  command: "off" | "sensors",
): Promise<string> {
  await appendLog("info", "display", `Quick action: ${command}`);

  return enqueueDisplayTask(async () => {
    await stopSceneLive();

    if (command === "sensors") {
      const output = await startPanelModeDirect();
      setDisplayMode("sensors");
      return output;
    }

    const output = await runAsterctlDirect(["--device", DEVICE, "--off"]);
    setDisplayMode("off");
    return output;
  });
}
