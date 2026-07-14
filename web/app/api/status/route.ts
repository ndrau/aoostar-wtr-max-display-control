import { NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth";
import { isPanelModeRunning } from "@/lib/display-panel";
import { isTextBannerLiveRunning } from "@/lib/text-banner-live";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    authRequired: isAuthEnabled(),
    panelRunning: isPanelModeRunning(),
    textBannerLive: isTextBannerLiveRunning(),
  });
}
