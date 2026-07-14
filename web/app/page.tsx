"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiFetch,
  getStoredApiToken,
  storeApiToken,
} from "@/lib/client-auth";
import type { DisplayConfig, DisplayMode, TextBannerSettings } from "@/lib/types";
import {
  BANNER_CORNER_LABELS,
  formatCornerLabel,
  SENSOR_FIELD_OPTIONS,
  type BannerCorner,
  type SensorFieldId,
} from "@/lib/sensor-fields";

interface LogEntry {
  ts: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  detail?: string;
}

const MODE_OPTIONS: Array<{
  value: DisplayMode;
  title: string;
  description: string;
  hint?: string;
}> = [
  {
    value: "truenas",
    title: "TrueNAS SCALE Logo",
    description: "Static splash screen — shown on every container start by default.",
  },
  {
    value: "sensors",
    title: "System dashboard (live)",
    description:
      "AOOSTAR-style panels with CPU, RAM, GPU, network, and disk values.",
    hint: "Requires host /proc and /sys mounts (see README). Updates every few seconds.",
  },
  {
    value: "text",
    title: "Text banner",
    description:
      "Custom text with colors plus optional live system data in each corner (960×376).",
  },
  {
    value: "custom",
    title: "Custom image",
    description: "Static PNG/JPG you upload (960×376 recommended).",
  },
  {
    value: "off",
    title: "Display off",
    description: "Turn the embedded LCD off completely.",
  },
];

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

