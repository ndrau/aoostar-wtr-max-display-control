"use client";

import { MODE_META } from "@/lib/mode-meta";
import type { DisplayMode } from "@/lib/types";

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
            <div className="mode-card-top">
              <span className="mode-icon" aria-hidden>
                {mode.icon}
              </span>
              {mode.recommended ? (
                <span className="pill pill-accent">Standard</span>
              ) : null}
            </div>
            <strong>{mode.title}</strong>
            <span>{mode.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
