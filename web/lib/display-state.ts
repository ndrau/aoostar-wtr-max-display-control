import type { DisplayMode } from "./types";

export interface DisplayState {
  /** What is on the LCD right now, or null before the first apply. */
  mode: DisplayMode | null;
  appliedAt: string | null;
}

// Kept on globalThis: instrumentation and route handlers may load separate
// module copies, but must agree on what the display shows.
const holder = globalThis as typeof globalThis & { __displayState?: DisplayState };

export function setDisplayMode(mode: DisplayMode): void {
  holder.__displayState = { mode, appliedAt: new Date().toISOString() };
}

export function getDisplayState(): DisplayState {
  return holder.__displayState ?? { mode: null, appliedAt: null };
}
