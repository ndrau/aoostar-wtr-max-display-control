"use client";

import {
  TEXT_BANNER_FONT_MAX,
  TEXT_BANNER_FONT_MIN,
} from "@/lib/text-banner-font";
import type { TextBannerSettings } from "@/lib/types";
import { ColorField } from "./ColorField";
import { Segmented } from "./Segmented";
import { Switch } from "./Switch";

const COLOR_PRESETS = [
  { name: "Nacht", textColor: "#ede8df", backgroundColor: "#090b0a" },
  { name: "Bone", textColor: "#090b0a", backgroundColor: "#ede8df" },
  { name: "Grün", textColor: "#ede8df", backgroundColor: "#0a5530" },
  { name: "Signal", textColor: "#32d583", backgroundColor: "#090b0a" },
] as const;

export function TextBannerEditor({
  textBanner,
  onChange,
}: {
  textBanner: TextBannerSettings;
  onChange: (next: TextBannerSettings) => void;
}) {
  const update = (patch: Partial<TextBannerSettings>) =>
    onChange({ ...textBanner, ...patch });

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="banner-text">Schriftzug</label>
        <textarea
          id="banner-text"
          rows={2}
          maxLength={80}
          value={textBanner.text}
          placeholder="z. B. Rau Media"
          onChange={(event) => update({ text: event.target.value })}
        />
        <span className="field-hint">{textBanner.text.length}/80 Zeichen</span>
      </div>

      <div className="field">
        <span className="field-label">Schrift</span>
        <Segmented
          label="Schrift"
          value={textBanner.font}
          options={[
            { id: "serif", label: "Serif (Rau Media)" },
            { id: "sans", label: "Sans" },
          ]}
          onChange={(font) => update({ font })}
        />
      </div>

      <div className="field">
        <span className="field-label">Farben</span>
        <div className="preset-row">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="preset-chip"
              onClick={() =>
                update({
                  textColor: preset.textColor,
                  backgroundColor: preset.backgroundColor,
                })
              }
            >
              <span
                className="preset-swatch"
                style={{
                  background: preset.backgroundColor,
                  color: preset.textColor,
                }}
              >
                A
              </span>
              {preset.name}
            </button>
          ))}
        </div>
        <div className="color-grid color-grid-2">
          <ColorField
            id="banner-text-color"
            label="Textfarbe"
            value={textBanner.textColor}
            onChange={(textColor) => update({ textColor })}
          />
          <ColorField
            id="banner-bg-color"
            label="Hintergrund"
            value={textBanner.backgroundColor}
            onChange={(backgroundColor) => update({ backgroundColor })}
          />
        </div>
      </div>

      <Switch
        checked={textBanner.fontSizeAuto}
        onChange={(fontSizeAuto) => update({ fontSizeAuto })}
        title="Schriftgröße automatisch"
        description="Passt die Größe an die Textlänge an."
      />

      {!textBanner.fontSizeAuto ? (
        <div className="field">
          <label htmlFor="banner-font-size">
            Schriftgröße{" "}
            <span className="field-value">{textBanner.fontSize} px</span>
          </label>
          <input
            id="banner-font-size"
            type="range"
            min={TEXT_BANNER_FONT_MIN}
            max={TEXT_BANNER_FONT_MAX}
            step={1}
            value={textBanner.fontSize}
            onChange={(event) =>
              update({ fontSize: Number.parseInt(event.target.value, 10) })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
