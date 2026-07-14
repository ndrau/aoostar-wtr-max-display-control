import type { DisplayMode } from "./types";

export interface ModeMeta {
  value: DisplayMode;
  title: string;
  subtitle: string;
  icon: string;
  recommended?: boolean;
}

export const MODE_META: ModeMeta[] = [
  {
    value: "truenas",
    title: "TrueNAS Logo",
    subtitle: "Standard — startet automatisch mit dem Container.",
    icon: "◆",
    recommended: true,
  },
  {
    value: "sensors",
    title: "System-Dashboard",
    subtitle: "Offizielles Live-Panel mit CPU, RAM, Netzwerk & Disks.",
    icon: "▣",
  },
  {
    value: "text",
    title: "Text-Banner",
    subtitle: "Eigener Schriftzug mit optionalen Live-Daten in den Ecken.",
    icon: "Aa",
  },
  {
    value: "custom",
    title: "Eigenes Bild",
    subtitle: "PNG oder JPG hochladen (960×376 empfohlen).",
    icon: "▤",
  },
  {
    value: "off",
    title: "Display aus",
    subtitle: "LCD komplett abschalten.",
    icon: "○",
  },
];

export function getModeMeta(mode: DisplayMode): ModeMeta {
  return MODE_META.find((entry) => entry.value === mode) ?? MODE_META[0];
}
