"use client";

export function AuthScreen({
  tokenInput,
  status,
  error,
  onTokenChange,
  onSubmit,
}: {
  tokenInput: string;
  status: string;
  error: boolean;
  onTokenChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <main className="app-shell">
      <section className="auth-card panel">
        <div className="brand-lockup">
          <span className="brand-mark">AOOSTAR</span>
          <h1>Display Control</h1>
          <p>Gib dein API-Token ein, um das Gehäuse-Display zu steuern.</p>
        </div>

        <div className="field">
          <label htmlFor="api-token">API-Token</label>
          <input
            id="api-token"
            type="password"
            value={tokenInput}
            placeholder="Aus Portainer / API_TOKEN"
            onChange={(event) => onTokenChange(event.target.value)}
          />
        </div>

        <button className="btn btn-primary btn-block" type="button" onClick={onSubmit}>
          Weiter
        </button>

        <p className="hint">
          Das Token wird nur in diesem Browser gespeichert. Setze{" "}
          <code>API_TOKEN</code> in der Container-Umgebung.
        </p>

        <div className={`toast ${error ? "toast-error" : "toast-info"}`}>
          {status}
        </div>
      </section>
    </main>
  );
}
