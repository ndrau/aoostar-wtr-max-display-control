"use client";

import type { ReactNode } from "react";
import { MODE_META } from "@/lib/mode-meta";
import type { DisplayMode } from "@/lib/types";

const ICONS: Record<DisplayMode, ReactNode> = {
  logo: (
    <>
      <rect x="3" y="8" width="12" height="10" rx="2.5" />
      <path d="M15 11.5 21 9v8l-6-2.5" />
      <path d="M6 8V5h6v3" />
    </>
  ),
  text: (
    <>
      <path d="M4 19 10 5l6 14" />
      <path d="M6.2 14h7.6" />
      <path d="M18 9h3M19.5 9v10" />
    </>
  ),
  sensors: (
    <>
      <path d="M5 20V12M12 20V5M19 20v-5" />
    </>
  ),
  custom: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 18 5.5-5 4 3.5 3-2.5 3.5 3" />
    </>
  ),
  off: (
    <>
      <path d="M12 3v8" />
      <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
    </>
  ),
};

export function ModePicker({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div className="mode-grid" role="radiogroup" aria-label="Anzeigemodus">
      {MODE_META.map((mode) => {
        const selected = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`mode-card ${selected ? "is-selected" : ""}`}
            onClick={() => onChange(mode.value)}
          >
            <svg
              className="mode-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {ICONS[mode.value]}
            </svg>
            <strong>{mode.title}</strong>
            <span>{mode.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
