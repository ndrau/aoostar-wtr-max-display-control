export type DisplayMode = "truenas" | "original" | "custom" | "off";

export interface DisplaySchedule {
  enabled: boolean;
  displayOnTime: string;
  displayOffTime: string;
}

export interface DisplayConfig {
  displayMode: DisplayMode;
  customImagePath: string | null;
  schedule: DisplaySchedule;
}

export const DEFAULT_CONFIG: DisplayConfig = {
  displayMode: "truenas",
  customImagePath: null,
  schedule: {
    enabled: false,
    displayOnTime: "08:00",
    displayOffTime: "22:00",
  },
};
