"use client";

import type { DisplayConfig } from "@/lib/types";

export function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: DisplayConfig["schedule"];
  onChange: (schedule: DisplayConfig["schedule"]) => void;
}) {
  return (
    <div className="stack">
      <label className="switch-row">
        <input
          type="checkbox"
          checked={schedule.enabled}
          onChange={(event) =>
            onChange({ ...schedule, enabled: event.target.checked })
          }
        />
        <span>
          <strong>Täglicher Zeitplan</strong>
          <small>Display automatisch ein- und ausschalten</small>
        </span>
      </label>

      <div className={`schedule-fields ${schedule.enabled ? "" : "is-disabled"}`}>
        <div className="field">
          <label htmlFor="on-time">Einschalten</label>
          <input
            id="on-time"
            type="time"
            disabled={!schedule.enabled}
            value={schedule.displayOnTime}
            onChange={(event) =>
              onChange({ ...schedule, displayOnTime: event.target.value })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="off-time">Ausschalten</label>
          <input
            id="off-time"
            type="time"
            disabled={!schedule.enabled}
            value={schedule.displayOffTime}
            onChange={(event) =>
              onChange({ ...schedule, displayOffTime: event.target.value })
            }
          />
        </div>
      </div>
      <p className="hint">
        Außerhalb des Zeitfensters ist das Display aus. Innerhalb wird dein
        gewählter Modus wiederhergestellt.
      </p>
    </div>
  );
}
