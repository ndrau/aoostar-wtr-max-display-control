import { formatBannerClock } from "./format";
import {
  BANNER_CLOCK_FONT_SIZE,
  BANNER_CLOCK_Y,
  BANNER_CORNER_FONT_SIZE,
  BANNER_CORNER_PADDING_X,
  BANNER_CORNER_PADDING_Y,
  DISPLAY_HEIGHT,
  DISPLAY_WIDTH,
} from "./display-dimensions";
import {
  formatCornerLabel,
  shouldShowCornerSensors,
  type BannerCorner,
} from "./sensor-fields";
import { FONT_FAMILY, escapeXml } from "./text-banner";
import type { OverlaySettings } from "./types";

const OVERLAY_OPACITY = 0.7;

const CORNER_LAYOUT: Record<
  BannerCorner,
  { x: number; y: number; anchor: "start" | "end" }
> = {
  topLeft: {
    x: BANNER_CORNER_PADDING_X,
    y: BANNER_CORNER_PADDING_Y,
    anchor: "start",
  },
  topRight: {
    x: DISPLAY_WIDTH - BANNER_CORNER_PADDING_X,
    y: BANNER_CORNER_PADDING_Y,
    anchor: "end",
  },
  bottomLeft: {
    x: BANNER_CORNER_PADDING_X,
    y: DISPLAY_HEIGHT - BANNER_CORNER_PADDING_Y,
    anchor: "start",
  },
  bottomRight: {
    x: DISPLAY_WIDTH - BANNER_CORNER_PADDING_X,
    y: DISPLAY_HEIGHT - BANNER_CORNER_PADDING_Y,
    anchor: "end",
  },
};

export function overlayHasContent(overlay: OverlaySettings): boolean {
  return overlay.showClock || shouldShowCornerSensors(overlay);
}

function textElement(
  content: string,
  x: number,
  y: number,
  size: number,
  anchor: string,
  fill: string,
): string {
  return `<text x="${x}" y="${y}" fill="${fill}" fill-opacity="${OVERLAY_OPACITY}" font-family="${FONT_FAMILY}" font-size="${size}" font-weight="600" text-anchor="${anchor}">${escapeXml(content)}</text>`;
}

/** Transparent layer with clock and corner values, drawn over any scene. */
export function buildOverlaySvg(
  overlay: OverlaySettings,
  fill: string,
  sensorValues: Record<string, string>,
  now: Date,
): string {
  const parts: string[] = [];

  if (overlay.showClock) {
    parts.push(
      textElement(
        formatBannerClock(now),
        DISPLAY_WIDTH / 2,
        BANNER_CLOCK_Y,
        BANNER_CLOCK_FONT_SIZE,
        "middle",
        fill,
      ),
    );
  }

  if (shouldShowCornerSensors(overlay)) {
    for (const corner of Object.keys(CORNER_LAYOUT) as BannerCorner[]) {
      const label = formatCornerLabel(overlay.corners[corner], sensorValues);
      if (!label) continue;

      const layout = CORNER_LAYOUT[corner];
      parts.push(
        textElement(
          label,
          layout.x,
          layout.y,
          BANNER_CORNER_FONT_SIZE,
          layout.anchor,
          fill,
        ),
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${DISPLAY_WIDTH}" height="${DISPLAY_HEIGHT}" viewBox="0 0 ${DISPLAY_WIDTH} ${DISPLAY_HEIGHT}">
  ${parts.join("\n  ")}
</svg>`;
}
