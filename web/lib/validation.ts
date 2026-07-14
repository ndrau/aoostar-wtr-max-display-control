import path from "path";
import type { DisplayConfig, DisplayMode } from "./types";
import { UPLOAD_DIR } from "./paths";

const DISPLAY_MODES: DisplayMode[] = ["truenas", "original", "custom", "off"];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export function isDisplayMode(value: unknown): value is DisplayMode {
  return typeof value === "string" && DISPLAY_MODES.includes(value as DisplayMode);
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function sanitizeCustomImagePath(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const resolved = path.resolve(value);
  const uploadRoot = path.resolve(UPLOAD_DIR);

  if (!resolved.startsWith(`${uploadRoot}${path.sep}`) && resolved !== uploadRoot) {
    throw new Error("Custom image path must stay inside the uploads directory");
  }

  return resolved;
}

export function validateConfig(input: Partial<DisplayConfig>): DisplayConfig {
  if (input.displayMode !== undefined && !isDisplayMode(input.displayMode)) {
    throw new Error("Invalid display mode");
  }

  const schedule = input.schedule;
  if (schedule) {
    if (
      schedule.displayOnTime !== undefined &&
      !isValidTime(schedule.displayOnTime)
    ) {
      throw new Error("Invalid display on time");
    }

    if (
      schedule.displayOffTime !== undefined &&
      !isValidTime(schedule.displayOffTime)
    ) {
      throw new Error("Invalid display off time");
    }
  }

  const displayMode = input.displayMode ?? "truenas";
  let customImagePath: string | null = null;

  if (displayMode === "custom") {
    customImagePath = sanitizeCustomImagePath(input.customImagePath ?? null);
    if (!customImagePath) {
      throw new Error("Custom display mode requires an uploaded image");
    }
  }

  return {
    displayMode,
    customImagePath,
    schedule: {
      enabled: schedule?.enabled ?? false,
      displayOnTime: schedule?.displayOnTime ?? "08:00",
      displayOffTime: schedule?.displayOffTime ?? "22:00",
    },
  };
}

export function validateUpload(file: File): void {
  if (file.size <= 0) {
    throw new Error("Uploaded file is empty");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Uploaded file exceeds the 10 MB limit");
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Only PNG, JPG, JPEG, and WEBP uploads are allowed");
  }
}

export function getUploadExtension(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported file extension");
  }

  return extension;
}
