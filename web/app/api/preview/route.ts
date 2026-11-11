import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mergeConfig, readConfig } from "@/lib/config";
import { loadAllSensorValues } from "@/lib/sensor-sources";
import { isSceneMode, renderCustomImage, renderScene } from "@/lib/scene";
import { shouldShowCornerSensors } from "@/lib/sensor-fields";
import type { DisplayConfig } from "@/lib/types";
import { normalizeConfig, sanitizeCustomImagePath } from "@/lib/validation";

export const runtime = "nodejs";

/** Renders an unsaved draft exactly as the display would show it. */
export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<DisplayConfig>;
    const current = await readConfig();
    const config = normalizeConfig(mergeConfig(current, body));

    let png: Buffer;

    if (isSceneMode(config.displayMode)) {
      const snapshot = shouldShowCornerSensors(config.overlay)
        ? await loadAllSensorValues()
        : {};
      png = await renderScene(config, snapshot);
    } else if (config.displayMode === "custom") {
      const imagePath = sanitizeCustomImagePath(config.customImagePath);
      if (!imagePath) {
        return NextResponse.json(
          { ok: false, error: "No custom image" },
          { status: 404 },
        );
      }
      png = await renderCustomImage(imagePath);
    } else {
      return NextResponse.json(
        { ok: false, error: "Mode has no rendered preview" },
        { status: 400 },
      );
    }

    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
