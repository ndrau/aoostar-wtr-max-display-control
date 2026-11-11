import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readConfig } from "@/lib/config";
import { quickCommand } from "@/lib/display";
import { appendLog } from "@/lib/logger";
import { applyConfigForSave } from "@/lib/scheduler";

export const runtime = "nodejs";

type Action = "on" | "off" | "sensors";

/** Imperative switch for scripts and automations; the web UI uses /api/config. */
export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as { action?: Action };
    const action = body.action;

    if (!action || !["on", "off", "sensors"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    if (action === "on") {
      await applyConfigForSave(await readConfig());
      return NextResponse.json({ ok: true, output: "Saved config applied" });
    }

    const output = await quickCommand(action);
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await appendLog("error", "display", "Quick action failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
