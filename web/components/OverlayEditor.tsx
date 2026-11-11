"use client";

import {
  BANNER_CORNER_LABELS,
  SENSOR_FIELD_GROUPS,
  type BannerCorner,
  type SensorFieldId,
} from "@/lib/sensor-fields";
import type { OverlaySettings } from "@/lib/types";
import { Switch } from "./Switch";

export function OverlayEditor({
  overlay,
  onChange,
}: {
  overlay: OverlaySettings;
  onChange: (next: OverlaySettings) => void;
}) {
  function updateCorner(corner: BannerCorner, value: SensorFieldId) {
    onChange({ ...overlay, corners: { ...overlay.corners, [corner]: value } });
  }

  return (
    <div className="stack">
      <Switch
        checked={overlay.showClock}
        onChange={(showClock) => onChange({ ...overlay, showClock })}
        title="Uhrzeit oben"
        description="Datum und Uhrzeit mit Sekunden, alle 3 Sekunden aktualisiert."
      />
      <Switch
        checked={overlay.showCornerSensors}
        onChange={(showCornerSensors) =>
          onChange({ ...overlay, showCornerSensors })
        }
        title="Live-Werte in den Ecken"
        description="Zum Beispiel CPU-Last oder Temperaturen in jeder Ecke."
      />

      {overlay.showCornerSensors ? (
        <div className="corner-grid">
          {(Object.keys(BANNER_CORNER_LABELS) as BannerCorner[]).map((corner) => (
            <div className="field" key={corner}>
              <label htmlFor={`corner-${corner}`}>
                {BANNER_CORNER_LABELS[corner]}
              </label>
              <select
                id={`corner-${corner}`}
                value={overlay.corners[corner]}
                onChange={(event) =>
                  updateCorner(corner, event.target.value as SensorFieldId)
                }
              >
                {SENSOR_FIELD_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
          <p className="hint span-2">
            Live-Werte brauchen im Container <code>pid: host</code> und einen
            read-only Mount von <code>/sys</code>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
