import { NextResponse } from "next/server";
import { quickCommand } from "@/lib/display";
import { appendLog } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: "on" | "off" | "original" };
    const action = body.action;

    if (!action || !["on", "off", "original"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    const output = await quickCommand(action);
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await appendLog("error", "display", "Quick action failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
