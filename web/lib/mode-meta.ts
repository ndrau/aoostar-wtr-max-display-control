import type { DisplayMode } from "./types";

export interface ModeMeta {
  value: DisplayMode;
  title: string;
  subtitle: string;
}

export const MODE_META: ModeMeta[] = [
  {
    value: "logo",
    title: "Logo",
    subtitle: "Rau Media oder TrueNAS, wahlweise mit Uhr und Live-Daten.",
  },
  {
    value: "text",
    title: "Schriftzug",
    subtitle: "Eigener Text in beliebigen Farben.",
  },
  {
    value: "sensors",
    title: "System-Dashboard",
    subtitle: "Live-Panel mit CPU, RAM, Netzwerk und Disks.",
  },
  {
    value: "custom",
    title: "Eigenes Bild",
    subtitle: "PNG, JPG oder WEBP hochladen.",
  },
  {
    value: "off",
    title: "Aus",
    subtitle: "Display dauerhaft abschalten.",
  },
];

export function getModeMeta(mode: DisplayMode): ModeMeta {
  return MODE_META.find((entry) => entry.value === mode) ?? MODE_META[0];
}
