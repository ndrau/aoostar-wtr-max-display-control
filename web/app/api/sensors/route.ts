import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isPanelModeRunning } from "@/lib/display-panel";
import { readSensorSnapshot } from "@/lib/sensors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const snapshot = await readSensorSnapshot();

  return NextResponse.json({
    ok: true,
    panelRunning: isPanelModeRunning(),
    ...snapshot,
  });
}
