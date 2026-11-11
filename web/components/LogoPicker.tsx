"use client";

import {
  BACKGROUND_PRESETS,
  LOGO_BADGES,
  LOGO_BRANDS,
  LOGO_LAYOUTS,
  logoPublicUrl,
} from "@/lib/logo-catalog";
import {
  LOGO_SCALE_MAX,
  LOGO_SCALE_MIN,
  type LogoSettings,
} from "@/lib/types";
import { ColorField } from "./ColorField";
import { Segmented } from "./Segmented";

export function LogoPicker({
  logo,
  onChange,
}: {
  logo: LogoSettings;
  onChange: (next: LogoSettings) => void;
}) {
  const update = (patch: Partial<LogoSettings>) => onChange({ ...logo, ...patch });

  return (
    <div className="stack">
      <div className="field">
        <span className="field-label">Marke</span>
        <Segmented
          label="Marke"
          value={logo.brand}
          options={LOGO_BRANDS}
          onChange={(brand) => update({ brand })}
        />
      </div>

      {logo.brand === "truenas" ? (
        <p className="hint">
          Das TrueNAS-Bild wird unverändert angezeigt. Uhr und Live-Daten
          lassen sich weiterhin darüberlegen.
        </p>
      ) : (
        <>
          <div className="field">
            <span className="field-label">Variante</span>
            <div className="logo-grid" role="radiogroup" aria-label="Variante">
              {LOGO_LAYOUTS.map((layout) => {
                const selected = logo.layout === layout.id;
                return (
                  <button
                    key={layout.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`logo-card ${selected ? "is-selected" : ""}`}
                    onClick={() => update({ layout: layout.id })}
                  >
                    <span
                      className="logo-card-stage"
                      style={{ backgroundColor: logo.backgroundColor }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoPublicUrl({ ...logo, layout: layout.id })}
                        alt=""
                        draggable={false}
                      />
                    </span>
                    <strong>{layout.label}</strong>
                    <span>{layout.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Buchstabe auf der Kamera</span>
            <Segmented
              label="Buchstabe auf der Kamera"
              value={logo.badge}
              options={LOGO_BADGES}
              onChange={(badge) => update({ badge })}
            />
          </div>

          <div className="field">
            <span className="field-label">Hintergrund</span>
            <div className="swatch-row">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`swatch ${
                    logo.backgroundColor === preset.value ? "is-selected" : ""
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                  aria-label={preset.name}
                  aria-pressed={logo.backgroundColor === preset.value}
                  onClick={() => update({ backgroundColor: preset.value })}
                />
              ))}
            </div>
            <ColorField
              id="logo-bg-color"
              label="Eigene Farbe"
              value={logo.backgroundColor}
              onChange={(backgroundColor) => update({ backgroundColor })}
            />
            <span className="field-hint">
              Hell oder dunkel passend zum Hintergrund wird automatisch
              gewählt.
            </span>
          </div>

          <div className="field">
            <label htmlFor="logo-scale">
              Größe <span className="field-value">{logo.scale} %</span>
            </label>
            <input
              id="logo-scale"
              type="range"
              min={LOGO_SCALE_MIN}
              max={LOGO_SCALE_MAX}
              step={1}
              value={logo.scale}
              onChange={(event) =>
                update({ scale: Number.parseInt(event.target.value, 10) })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
