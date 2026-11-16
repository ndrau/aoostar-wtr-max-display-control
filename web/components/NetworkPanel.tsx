"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { formatBitRate, formatBytes } from "@/lib/format";
import type { NetworkInterfaceInfo } from "@/lib/network";

const POLL_MS = 2_000;
const HISTORY_POINTS = 60;

interface RatePoint {
  rx: number;
  tx: number;
}

function Sparkline({ points, peak }: { points: RatePoint[]; peak: number }) {
  const width = 300;
  const height = 64;

  function line(key: keyof RatePoint): string {
    if (points.length < 2) return "";
    const step = width / (HISTORY_POINTS - 1);
    const offset = (HISTORY_POINTS - points.length) * step;
    return points
      .map((point, index) => {
        const x = offset + index * step;
        const y = height - (point[key] / peak) * (height - 4) - 2;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg
      className="net-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={line("rx")} className="net-line-down" />
      <path d={line("tx")} className="net-line-up" />
    </svg>
  );
}

export function NetworkPanel() {
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [gateway, setGateway] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Record<string, RatePoint[]>>({});
  const historyRef = useRef<Record<string, RatePoint[]>>({});

  const fetchNetwork = useCallback(async () => {
    try {
      const response = await apiFetch("/api/network");
      const data = await response.json();
      if (!data.ok) return;

      const list: NetworkInterfaceInfo[] = data.interfaces ?? [];
      setInterfaces(list);
      setGateway(data.gateway ?? null);

      const next = { ...historyRef.current };
      for (const entry of list) {
        if (entry.rxBytesPerSec === null || entry.txBytesPerSec === null) continue;
        next[entry.name] = [
          ...(next[entry.name] ?? []),
          { rx: entry.rxBytesPerSec, tx: entry.txBytesPerSec },
        ].slice(-HISTORY_POINTS);
      }
      historyRef.current = next;
      setHistory(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNetwork();
    const interval = window.setInterval(fetchNetwork, POLL_MS);
    return () => window.clearInterval(interval);
  }, [fetchNetwork]);

  const current =
    interfaces.find((entry) => entry.name === selected) ?? interfaces[0];

  if (loading) {
    return <p className="hint">Netzwerkdaten werden geladen…</p>;
  }

  if (!current) {
    return (
      <p className="hint">
        Keine Netzwerkschnittstellen gefunden. Der Container braucht den
        read-only Mount von <code>/sys</code>.
      </p>
    );
  }

  const points = history[current.name] ?? [];
  const peak = Math.max(1, ...points.flatMap((point) => [point.rx, point.tx]));
  const linkLabel = current.speedMbps
    ? current.speedMbps >= 1000
      ? `${current.speedMbps / 1000} Gbit/s`
      : `${current.speedMbps} Mbit/s`
    : "—";

  const details: Array<[string, string]> = [
    ["IPv4", current.ipv4.join(", ") || "—"],
    ["Gateway", current.isDefault && gateway ? gateway : "—"],
    ["Link", current.duplex ? `${linkLabel} · ${current.duplex}` : linkLabel],
    ["MAC", current.mac ?? "—"],
    ["MTU", current.mtu !== null ? String(current.mtu) : "—"],
    ["Empfangen gesamt", formatBytes(current.rxBytes)],
    ["Gesendet gesamt", formatBytes(current.txBytes)],
    [
      "Fehler / verworfen",
      `${current.rxErrors + current.txErrors} / ${current.rxDropped + current.txDropped}`,
    ],
  ];

  return (
    <div className="stack">
      <div className="inline-status">
        <span className={`pill ${current.carrier ? "pill-accent" : "pill-warn"}`}>
          {current.carrier ? "Verbunden" : "Kein Link"}
        </span>
        {current.isDefault ? (
          <span className="pill pill-muted">Standardroute</span>
        ) : null}
        <span className="hint">Aktualisiert alle {POLL_MS / 1000} s</span>
      </div>

      {interfaces.length > 1 ? (
        <div className="segmented" role="radiogroup" aria-label="Schnittstelle">
          {interfaces.map((entry) => (
            <button
              key={entry.name}
              type="button"
              role="radio"
              aria-checked={entry.name === current.name}
              className={entry.name === current.name ? "is-selected" : ""}
              onClick={() => setSelected(entry.name)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="sensor-grid">
        <div className="sensor-tile">
          <span className="sensor-label">
            <span className="net-swatch net-swatch-down" /> Download
          </span>
          <strong>
            {current.rxBytesPerSec !== null
              ? formatBitRate(current.rxBytesPerSec)
              : "…"}
          </strong>
        </div>
        <div className="sensor-tile">
          <span className="sensor-label">
            <span className="net-swatch net-swatch-up" /> Upload
          </span>
          <strong>
            {current.txBytesPerSec !== null
              ? formatBitRate(current.txBytesPerSec)
              : "…"}
          </strong>
        </div>
      </div>

      <div className="net-chart">
        <Sparkline points={points} peak={peak} />
        <span className="hint">
          Letzte {(HISTORY_POINTS * POLL_MS) / 60_000} Minuten · Spitze{" "}
          {formatBitRate(peak)}
        </span>
      </div>

      <dl className="net-details">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
