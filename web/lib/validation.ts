import path from "path";
import type {
  DisplayConfig,
  DisplayMode,
  LogoBadge,
  LogoBrand,
  LogoLayout,
  LogoSettings,
  OverlaySettings,
  TextBannerFont,
  TextBannerSettings,
} from "./types";
import {
  DEFAULT_CONFIG,
  DEFAULT_LOGO,
  DEFAULT_OVERLAY,
  DEFAULT_TEXT_BANNER,
  LOGO_SCALE_MAX,
  LOGO_SCALE_MIN,
} from "./types";
import {
  TEXT_BANNER_FONT_DEFAULT,
  TEXT_BANNER_FONT_MAX,
  TEXT_BANNER_FONT_MIN,
} from "./text-banner-font";
import {
  isSensorFieldId,
  type BannerCorner,
  type TextBannerCorners,
} from "./sensor-fields";
import { UPLOAD_DIR } from "./paths";

const DISPLAY_MODES: DisplayMode[] = ["logo", "sensors", "text", "custom", "off"];
const LOGO_BRANDS: LogoBrand[] = ["rau-media", "truenas"];
const LOGO_LAYOUTS: LogoLayout[] = ["quer", "stacked", "camera"];
const LOGO_BADGES: LogoBadge[] = ["r", "rm", "none"];
const TEXT_FONTS: TextBannerFont[] = ["serif", "sans"];
const CORNERS: BannerCorner[] = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_TEXT_LENGTH = 80;

type Loose = Record<string, unknown> | null | undefined;

export function isDisplayMode(value: unknown): value is DisplayMode {
  return typeof value === "string" && DISPLAY_MODES.includes(value as DisplayMode);
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function color(value: unknown, fallback: string): string {
  return isValidHexColor(value) ? value.toLowerCase() : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeCorners(input: Loose): TextBannerCorners {
  const result = { ...DEFAULT_OVERLAY.corners };

  for (const corner of CORNERS) {
    const value = input?.[corner];
    if (isSensorFieldId(value)) {
      result[corner] = value;
    }
  }

  return result;
}

function normalizeLogo(input: Loose): LogoSettings {
  return {
    brand: pick(input?.brand, LOGO_BRANDS, DEFAULT_LOGO.brand),
    layout: pick(input?.layout, LOGO_LAYOUTS, DEFAULT_LOGO.layout),
    badge: pick(input?.badge, LOGO_BADGES, DEFAULT_LOGO.badge),
    backgroundColor: color(input?.backgroundColor, DEFAULT_LOGO.backgroundColor),
    scale: clampNumber(
      input?.scale,
      LOGO_SCALE_MIN,
      LOGO_SCALE_MAX,
      DEFAULT_LOGO.scale,
    ),
  };
}

function normalizeTextBanner(input: Loose): TextBannerSettings {
  return {
    text:
      typeof input?.text === "string"
        ? input.text.slice(0, MAX_TEXT_LENGTH)
        : DEFAULT_TEXT_BANNER.text,
    font: pick(input?.font, TEXT_FONTS, DEFAULT_TEXT_BANNER.font),
    textColor: color(input?.textColor, DEFAULT_TEXT_BANNER.textColor),
    backgroundColor: color(
      input?.backgroundColor,
      DEFAULT_TEXT_BANNER.backgroundColor,
    ),
    fontSizeAuto: bool(input?.fontSizeAuto, DEFAULT_TEXT_BANNER.fontSizeAuto),
    fontSize: clampNumber(
      input?.fontSize,
      TEXT_BANNER_FONT_MIN,
      TEXT_BANNER_FONT_MAX,
      TEXT_BANNER_FONT_DEFAULT,
    ),
  };
}

function normalizeOverlay(input: Loose): OverlaySettings {
  return {
    showClock: bool(input?.showClock, DEFAULT_OVERLAY.showClock),
    showCornerSensors: bool(
      input?.showCornerSensors,
      DEFAULT_OVERLAY.showCornerSensors,
    ),
    corners: normalizeCorners(input?.corners as Loose),
  };
}

/** Configs written before logo scenes existed keep working. */
function migrateLegacy(raw: Record<string, unknown>): Record<string, unknown> {
  const legacyMode = raw.displayMode;
  const displayMode =
    legacyMode === "original"
      ? "sensors"
      : legacyMode === "truenas"
        ? "logo"
        : legacyMode;

  const legacyBanner = raw.textBanner as Loose;
  const overlay =
    raw.overlay ??
    (legacyBanner
      ? {
          showClock: legacyBanner.showClock,
          showCornerSensors: legacyBanner.showCornerSensors,
          corners: legacyBanner.corners,
        }
      : undefined);

  return { ...raw, displayMode, overlay };
}

/** Lenient: unknown or invalid values fall back to defaults, never throws. */
export function normalizeConfig(input: unknown): DisplayConfig {
  const raw = migrateLegacy(
    input && typeof input === "object" ? (input as Record<string, unknown>) : {},
  );
  const schedule = raw.schedule as Loose;

  return {
    displayMode: pick(raw.displayMode, DISPLAY_MODES, DEFAULT_CONFIG.displayMode),
    customImagePath:
      typeof raw.customImagePath === "string" ? raw.customImagePath : null,
    logo: normalizeLogo(raw.logo as Loose),
    textBanner: normalizeTextBanner(raw.textBanner as Loose),
    overlay: normalizeOverlay(raw.overlay as Loose),
    schedule: {
      enabled: bool(schedule?.enabled, DEFAULT_CONFIG.schedule.enabled),
      displayOnTime: isValidTime(schedule?.displayOnTime)
        ? schedule.displayOnTime
        : DEFAULT_CONFIG.schedule.displayOnTime,
      displayOffTime: isValidTime(schedule?.displayOffTime)
        ? schedule.displayOffTime
        : DEFAULT_CONFIG.schedule.displayOffTime,
    },
  };
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

/** Strict: rejects input the user should correct before it reaches the display. */
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

  for (const [label, value] of [
    ["Logo background", input.logo?.backgroundColor],
    ["Text color", input.textBanner?.textColor],
    ["Text background", input.textBanner?.backgroundColor],
  ] as const) {
    if (value !== undefined && !isValidHexColor(value)) {
      throw new Error(`${label} must be a hex color like #090b0a`);
    }
  }

  const config = normalizeConfig(input);

  if (config.displayMode === "text" && !config.textBanner.text.trim()) {
    throw new Error("Text banner requires at least one character");
  }

  config.customImagePath = sanitizeCustomImagePath(config.customImagePath);
  if (config.displayMode === "custom" && !config.customImagePath) {
    throw new Error("Custom display mode requires an uploaded image");
  }

  return config;
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
