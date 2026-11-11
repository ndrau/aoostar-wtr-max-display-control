import { DISPLAY_HEIGHT, DISPLAY_WIDTH } from "./display-dimensions";
import { resolveBannerFontSize } from "./text-banner-font";
import type { TextBannerSettings } from "./types";

export const FONT_FAMILY = "DejaVu Sans, Liberation Sans, sans-serif";

const BANNER_FONTS = {
  serif: { family: "Instrument Serif, Georgia, serif", weight: 400 },
  sans: { family: FONT_FAMILY, weight: 700 },
} as const;
const MAX_TEXT_LENGTH = 80;

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildTextElements(text: string, fontSize: number): string {
  const lines = text.split("\n").map((line) => line.trimEnd());
  const lineHeight = fontSize * 1.2;
  const totalHeight = lineHeight * lines.length;
  const startY = DISPLAY_HEIGHT / 2 - totalHeight / 2 + fontSize * 0.82;

  return lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<tspan x="50%" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("");
}

export function buildTextBannerSvg(settings: TextBannerSettings): string {
  const text = settings.text.trim().slice(0, MAX_TEXT_LENGTH);
  const fontSize = resolveBannerFontSize(settings);
  const font = BANNER_FONTS[settings.font];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${DISPLAY_WIDTH}" height="${DISPLAY_HEIGHT}" viewBox="0 0 ${DISPLAY_WIDTH} ${DISPLAY_HEIGHT}">
  <rect width="100%" height="100%" fill="${settings.backgroundColor}" />
  <text
    text-anchor="middle"
    fill="${settings.textColor}"
    font-family="${font.family}"
    font-size="${fontSize}"
    font-weight="${font.weight}"
  >
    ${buildTextElements(text, fontSize)}
  </text>
</svg>`;
}
