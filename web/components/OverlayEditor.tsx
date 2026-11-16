"use client";

import { Fragment, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import {
  BANNER_CORNERS,
  BANNER_CORNER_LABELS,
  SENSOR_FIELD_GROUPS,
  resolveSensorValue,
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
  const [values, setValues] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    apiFetch("/api/sensors")
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) setValues(data.values ?? {});
      })
      .catch(() => {
        // Without sensor data every option stays selectable.
      });
  }, []);

  function updateCorner(corner: BannerCorner, value: SensorFieldId) {
    onChange({ ...overlay, corners: { ...overlay.corners, [corner]: value } });
  }

  // Offer only fields the host reports. Until data arrives (or if the collector
  // has never run) all fields stay selectable.
  function isAvailable(fieldId: SensorFieldId): boolean {
    if (fieldId === "none" || !values || Object.keys(values).length === 0) {
      return true;
    }
    const raw = resolveSensorValue(fieldId, values);
    return raw !== undefined && raw.trim() !== "";
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
        title="Live-Werte am Rand"
        description="Bis zu fünf Werte oben und fünf unten, zum Beispiel CPU-Last, Temperaturen oder Netzwerk."
      />

      {overlay.showCornerSensors ? (
        <div className="corner-grid">
          {BANNER_CORNERS.map((corner) => (
            <Fragment key={corner}>
              {corner === "topLeft" || corner === "bottomLeft" ? (
                <p className="corner-row-title span-2">
                  {corner === "topLeft" ? "Oberer Rand" : "Unterer Rand"}
                </p>
              ) : null}
              <div className="field">
                <label htmlFor={`corner-${corner}`}>
                  {BANNER_CORNER_LABELS[corner]}
                </label>
                <select
                  id={`corner-${corner}`}
                  disabled={corner === "topCenter" && overlay.showClock}
                  value={overlay.corners[corner]}
                  onChange={(event) =>
                    updateCorner(corner, event.target.value as SensorFieldId)
                  }
                >
                  {SENSOR_FIELD_GROUPS.map((group) => {
                    // Keep the current choice visible even without data.
                    const options = group.options.filter(
                      (option) =>
                        isAvailable(option.id) ||
                        option.id === overlay.corners[corner],
                    );
                    if (options.length === 0) return null;

                    return (
                      <optgroup key={group.label} label={group.label}>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {isAvailable(option.id)
                              ? option.label
                              : `${option.label} (keine Daten)`}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </Fragment>
          ))}
          <p className="hint span-2">
            „Oben Mitte“ ist frei, wenn die Uhrzeit aus ist. Lange Werte auf
            benachbarten Plätzen können sich überlappen, die Vorschau zeigt es.
          </p>
          <p className="hint span-2">
            Live-Werte brauchen im Container <code>pid: host</code> und einen
            read-only Mount von <code>/sys</code>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
