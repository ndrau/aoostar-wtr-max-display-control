"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { formatTime } from "@/lib/format";

export function SensorsPanel({ refreshToken }: { refreshToken: number }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [panelRunning, setPanelRunning] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSensors = useCallback(async () => {
    try {
      const response = await apiFetch("/api/sensors");
      const data = await response.json();
      if (data.ok) {
        setValues(data.values ?? {});
        setPanelRunning(Boolean(data.panelRunning));
        setUpdatedAt(data.updatedAt ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSensors();
    const interval = window.setInterval(fetchSensors, 4000);
    return () => window.clearInterval(interval);
  }, [fetchSensors, refreshToken]);

  const highlights = [
    ["cpu_usage_percent", "CPU"],
    ["temperature_cpu", "CPU Temp"],
    ["mem_usage_percent", "RAM"],
    ["fan_primary_rpm", "Lüfter 1"],
    ["storage_ssd_0_used", "SSD 1"],
    ["storage_hdd_0_used", "HDD 1"],
  ] as const;

  function resolveValue(key: string): string {
    return (
      values[key] ??
      (key === "cpu_usage_percent" ? values.cpu_percent : undefined) ??
      (key === "storage_ssd_0_used"
        ? values["storage_ssd[0]['used']"]
        : undefined) ??
      (key === "storage_hdd_0_used"
        ? values["storage_hdd[0]['used']"]
        : undefined) ??
      "—"
    );
  }

  return (
    <div className="stack">
      <div className="inline-status">
        <span className={`pill ${panelRunning ? "pill-accent" : "pill-muted"}`}>
          {panelRunning ? "Dashboard läuft" : "Dashboard gestoppt"}
        </span>
        {updatedAt ? (
          <span className="hint">Aktualisiert {formatTime(updatedAt)}</span>
        ) : null}
      </div>

      {loading ? <p className="hint">Sensoren werden geladen…</p> : null}

      {!loading && Object.keys(values).length === 0 ? (
        <p className="hint">
          Noch keine Sensordaten. Wähle „System-Dashboard“ und klicke auf
          Übernehmen.
        </p>
      ) : null}

      {Object.keys(values).length > 0 ? (
        <div className="sensor-grid">
          {highlights.map(([key, label]) => (
            <div className="sensor-tile" key={key}>
              <span className="sensor-label">{label}</span>
              <strong>{resolveValue(key)}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
