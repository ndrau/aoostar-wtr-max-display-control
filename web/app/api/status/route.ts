import { NextResponse } from "next/server";
import { isAuthEnabled, verifyRequest } from "@/lib/auth";
import { getDisplayState } from "@/lib/display-state";
import { isPanelModeRunning } from "@/lib/display-panel";
import { isSceneLiveRunning } from "@/lib/scene-live";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authRequired = isAuthEnabled();

  if (authRequired && !verifyRequest(request)) {
    return NextResponse.json({ authRequired });
  }

  return NextResponse.json({
    authRequired,
    ...getDisplayState(),
    panelRunning: isPanelModeRunning(),
    sceneLive: isSceneLiveRunning(),
  });
}
