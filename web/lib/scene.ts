import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { DISPLAY_HEIGHT, DISPLAY_WIDTH } from "./display-dimensions";
import { logoAssetPath, resolveLogoTone, type LogoTone } from "./logo-catalog";
import { buildOverlaySvg, overlayHasContent } from "./overlay";
import { LOGO_DIR, SCENE_PATH, UPLOAD_DIR } from "./paths";
import { needsOverlayLiveRefresh } from "./sensor-fields";
import { buildTextBannerSvg } from "./text-banner";
import type { DisplayConfig, DisplayMode } from "./types";

const LIGHT_FOREGROUND = "#ede8df";
const DARK_FOREGROUND = "#090b0a";
/** Vertical room kept free so the logo never touches clock or corner values. */
const OVERLAY_VERTICAL_MARGIN = 56;

type SceneMode = Extract<DisplayMode, "logo" | "text">;

export function isSceneMode(mode: DisplayMode): mode is SceneMode {
  return mode === "logo" || mode === "text";
}

/** Scenes with a clock or sensor values must be redrawn periodically. */
export function sceneNeedsLive(config: DisplayConfig): boolean {
  return isSceneMode(config.displayMode) && needsOverlayLiveRefresh(config.overlay);
}

interface Base {
  png: Buffer;
  foreground: string;
}

let cachedBase: { key: string; base: Base } | null = null;

async function renderLogoBase(config: DisplayConfig): Promise<Base> {
  const { logo } = config;
  const file = path.join(LOGO_DIR, logoAssetPath(logo));

  if (logo.brand === "truenas") {
    const png = await sharp(file)
      .resize(DISPLAY_WIDTH, DISPLAY_HEIGHT, { fit: "cover" })
      .png()
      .toBuffer();
    return { png, foreground: LIGHT_FOREGROUND };
  }

  const tone: LogoTone = resolveLogoTone(logo.backgroundColor);
  const maxHeight = overlayHasContent(config.overlay)
    ? DISPLAY_HEIGHT - OVERLAY_VERTICAL_MARGIN * 2
    : DISPLAY_HEIGHT;
  const boxWidth = Math.round((DISPLAY_WIDTH * logo.scale) / 100);
  const boxHeight = Math.min(
    Math.round((DISPLAY_HEIGHT * logo.scale) / 100),
    maxHeight,
  );

  const { data, info } = await sharp(file)
    .resize({ width: boxWidth, height: boxHeight, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });

  const png = await sharp({
    create: {
      width: DISPLAY_WIDTH,
      height: DISPLAY_HEIGHT,
      channels: 3,
      background: logo.backgroundColor,
    },
  })
    .composite([
      {
        input: data,
        left: Math.round((DISPLAY_WIDTH - info.width) / 2),
        top: Math.round((DISPLAY_HEIGHT - info.height) / 2),
      },
    ])
    .png()
    .toBuffer();

  return {
    png,
    foreground: tone === "light" ? LIGHT_FOREGROUND : DARK_FOREGROUND,
  };
}

async function renderTextBase(config: DisplayConfig): Promise<Base> {
  const png = await sharp(Buffer.from(buildTextBannerSvg(config.textBanner)))
    .png()
    .toBuffer();
  return { png, foreground: config.textBanner.textColor };
}

async function renderBase(config: DisplayConfig): Promise<Base> {
  // The overlay only changes the logo box, so it is part of the cache key.
  const key = JSON.stringify([
    config.displayMode,
    config.logo,
    config.textBanner,
    overlayHasContent(config.overlay),
  ]);

  if (cachedBase?.key === key) {
    return cachedBase.base;
  }

  const base =
    config.displayMode === "logo"
      ? await renderLogoBase(config)
      : await renderTextBase(config);
  cachedBase = { key, base };
  return base;
}

/** Renders the 960x376 picture that is sent to the display (and shown in the preview). */
export async function renderScene(
  config: DisplayConfig,
  sensorValues: Record<string, string> = {},
  now: Date = new Date(),
): Promise<Buffer> {
  if (!isSceneMode(config.displayMode)) {
    throw new Error(`Mode ${config.displayMode} has no rendered scene`);
  }

  const base = await renderBase(config);

  if (!overlayHasContent(config.overlay)) {
    return base.png;
  }

  const overlay = buildOverlaySvg(
    config.overlay,
    base.foreground,
    sensorValues,
    now,
  );

  return sharp(base.png)
    .composite([{ input: Buffer.from(overlay) }])
    .png()
    .toBuffer();
}

/** Writes the scene atomically so the boot script never reads a partial file. */
export async function generateSceneImage(
  config: DisplayConfig,
  sensorValues: Record<string, string> = {},
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const png = await renderScene(config, sensorValues);
  const temporary = `${SCENE_PATH}.tmp`;
  await writeFile(temporary, png);
  await rename(temporary, SCENE_PATH);

  return SCENE_PATH;
}

export async function renderCustomImage(imagePath: string): Promise<Buffer> {
  const source = await readFile(imagePath);
  return sharp(source)
    .resize(DISPLAY_WIDTH, DISPLAY_HEIGHT, {
      fit: "contain",
      background: "#000000",
    })
    .png()
    .toBuffer();
}
