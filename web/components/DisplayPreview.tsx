"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { DISPLAY_HEIGHT, DISPLAY_WIDTH } from "@/lib/display-dimensions";
import { getModeMeta } from "@/lib/mode-meta";
import { needsOverlayLiveRefresh } from "@/lib/sensor-fields";
import type { DisplayConfig } from "@/lib/types";

const DEBOUNCE_MS = 250;
const LIVE_REFRESH_MS = 3_000;

type Rendered = "logo" | "text" | "custom";

function isRendered(mode: DisplayConfig["displayMode"]): mode is Rendered {
  return mode === "logo" || mode === "text" || mode === "custom";
}

/** Draft preview rendered by the server, so it matches the LCD pixel for pixel. */
function useRenderedPreview(config: DisplayConfig, version: number) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const mode = config.displayMode;
  const live =
    (mode === "logo" || mode === "text") &&
    needsOverlayLiveRefresh(config.overlay);
  const body = isRendered(mode)
    ? JSON.stringify({
        displayMode: mode,
        customImagePath: config.customImagePath,
        logo: config.logo,
        textBanner: config.textBanner,
        overlay: config.overlay,
      })
    : null;

  useEffect(() => {
    if (!body) return;

    let cancelled = false;
    let controller: AbortController | null = null;
    let currentUrl: string | null = null;

    async function load() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await apiFetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("preview failed");

        const next = URL.createObjectURL(await response.blob());
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }

        const previous = currentUrl;
        currentUrl = next;
        setUrl(next);
        setFailed(false);
        if (previous) URL.revokeObjectURL(previous);
      } catch {
        if (!cancelled && !controller?.signal.aborted) setFailed(true);
      }
    }

    const timeout = window.setTimeout(load, DEBOUNCE_MS);
    const interval = live ? window.setInterval(load, LIVE_REFRESH_MS) : null;

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, [body, live, version]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
    // Only the last URL needs cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { url, failed };
}

export function DisplayPreview({
  config,
  dirty,
  panelRunning,
  version,
}: {
  config: DisplayConfig;
  dirty: boolean;
  panelRunning: boolean;
  /** Bumped after uploads so a replaced image is fetched again. */
  version: number;
}) {
  const mode = getModeMeta(config.displayMode);
  const { url, failed } = useRenderedPreview(config, version);
  const rendered = isRendered(config.displayMode);

  return (
    <div className="preview-shell">
      <div className="preview-meta">
        <span className="preview-label">
          {DISPLAY_WIDTH}×{DISPLAY_HEIGHT} · {mode.title}
        </span>
        <span className={`pill ${dirty ? "pill-warn" : "pill-accent"}`}>
          {dirty ? "Entwurf" : "Auf dem Display"}
        </span>
      </div>

      <div className="display-bezel">
        <div
          className={`display-frame ${
            config.displayMode === "off" ? "is-off" : ""
          }`}
        >
          {rendered && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Vorschau des Displays" draggable={false} />
          ) : null}

          {rendered && !url ? (
            <span className="display-frame-note">
              {failed ? "Vorschau nicht verfügbar" : "Vorschau wird erstellt…"}
            </span>
          ) : null}

          {config.displayMode === "sensors" ? (
            <div className="display-frame-note">
              <strong>System-Dashboard</strong>
              <span>
                {panelRunning
                  ? "Läuft live auf dem Display"
                  : "Startet nach dem Übernehmen"}
              </span>
            </div>
          ) : null}

          {config.displayMode === "off" ? (
            <span className="display-frame-note">Display aus</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
