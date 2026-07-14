import { execFile } from "child_process";
import { access } from "fs/promises";
import { promisify } from "util";
import { appendLog } from "./logger";
import { ASTERCTL_PATH, DEVICE, TRUENAS_LOGO_PATH } from "./paths";
import type { DisplayConfig, DisplayMode } from "./types";

const execFileAsync = promisify(execFile);

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function runAsterctl(args: string[]): Promise<string> {
  const command = `${ASTERCTL_PATH} ${args.join(" ")}`;
  await appendLog("info", "asterctl", "Running command", command);

  try {
    const { stdout, stderr } = await execFileAsync(ASTERCTL_PATH, args, {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });

    const output = stderr?.trim() || stdout?.trim() || "Command completed";

    await appendLog("info", "asterctl", "Command finished", output);
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await appendLog("error", "asterctl", "Command failed", message);
    throw error;
  }
}

export function resolveModeArgs(
  mode: DisplayMode,
  customImagePath: string | null,
): string[] {
  switch (mode) {
    case "truenas":
      return ["--image", TRUENAS_LOGO_PATH];
    case "original":
      return ["--on"];
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
): Promise<string> {
  const args = ["--device", DEVICE, ...resolveModeArgs(mode, customImagePath)];

  if (mode === "custom") {
    const imagePath = customImagePath;
    if (!imagePath || !(await fileExists(imagePath))) {
      throw new Error("Custom image file not found");
    }
  }

  if (mode === "truenas" && !(await fileExists(TRUENAS_LOGO_PATH))) {
    throw new Error("TrueNAS logo asset missing in container");
  }

  await appendLog("info", "display", `Applying display mode: ${mode}`);
  return runAsterctl(args);
}

export async function applyConfig(config: DisplayConfig): Promise<string> {
  return applyDisplayMode(config.displayMode, config.customImagePath);
}

export async function quickCommand(
  command: "on" | "off" | "original",
): Promise<string> {
  await appendLog("info", "display", `Quick action: ${command}`);

  if (command === "off") {
    return runAsterctl(["--device", DEVICE, "--off"]);
  }

  if (command === "original") {
    return runAsterctl(["--device", DEVICE, "--on"]);
  }

  return runAsterctl(["--device", DEVICE, "--image", TRUENAS_LOGO_PATH]);
}
