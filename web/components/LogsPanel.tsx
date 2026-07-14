"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { formatTime } from "@/lib/format";

interface LogEntry {
  ts: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  detail?: string;
}

export function LogsPanel({
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
    <div className="stack">
      <div className="actions-row">
        <button className="btn btn-ghost" type="button" onClick={() => fetchLogs()}>
          Aktualisieren
        </button>
        <button className="btn btn-danger" type="button" onClick={clearLogs}>
          Leeren
        </button>
      </div>

      <pre className="logs-panel" ref={panelRef}>
        {loading && logs.length === 0 ? (
          <div className="log-line">Protokoll wird geladen…</div>
        ) : null}
        {!loading && logs.length === 0 ? (
          <div className="log-line">Noch keine Einträge.</div>
        ) : null}
        {logs.map((entry, index) => (
          <div className="log-line" key={`${entry.ts}-${index}`}>
            <span className="log-time">{formatTime(entry.ts)}</span>{" "}
            <span className={`log-level-${entry.level}`}>
              [{entry.level.toUpperCase()}]
            </span>{" "}
            <span className="log-source">[{entry.source}]</span> {entry.message}
            {entry.detail ? (
              <span className="log-detail"> — {entry.detail}</span>
            ) : null}
          </div>
        ))}
      </pre>
    </div>
  );
}
