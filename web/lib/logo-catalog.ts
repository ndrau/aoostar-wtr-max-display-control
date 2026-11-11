import type {
  LogoBadge,
  LogoBrand,
  LogoLayout,
  LogoSettings,
} from "./types";

export type LogoTone = "light" | "dark";

export const LOGO_BRANDS: Array<{
  id: LogoBrand;
  label: string;
  hint: string;
}> = [
  { id: "rau-media", label: "Rau Media", hint: "Modernes Logo" },
  { id: "truenas", label: "TrueNAS", hint: "Original-Bild" },
];

export const LOGO_LAYOUTS: Array<{
  id: LogoLayout;
  label: string;
  hint: string;
}> = [
  { id: "quer", label: "Quer", hint: "Kamera + Schriftzug" },
  { id: "stacked", label: "Gestapelt", hint: "mit rau.media" },
  { id: "camera", label: "Kamera", hint: "nur Symbol" },
];

export const LOGO_BADGES: Array<{ id: LogoBadge; label: string }> = [
  { id: "r", label: "R" },
  { id: "rm", label: "RM" },
  { id: "none", label: "Leer" },
];

export const BACKGROUND_PRESETS = [
  { name: "Nacht", value: "#090b0a" },
  { name: "Schwarz", value: "#000000" },
  { name: "Grün", value: "#0a5530" },
  { name: "Bone", value: "#ede8df" },
  { name: "Weiß", value: "#ffffff" },
] as const;

export const TRUENAS_LOGO_FILE = "truenas-scale.png";

/** Light logos for dark backgrounds, dark logos for light ones. */
export function resolveLogoTone(backgroundColor: string): LogoTone {
  const hex = backgroundColor.replace("#", "");
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);

  return luminance > 0.35 ? "dark" : "light";
}

/** Path below the logo directory, shared by the server renderer and the UI. */
export function logoAssetPath(logo: LogoSettings): string {
  if (logo.brand === "truenas") {
    return TRUENAS_LOGO_FILE;
  }

  const tone = resolveLogoTone(logo.backgroundColor);
  return `rau-media/${logo.layout}-${tone}-${logo.badge}.png`;
}

export function logoPublicUrl(logo: LogoSettings): string {
  return `/logos/${logoAssetPath(logo)}`;
}
