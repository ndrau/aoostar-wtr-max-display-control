import type { TextBannerCorners } from "./sensor-fields";
import { DEFAULT_TEXT_BANNER_CORNERS } from "./sensor-fields";

export type DisplayMode = "logo" | "sensors" | "text" | "custom" | "off";

export type LogoBrand = "rau-media" | "truenas";
export type LogoLayout = "quer" | "stacked" | "camera";
export type LogoBadge = "r" | "rm" | "none";

export interface DisplaySchedule {
  enabled: boolean;
  displayOnTime: string;
  displayOffTime: string;
}

export interface LogoSettings {
  brand: LogoBrand;
  layout: LogoLayout;
  badge: LogoBadge;
  backgroundColor: string;
  /** Share of the display the logo may fill, in percent. */
  scale: number;
}

export type TextBannerFont = "serif" | "sans";

export interface TextBannerSettings {
  text: string;
  font: TextBannerFont;
  textColor: string;
  backgroundColor: string;
  fontSizeAuto: boolean;
  fontSize: number;
}

/** Clock and live sensor values drawn on top of the logo or text scene. */
export interface OverlaySettings {
  showClock: boolean;
  showCornerSensors: boolean;
  corners: TextBannerCorners;
}

export interface DisplayConfig {
  displayMode: DisplayMode;
  customImagePath: string | null;
  logo: LogoSettings;
  textBanner: TextBannerSettings;
  overlay: OverlaySettings;
  schedule: DisplaySchedule;
}

export const LOGO_SCALE_MIN = 40;
export const LOGO_SCALE_MAX = 100;

export const DEFAULT_LOGO: LogoSettings = {
  brand: "rau-media",
  layout: "quer",
  badge: "r",
  backgroundColor: "#090b0a",
  scale: 80,
};

export const DEFAULT_TEXT_BANNER: TextBannerSettings = {
  text: "Rau Media",
  font: "serif",
  textColor: "#ede8df",
  backgroundColor: "#090b0a",
  fontSizeAuto: true,
  fontSize: 64,
};

export const DEFAULT_OVERLAY: OverlaySettings = {
  showClock: false,
  showCornerSensors: false,
  corners: DEFAULT_TEXT_BANNER_CORNERS,
};

export const DEFAULT_CONFIG: DisplayConfig = {
  displayMode: "logo",
  customImagePath: null,
  logo: DEFAULT_LOGO,
  textBanner: DEFAULT_TEXT_BANNER,
  overlay: DEFAULT_OVERLAY,
  schedule: {
    enabled: false,
    displayOnTime: "08:00",
    displayOffTime: "22:00",
  },
};