function TextBannerEditor({
  textBanner,
  active,
  onChange,
}: {
  textBanner: TextBannerSettings;
  active: boolean;
  onChange: (next: TextBannerSettings) => void;
}) {
  const [sensorValues, setSensorValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadSensors() {
      try {
        const response = await apiFetch("/api/sensors");
        const data = await response.json();
        if (!cancelled && data.ok) {
          setSensorValues(data.values ?? {});
        }
      } catch {
        // Preview works without live sensor data.
      }
    }

    loadSensors();
    const interval = window.setInterval(loadSensors, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  function updateColor(
    key: "textColor" | "backgroundColor" | "cornerColor",
    value: string,
    fallback: string,
  ) {
    onChange({
      ...textBanner,
      [key]: normalizeHexColor(value, fallback),
    });
  }

  function updateCorner(corner: BannerCorner, value: SensorFieldId) {
    onChange({
      ...textBanner,
      corners: {
        ...textBanner.corners,
        [corner]: value,
      },
    });
  }

  const cornerPositions: Record<BannerCorner, string> = {
    topLeft: "corner-top-left",
    topRight: "corner-top-right",
    bottomLeft: "corner-bottom-left",
    bottomRight: "corner-bottom-right",
  };

  return (
    <div className={`card ${active ? "card-active" : ""}`}>
      <h2>Text banner</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Create a display image from text. Optionally place live system data in
        any corner. Select the &quot;Text banner&quot; mode above, then apply
        settings.
      </p>

      <div className="field">
        <label htmlFor="banner-text">Center text</label>
        <textarea
          id="banner-text"
          rows={3}
          maxLength={80}
          value={textBanner.text}
          onChange={(event) =>
            onChange({ ...textBanner, text: event.target.value })
          }
          placeholder="e.g. TrueNAS SCALE"
        />
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor="banner-text-color">Text color</label>
          <div className="color-input">
            <input
              id="banner-text-color"
              type="color"
              value={textBanner.textColor}
              onChange={(event) =>
                updateColor("textColor", event.target.value, textBanner.textColor)
              }
            />
            <input
              type="text"
              value={textBanner.textColor}
              onChange={(event) =>
                updateColor("textColor", event.target.value, textBanner.textColor)
              }
              spellCheck={false}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="banner-bg-color">Background color</label>
          <div className="color-input">
            <input
              id="banner-bg-color"
              type="color"
              value={textBanner.backgroundColor}
              onChange={(event) =>
                updateColor(
                  "backgroundColor",
                  event.target.value,
                  textBanner.backgroundColor,
                )
              }
            />
            <input
              type="text"
              value={textBanner.backgroundColor}
              onChange={(event) =>
                updateColor(
                  "backgroundColor",
                  event.target.value,
                  textBanner.backgroundColor,
                )
              }
              spellCheck={false}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="banner-corner-color">Corner data color</label>
          <div className="color-input">
            <input
              id="banner-corner-color"
              type="color"
              value={textBanner.cornerColor}
              onChange={(event) =>
                updateColor(
                  "cornerColor",
                  event.target.value,
                  textBanner.cornerColor,
                )
              }
            />
            <input
              type="text"
              value={textBanner.cornerColor}
              onChange={(event) =>
                updateColor(
                  "cornerColor",
                  event.target.value,
                  textBanner.cornerColor,
                )
              }
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <h3 className="section-title">Corner system data</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Choose which metric appears in each corner. Live values need host
        /proc and /sys mounts.
      </p>
      <div className="corner-grid">
        {(Object.keys(BANNER_CORNER_LABELS) as BannerCorner[]).map((corner) => (
          <div className="field" key={corner}>
            <label htmlFor={`corner-${corner}`}>{BANNER_CORNER_LABELS[corner]}</label>
            <select
              id={`corner-${corner}`}
              value={textBanner.corners[corner]}
              onChange={(event) =>
                updateCorner(corner, event.target.value as SensorFieldId)
              }
            >
              {SENSOR_FIELD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div
        className="text-banner-preview"
        style={{
          backgroundColor: textBanner.backgroundColor,
          color: textBanner.textColor,
        }}
      >
        {(Object.keys(cornerPositions) as BannerCorner[]).map((corner) => {
          const label = formatCornerLabel(textBanner.corners[corner], sensorValues);
          if (!label) {
            return null;
          }

          return (
            <span
              key={corner}
              className={`text-banner-corner ${cornerPositions[corner]}`}
              style={{ color: textBanner.cornerColor }}
            >
              {label}
            </span>
          );
        })}
        <span className="text-banner-center">
          {textBanner.text.trim() || "Preview"}
        </span>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Preview approximates the 960×376 case display. Corner values refresh
        every few seconds when sensors are available.
      </p>
    </div>
  );
}

function SensorsPanel({ refreshToken }: { refreshToken: number }) {
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
    ["cpu_usage_percent", "CPU usage"],
    ["temperature_cpu", "CPU temp"],
    ["mem_usage_percent", "RAM usage"],
    ["temperature_memory", "RAM temp"],
    ["temperature_gpu", "GPU temp"],
  ] as const;

  return (
    <section className="card">
      <div className="logs-header">
        <h2>Live sensor data</h2>
        <span className={`badge ${panelRunning ? "badge-on" : "badge-off"}`}>
          {panelRunning ? "Dashboard running" : "Dashboard stopped"}
        </span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Values written to the case display when &quot;System dashboard&quot; is
        active. Network and disk fields may need a custom sensor mapping on
        TrueNAS.
      </p>

      {loading ? <p className="muted">Loading sensor snapshot…</p> : null}

      {!loading && Object.keys(values).length === 0 ? (
        <p className="muted">
          No sensor file yet. Apply &quot;System dashboard (live)&quot; and wait
          a few seconds.
        </p>
      ) : null}

      {Object.keys(values).length > 0 ? (
        <>
          <div className="sensor-grid">
            {highlights.map(([key, label]) => (
              <div className="sensor-tile" key={key}>
                <span className="sensor-label">{label}</span>
                <strong>{values[key] ?? "—"}</strong>
              </div>
            ))}
          </div>
          {updatedAt ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Last update: {formatTime(updatedAt)}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function LogsPanel({
  refreshToken,
  onClear,
}: {
  refreshToken: number;
  onClear: () => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLPreElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await apiFetch("/api/logs?limit=200");
      const data = await response.json();
      if (data.ok) {
        setLogs(data.logs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = window.setInterval(fetchLogs, 3000);
    return () => window.clearInterval(interval);
  }, [fetchLogs, refreshToken]);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [logs]);

  async function clearLogs() {
    await apiFetch("/api/logs", { method: "DELETE" });
    setLogs([]);
    onClear();
  }

  return (
    <section className="card logs-card">
      <div className="logs-header">
        <h2>Activity log</h2>
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => fetchLogs()}>
            Refresh
          </button>
          <button className="btn btn-danger" onClick={clearLogs}>
            Clear
          </button>
        </div>
      </div>

      <pre className="logs-panel" ref={panelRef}>
        {loading && logs.length === 0 ? (
          <div className="log-line">Loading logs…</div>
        ) : null}
        {!loading && logs.length === 0 ? (
          <div className="log-line">No log entries yet.</div>
        ) : null}
        {logs.map((entry, index) => (
          <div className="log-line" key={`${entry.ts}-${index}`}>
            <span className="log-time">{formatTime(entry.ts)}</span>{" "}
            <span className={`log-level-${entry.level}`}>
              [{entry.level.toUpperCase()}]
            </span>{" "}
            <span className="log-source">[{entry.source}]</span> {entry.message}
            {entry.detail ? (
              <>
                {" "}
                <span className="log-detail">— {entry.detail}</span>
              </>
            ) : null}
          </div>
        ))}
      </pre>
    </section>
  );
}

export default function Dashboard() {
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState(getStoredApiToken());
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [status, setStatus] = useState<string>("Loading settings…");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logRefreshToken, setLogRefreshToken] = useState(0);

  function bumpLogs() {
    setLogRefreshToken((value) => value + 1);
  }

  const loadConfig = useCallback(async () => {
    const response = await apiFetch("/api/config");

    if (response.status === 401) {
      setAuthRequired(true);
      setStatus("API token required.");
      setError(true);
      return false;
    }

    const data = await response.json();
    setConfig(data);
    setStatus("Settings loaded.");
    setError(false);
    return true;
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: { authRequired: boolean }) => {
        setAuthRequired(data.authRequired);
        if (!data.authRequired || getStoredApiToken()) {
          void loadConfig();
        } else {
          setStatus("Enter your API token to continue.");
        }
      })
      .catch(() => {
        setStatus("Failed to load app status.");
        setError(true);
      });
  }, [loadConfig]);

  async function submitToken() {
    storeApiToken(tokenInput);
    const ok = await loadConfig();
    if (ok) {
      setAuthRequired(false);
    }
  }

  async function saveConfig(next?: DisplayConfig) {
    if (!config) return;

    const payload = next ?? config;
    setSaving(true);
    setStatus("Applying display settings…");
    setError(false);

    try {
      const response = await apiFetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setConfig(data.config);
      setStatus("Display updated successfully.");
      bumpLogs();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unknown error";
      setStatus(message);
      setError(true);
      bumpLogs();
    } finally {
      setSaving(false);
    }
  }

  async function quickAction(action: "on" | "off" | "sensors") {
    setStatus(`Running ${action}…`);
    setError(false);

    try {
      const response = await apiFetch("/api/display", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Command failed");
      }

      setStatus(`Quick action "${action}" applied.`);
      bumpLogs();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Unknown error";
      setStatus(message);
      setError(true);
      bumpLogs();
    }
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setStatus("Uploading custom image…");
    setError(false);

    try {
      const response = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setConfig(data.config);
      setStatus("Custom image uploaded and applied.");
      bumpLogs();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Unknown error";
      setStatus(message);
      setError(true);
      bumpLogs();
    } finally {
      setUploading(false);
    }
  }

  if (authRequired && !config) {
    return (
      <main className="page">
        <header className="hero">
          <div className="eyebrow">AOOSTAR WTR Max</div>
          <h1>Display Control</h1>
          <p>Enter the API token configured in your container environment.</p>
        </header>
        <section className="card">
          <div className="field">
            <label htmlFor="api-token">API token</label>
            <input
              id="api-token"
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
            />
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={submitToken}>
              Continue
            </button>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Set `API_TOKEN` in Portainer. The token is stored only in this
            browser session.
          </p>
        </section>
        <div className={`status ${error ? "error" : ""}`} style={{ marginTop: 18 }}>
          {status}
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="page">
        <div className={`status ${error ? "error" : ""}`}>{status}</div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="hero">
        <div className="eyebrow">AOOSTAR WTR Max</div>
        <h1>Display Control</h1>
        <p>
          Control the embedded case display: TrueNAS logo, live system
          dashboard, text banner, custom image, timer, or off.
        </p>
      </header>

      <div className={`status ${error ? "error" : ""}`}>{status}</div>

      <div className="grid" style={{ marginTop: 18 }}>
        <section className="card">
          <h2>Display mode</h2>
          <div className="stack">
            {MODE_OPTIONS.map((option) => (
              <label className="option" key={option.value}>
                <input
                  type="radio"
                  name="displayMode"
                  checked={config.displayMode === option.value}
                  onChange={() =>
                    setConfig({ ...config, displayMode: option.value })
                  }
                />
                <div>
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                  {option.hint ? <span className="option-hint">{option.hint}</span> : null}
                </div>
              </label>
            ))}
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={() => saveConfig()}
            >
              {saving ? "Applying…" : "Apply settings"}
            </button>
          </div>
        </section>

        <section className="stack">
          <div className="card">
            <h2>Quick actions</h2>
            <div className="actions">
              <button
                className="btn btn-secondary"
                onClick={() => quickAction("on")}
              >
                Show TrueNAS logo
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => quickAction("sensors")}
              >
                Start system dashboard
              </button>
              <button
                className="btn btn-danger"
                onClick={() => quickAction("off")}
              >
                Display off
              </button>
            </div>
          </div>

          <TextBannerEditor
            active={config.displayMode === "text"}
            textBanner={config.textBanner}
            onChange={(textBanner) => setConfig({ ...config, textBanner })}
          />

          <div className="card">
            <h2>Custom upload</h2>
            <div className="field">
              <label htmlFor="logo-upload">Image file</label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              Best size: 960×376. Other sizes are scaled automatically.
            </p>
          </div>

          <div className="card">
            <h2>Timer</h2>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.schedule.enabled}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    schedule: {
                      ...config.schedule,
                      enabled: event.target.checked,
                    },
                  })
                }
              />
              <span>Enable daily on/off schedule</span>
            </label>

            <div className="row" style={{ marginTop: 14 }}>
              <div className="field">
                <label htmlFor="on-time">Display on</label>
                <input
                  id="on-time"
                  type="time"
                  value={config.schedule.displayOnTime}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      schedule: {
                        ...config.schedule,
                        displayOnTime: event.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="off-time">Display off</label>
                <input
                  id="off-time"
                  type="time"
                  value={config.schedule.displayOffTime}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      schedule: {
                        ...config.schedule,
                        displayOffTime: event.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <p className="muted" style={{ marginTop: 10 }}>
              During the off window the LCD is switched off. Inside the on
              window your selected display mode is restored.
            </p>
          </div>
        </section>
      </div>

      <SensorsPanel refreshToken={logRefreshToken} />

      <LogsPanel
        refreshToken={logRefreshToken}
        onClear={() => setStatus("Logs cleared.")}
      />
    </main>
  );
}
