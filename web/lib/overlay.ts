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
  BANNER_CORNERS,
  formatCornerLabel,
  shouldShowCornerSensors,
  type BannerCorner,
} from "./sensor-fields";
import { FONT_FAMILY, escapeXml } from "./text-banner";
import type { OverlaySettings } from "./types";

const OVERLAY_OPACITY = 0.7;

const TOP_Y = BANNER_CORNER_PADDING_Y;
const BOTTOM_Y = DISPLAY_HEIGHT - BANNER_CORNER_PADDING_Y;
const LEFT_X = BANNER_CORNER_PADDING_X;
const RIGHT_X = DISPLAY_WIDTH - BANNER_CORNER_PADDING_X;
// Inner slots sit between the outer edge and the centre (where the clock is).
const INNER_LEFT_X = Math.round(DISPLAY_WIDTH * 0.3);
const INNER_RIGHT_X = Math.round(DISPLAY_WIDTH * 0.7);
const CENTER_X = DISPLAY_WIDTH / 2;

const CORNER_LAYOUT: Record<
  BannerCorner,
  { x: number; y: number; anchor: "start" | "middle" | "end" }
> = {
  topLeft: { x: LEFT_X, y: TOP_Y, anchor: "start" },
  topLeftInner: { x: INNER_LEFT_X, y: TOP_Y, anchor: "middle" },
  topCenter: { x: CENTER_X, y: TOP_Y, anchor: "middle" },
  topRightInner: { x: INNER_RIGHT_X, y: TOP_Y, anchor: "middle" },
  topRight: { x: RIGHT_X, y: TOP_Y, anchor: "end" },
  bottomLeft: { x: LEFT_X, y: BOTTOM_Y, anchor: "start" },
  bottomLeftInner: { x: INNER_LEFT_X, y: BOTTOM_Y, anchor: "middle" },
  bottomCenter: { x: CENTER_X, y: BOTTOM_Y, anchor: "middle" },
  bottomRightInner: { x: INNER_RIGHT_X, y: BOTTOM_Y, anchor: "middle" },
  bottomRight: { x: RIGHT_X, y: BOTTOM_Y, anchor: "end" },
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
    for (const corner of BANNER_CORNERS) {
      // The clock owns the top centre.
      if (corner === "topCenter" && overlay.showClock) continue;

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
