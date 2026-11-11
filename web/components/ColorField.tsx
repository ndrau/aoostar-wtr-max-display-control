"use client";

import { useEffect, useState } from "react";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // Keep what the user types until it is a complete hex value.
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="color-input">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
        />
        <input
          type="text"
          value={draft}
          spellCheck={false}
          maxLength={7}
          aria-label={`${label} als Hex-Wert`}
          onChange={(event) => {
            const next = event.target.value.trim();
            setDraft(next);
            if (HEX_PATTERN.test(next)) onChange(next.toLowerCase());
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </div>
  );
}
