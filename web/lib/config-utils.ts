import type { DisplayConfig } from "./types";

export function configsEqual(a: DisplayConfig, b: DisplayConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
