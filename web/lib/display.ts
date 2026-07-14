import { access } from "fs/promises";
import { stopPanelMode, startPanelMode } from "./display-panel";
import { runAsterctl } from "./asterctl-runner";
import { appendLog } from "./logger";
import { DEVICE, TRUENAS_LOGO_PATH } from "./paths";
import { readSensorSnapshot } from "./sensors";
import { generateTextBannerImage } from "./text-banner";
import {
  startTextBannerLive,
  stopTextBannerLive,
} from "./text-banner-live";
import type { DisplayConfig, DisplayMode } from "./types";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function resolveModeArgs(
  mode: DisplayMode,
  customImagePath: string | null,
  textBannerImagePath: string | null = null,
): string[] {
  switch (mode) {
    case "truenas":
      return ["--image", TRUENAS_LOGO_PATH];
    case "sensors":
      return [];
    case "text": {
      if (!textBannerImagePath) {
        throw new Error("Text banner image missing");
      }
      return ["--image", textBannerImagePath];
    }
    case "custom": {
      if (!customImagePath) {
        throw new Error("No custom image configured");
      }
      return ["--image", customImagePath];
    }
    case "off":
      return ["--off"];
    default:
      return ["--off"];
  }
}

export async function applyDisplayMode(
  mode: DisplayMode,
  customImagePath: string | null,
  textBannerImagePath: string | null = null,
): Promise<string> {
  if (mode === "sensors") {
    await stopTextBannerLive();
    await appendLog("info", "display", "Applying display mode: sensors");
    return startPanelMode();
  }

  await stopPanelMode();
  await stopTextBannerLive();

  const args = [
    "--device",
    DEVICE,
    ...resolveModeArgs(mode, customImagePath, textBannerImagePath),
  ];

  if (mode === "custom") {
    const imagePath = customImagePath;
    if (!imagePath || !(await fileExists(imagePath))) {
      throw new Error("Custom image file not found");
    }
  }

  if (mode === "text") {
    const imagePath = textBannerImagePath;
    if (!imagePath || !(await fileExists(imagePath))) {
      throw new Error("Text banner image file not found");
    }
  }

  if (mode === "truenas" && !(await fileExists(TRUENAS_LOGO_PATH))) {
    throw new Error("TrueNAS logo asset missing in container");
  }

  await appendLog("info", "display", `Applying display mode: ${mode}`);
  return runAsterctl(args);
}

export async function applyConfig(config: DisplayConfig): Promise<string> {
  if (config.displayMode === "text") {
    await stopPanelMode();
    await stopTextBannerLive();
    await appendLog("info", "display", "Generating text banner image");

    const snapshot = await readSensorSnapshot();
    const imagePath = await generateTextBannerImage(
      config.textBanner,
      snapshot.values,
    );
    const result = await applyDisplayMode("text", null, imagePath);
    await startTextBannerLive(config.textBanner);
    return result;
  }

  return applyDisplayMode(config.displayMode, config.customImagePath);
}

export async function quickCommand(
  command: "on" | "off" | "sensors",
): Promise<string> {
  await appendLog("info", "display", `Quick action: ${command}`);

  if (command === "sensors") {
    await stopTextBannerLive();
    return startPanelMode();
  }

  await stopPanelMode();
  await stopTextBannerLive();

  if (command === "off") {
    return runAsterctl(["--device", DEVICE, "--off"]);
  }

  return runAsterctl(["--device", DEVICE, "--image", TRUENAS_LOGO_PATH]);
}
