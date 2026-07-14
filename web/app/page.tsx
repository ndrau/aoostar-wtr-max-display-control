"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { CustomUpload } from "@/components/CustomUpload";
import { DisplayPreview } from "@/components/DisplayPreview";
import { LogsPanel } from "@/components/LogsPanel";
import { ModePicker } from "@/components/ModePicker";
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
import type { DisplayConfig } from "@/lib/types";

export default function Dashboard() {
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState(getStoredApiToken());
  const [savedConfig, setSavedConfig] = useState<DisplayConfig | null>(null);
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [status, setStatus] = useState("Einstellungen werden geladen…");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [sensorValues, setSensorValues] = useState<Record<string, string>>({});
  const [panelRunning, setPanelRunning] = useState(false);

  const isDirty =
    savedConfig !== null &&
    config !== null &&
    !configsEqual(savedConfig, config);

  function bumpRefresh() {
    setRefreshToken((value) => value + 1);
  }

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
    setStatus("Bereit.");
    setError(false);
    return true;
  }, []);

  const fetchSensors = useCallback(async () => {
    try {
      const response = await apiFetch("/api/sensors");
      const data = await response.json();
      if (data.ok) {
        setSensorValues(data.values ?? {});
        setPanelRunning(Boolean(data.panelRunning));
      }
    } catch {
      // Preview works without live sensor data.
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

  useEffect(() => {
    if (!config) return;

    void fetchSensors();
    const interval = window.setInterval(fetchSensors, 4000);
    return () => window.clearInterval(interval);
  }, [config, fetchSensors, refreshToken]);

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
    setStatus("Display wird aktualisiert…");
    setError(false);

    try {
      const response = await apiFetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }

      setSavedConfig(data.config);
      setConfig(data.config);
      setStatus("Display erfolgreich aktualisiert.");
      bumpRefresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unbekannter Fehler";
      setStatus(message);
      setError(true);
      bumpRefresh();
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    if (savedConfig) {
      setConfig(savedConfig);
      setStatus("Änderungen verworfen.");
      setError(false);
    }
  }

  async function quickAction(action: "on" | "off" | "sensors") {
    setError(false);

    try {
      const response = await apiFetch("/api/display", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Befehl fehlgeschlagen");
      }

      const labels = {
        on: "TrueNAS Logo angezeigt",
        sensors: "System-Dashboard gestartet",
        off: "Display ausgeschaltet",
      };
      setStatus(labels[action]);
      bumpRefresh();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Unbekannter Fehler";
      setStatus(message);
      setError(true);
      bumpRefresh();
    }
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setStatus("Bild wird hochgeladen…");
    setError(false);

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
      setStatus("Eigenes Bild hochgeladen und angewendet.");
      bumpRefresh();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Unbekannter Fehler";
      setStatus(message);
      setError(true);
      bumpRefresh();
    } finally {
      setUploading(false);
    }
  }

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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AOOSTAR WTR Max</p>
          <h1>Display Control</h1>
          <p className="lede">
            Steuere das Gehäuse-Display — mit sinnvollen Standardwerten, die du
            bei Bedarf anpassen kannst.
          </p>
        </div>
        <div className="quick-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => quickAction("on")}
          >
            Logo
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => quickAction("sensors")}
          >
            Dashboard
          </button>
          <button
            className="btn btn-ghost btn-danger-text"
            type="button"
            onClick={() => quickAction("off")}
          >
            Aus
          </button>
        </div>
      </header>

      <DisplayPreview
        config={config}
        sensorValues={sensorValues}
        panelRunning={panelRunning}
      />

      <section className="panel">
        <div className="section-head">
          <h2>Anzeigemodus</h2>
          <p>Wähle, was auf dem Display erscheinen soll.</p>
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

        {config.displayMode === "truenas" ? (
          <p className="hint">
            Standardmodus — kein Setup nötig. Das TrueNAS-Logo wird bei jedem
            Container-Start angezeigt.
          </p>
        ) : null}

        {config.displayMode === "sensors" ? (
          <div className="stack">
            <p className="hint">
              Zeigt das offizielle AOOSTAR-Panel mit CPU, RAM, GPU, Netzwerk und
              Speicher. Für Live-Daten braucht der Container read-only Mounts von{" "}
              <code>/proc</code> und <code>/sys</code>.
            </p>
          </div>
        ) : null}

        {config.displayMode === "text" ? (
          <TextBannerEditor
            textBanner={config.textBanner}
            onChange={(textBanner) => setConfig({ ...config, textBanner })}
          />
        ) : null}

        {config.displayMode === "custom" ? (
          <div className="stack">
            <CustomUpload uploading={uploading} onUpload={uploadImage} />
            {config.customImagePath ? (
              <p className="hint">
                Aktuelles Bild: <code>{config.customImagePath}</code>
              </p>
            ) : (
              <p className="hint">
                Noch kein Bild hochgeladen. Wähle eine Datei — sie wird direkt
                angewendet.
              </p>
            )}
          </div>
        ) : null}

        {config.displayMode === "off" ? (
          <p className="hint">
            Schaltet das eingebaute LCD komplett aus. Zum Wiederherstellen einen
            anderen Modus wählen und übernehmen.
          </p>
        ) : null}
      </section>

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
        badge={panelRunning ? "Läuft" : "Gestoppt"}
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
          onClear={() => setStatus("Protokoll geleert.")}
        />
      </CollapsibleSection>

      <div className="status-bar is-visible">
        <div className={`toast ${error ? "toast-error" : "toast-info"}`}>
          {status}
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
              onClick={() => saveConfig()}
            >
              {saving ? "Wird übernommen…" : "Übernehmen"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
