"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { CustomUpload } from "@/components/CustomUpload";
import { DisplayPreview } from "@/components/DisplayPreview";
import { LogoPicker } from "@/components/LogoPicker";
import { LogsPanel } from "@/components/LogsPanel";
import { ModePicker } from "@/components/ModePicker";
import { OverlayEditor } from "@/components/OverlayEditor";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { SensorsPanel } from "@/components/SensorsPanel";
import { TextBannerEditor } from "@/components/TextBannerEditor";
import {
  apiFetch,
  getStoredApiToken,
  storeApiToken,
} from "@/lib/client-auth";
import { configsEqual } from "@/lib/config-utils";
import { getModeMeta } from "@/lib/mode-meta";
import type { DisplayConfig, DisplayMode } from "@/lib/types";

interface LiveStatus {
  mode: DisplayMode | null;
  panelRunning: boolean;
}

const TOAST_MS = 4_000;

export default function Dashboard() {
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState(getStoredApiToken());
  const [savedConfig, setSavedConfig] = useState<DisplayConfig | null>(null);
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [status, setStatus] = useState("Einstellungen werden geladen…");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [live, setLive] = useState<LiveStatus>({ mode: null, panelRunning: false });
  const toastTimer = useRef<number | undefined>(undefined);

  const isDirty =
    savedConfig !== null &&
    config !== null &&
    !configsEqual(savedConfig, config);

  const notify = useCallback((message: string, isError = false) => {
    window.clearTimeout(toastTimer.current);
    setStatus(message);
    setError(isError);
    setToast(message);
    if (!isError) {
      toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    }
  }, []);

  const bumpRefresh = () => setRefreshToken((value) => value + 1);

  const loadConfig = useCallback(async () => {
    const response = await apiFetch("/api/config");

    if (response.status === 401) {
      setAuthRequired(true);
      setStatus("API-Token erforderlich.");
      setError(true);
      return false;
    }

    const data = await response.json();
    setSavedConfig(data);
    setConfig(data);
    return true;
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/api/status");
      const data = await response.json();
      if (data.mode !== undefined) {
        setLive({ mode: data.mode, panelRunning: Boolean(data.panelRunning) });
      }
    } catch {
      // The status pill simply keeps its last value.
    }
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: { authRequired: boolean }) => {
        setAuthRequired(data.authRequired);
        if (!data.authRequired || getStoredApiToken()) {
          void loadConfig();
        } else {
          setStatus("Gib dein API-Token ein, um fortzufahren.");
        }
      })
      .catch(() => {
        setStatus("App-Status konnte nicht geladen werden.");
        setError(true);
      });
  }, [loadConfig]);

  const ready = config !== null;

  useEffect(() => {
    if (!ready) return;

    void fetchStatus();
    const interval = window.setInterval(fetchStatus, 5000);
    return () => window.clearInterval(interval);
  }, [ready, fetchStatus, refreshToken]);

  async function submitToken() {
    storeApiToken(tokenInput);
    const ok = await loadConfig();
    if (ok) {
      setAuthRequired(false);
    }
  }

  const saveConfig = useCallback(async () => {
    if (!config) return;

    setSaving(true);
    notify("Display wird aktualisiert…");

    try {
      const response = await apiFetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }

      setSavedConfig(data.config);
      setConfig(data.config);
      notify("Auf dem Display angezeigt.");
    } catch (saveError) {
      notify(
        saveError instanceof Error ? saveError.message : "Unbekannter Fehler",
        true,
      );
    } finally {
      setSaving(false);
      bumpRefresh();
    }
  }, [config, notify]);

  function discardChanges() {
    if (savedConfig) {
      setConfig(savedConfig);
      notify("Änderungen verworfen.");
    }
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    notify("Bild wird hochgeladen…");

    try {
      const response = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Upload fehlgeschlagen");
      }

      setSavedConfig(data.config);
      setConfig(data.config);
      notify("Bild hochgeladen und angezeigt.");
    } catch (uploadError) {
      notify(
        uploadError instanceof Error ? uploadError.message : "Unbekannter Fehler",
        true,
      );
    } finally {
      setUploading(false);
      bumpRefresh();
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        if (isDirty && !saving) void saveConfig();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, saving, saveConfig]);

  if (authRequired && !config) {
    return (
      <AuthScreen
        tokenInput={tokenInput}
        status={status}
        error={error}
        onTokenChange={setTokenInput}
        onSubmit={submitToken}
      />
    );
  }

  if (!config) {
    return (
      <main className="app-shell app-shell-centered">
        <div className={`toast ${error ? "toast-error" : "toast-info"}`}>
          {status}
        </div>
      </main>
    );
  }

  const modeMeta = getModeMeta(config.displayMode);
  const showsScene = config.displayMode === "logo" || config.displayMode === "text";
  const liveMode = live.mode ? getModeMeta(live.mode).title : null;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/icon-light.png" alt="" width={44} height={36} />
          <div>
            <p className="eyebrow">AOOSTAR WTR Max</p>
            <h1>Display Control</h1>
          </div>
        </div>
        <span className="live-status" title="Aktuell auf dem Display">
          <span
            className={`live-dot ${live.mode && live.mode !== "off" ? "is-on" : ""}`}
          />
          {liveMode ? `Zeigt: ${liveMode}` : "Status unbekannt"}
        </span>
      </header>

      <div className="workspace">
        <aside className="preview-col">
          <DisplayPreview
            config={config}
            dirty={isDirty}
            panelRunning={live.panelRunning}
            version={refreshToken}
          />
        </aside>

        <div className="settings-col">
          <section className="panel">
            <div className="section-head">
              <h2>Was soll angezeigt werden?</h2>
            </div>
            <ModePicker
              value={config.displayMode}
              onChange={(displayMode) => setConfig({ ...config, displayMode })}
            />
          </section>

          <section className="panel panel-accent">
            <div className="section-head">
              <h2>{modeMeta.title}</h2>
              <p>{modeMeta.subtitle}</p>
            </div>

            {config.displayMode === "logo" ? (
              <LogoPicker
                logo={config.logo}
                onChange={(logo) => setConfig({ ...config, logo })}
              />
            ) : null}

            {config.displayMode === "text" ? (
              <TextBannerEditor
                textBanner={config.textBanner}
                onChange={(textBanner) => setConfig({ ...config, textBanner })}
              />
            ) : null}

            {config.displayMode === "sensors" ? (
              <p className="hint">
                Zeigt das AOOSTAR-Panel mit CPU, RAM, GPU, Netzwerk und
                Speicher. Für Live-Daten braucht der Container{" "}
                <code>pid: host</code> und einen read-only Mount von{" "}
                <code>/sys</code>.
              </p>
            ) : null}

            {config.displayMode === "custom" ? (
              <CustomUpload
                uploading={uploading}
                currentFile={config.customImagePath}
                onUpload={uploadImage}
              />
            ) : null}

            {config.displayMode === "off" ? (
              <p className="hint">
                Das LCD bleibt dunkel, bis du einen anderen Anzeigemodus
                wählst und übernimmst.
              </p>
            ) : null}
          </section>

          {showsScene ? (
            <section className="panel">
              <div className="section-head">
                <h2>Uhr und Live-Werte</h2>
                <p>Wird über {config.displayMode === "logo" ? "das Logo" : "den Schriftzug"} gelegt.</p>
              </div>
              <OverlayEditor
                overlay={config.overlay}
                onChange={(overlay) => setConfig({ ...config, overlay })}
              />
            </section>
          ) : null}

          <CollapsibleSection
            title="Zeitplan"
            description="Display täglich automatisch ein- und ausschalten"
            badge={config.schedule.enabled ? "Aktiv" : "Aus"}
          >
            <ScheduleEditor
              schedule={config.schedule}
              onChange={(schedule) => setConfig({ ...config, schedule })}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Live-Sensoren"
            description="Aktuelle Werte vom Host-System"
            badge={live.panelRunning ? "Läuft" : "Gestoppt"}
          >
            <SensorsPanel refreshToken={refreshToken} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Protokoll"
            description="Letzte Aktionen und Fehler"
            badge="Erweitert"
          >
            <LogsPanel
              refreshToken={refreshToken}
              onClear={() => notify("Protokoll geleert.")}
            />
          </CollapsibleSection>
        </div>
      </div>

      <div className={`status-bar ${isDirty || toast ? "is-visible" : ""}`}>
        <div className={`toast ${error ? "toast-error" : "toast-info"}`}>
          {isDirty && !saving && !error
            ? "Nicht übernommene Änderungen · ⌘S zum Übernehmen"
            : status}
        </div>
        {isDirty ? (
          <div className="status-actions">
            <button
              className="btn btn-ghost"
              type="button"
              disabled={saving}
              onClick={discardChanges}
            >
              Verwerfen
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={saving}
              onClick={() => void saveConfig()}
            >
              {saving ? "Wird übernommen…" : "Auf Display anzeigen"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
