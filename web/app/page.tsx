"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DisplayConfig, DisplayMode } from "@/lib/types";

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
}> = [
  {
    value: "truenas",
    title: "TrueNAS SCALE Logo",
    description: "Default splash screen on startup.",
  },
  {
    value: "original",
    title: "Original",
    description: "Show the last AOOSTAR firmware image.",
  },
  {
    value: "custom",
    title: "Custom image",
    description: "Use an uploaded PNG/JPG (960×376 recommended).",
  },
  {
    value: "off",
    title: "Display off",
    description: "Turn the embedded LCD off.",
  },
];

function formatTime(value: string) {
  return new Date(value).toLocaleString();
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
      const response = await fetch("/api/logs?limit=200");
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
    await fetch("/api/logs", { method: "DELETE" });
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
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [status, setStatus] = useState<string>("Loading settings…");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logRefreshToken, setLogRefreshToken] = useState(0);

  function bumpLogs() {
    setLogRefreshToken((value) => value + 1);
  }

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((data: DisplayConfig) => {
        setConfig(data);
        setStatus("Settings loaded.");
        setError(false);
      })
      .catch(() => {
        setStatus("Failed to load settings.");
        setError(true);
      });
  }, []);

  async function saveConfig(next?: DisplayConfig) {
    if (!config) return;

    const payload = next ?? config;
    setSaving(true);
    setStatus("Applying display settings…");
    setError(false);

    try {
      const response = await fetch("/api/config", {
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

  async function quickAction(action: "on" | "off" | "original") {
    setStatus(`Running ${action}…`);
    setError(false);

    try {
      const response = await fetch("/api/display", {
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
      const response = await fetch("/api/upload", {
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
          Configure the embedded case display: TrueNAS logo, original AOOSTAR
          screen, custom image, timer, or off.
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
                onClick={() => quickAction("original")}
              >
                Original on
              </button>
              <button
                className="btn btn-danger"
                onClick={() => quickAction("off")}
              >
                Display off
              </button>
            </div>
          </div>

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

      <LogsPanel
        refreshToken={logRefreshToken}
        onClear={() => setStatus("Logs cleared.")}
      />
    </main>
  );
}
