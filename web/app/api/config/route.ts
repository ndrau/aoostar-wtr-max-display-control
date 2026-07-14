import { NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";
import { applyConfig } from "@/lib/display";
import { appendLog } from "@/lib/logger";
import { DEFAULT_CONFIG, type DisplayConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<DisplayConfig>;
    const current = await readConfig();

    const nextConfig: DisplayConfig = {
      displayMode: body.displayMode ?? current.displayMode,
      customImagePath:
        body.customImagePath === undefined
          ? current.customImagePath
          : body.customImagePath,
      schedule: {
        ...DEFAULT_CONFIG.schedule,
        ...current.schedule,
        ...body.schedule,
      },
    };

    await appendLog("info", "config", "Saving configuration", JSON.stringify(nextConfig));
    await writeConfig(nextConfig);
    await applyConfig(nextConfig);

    return NextResponse.json({ ok: true, config: nextConfig });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await appendLog("error", "config", "Failed to save configuration", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
