import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";
import { applyConfig } from "@/lib/display";
import { UPLOAD_DIR } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Only image files are supported" },
        { status: 400 },
      );
    }

    const extension = path.extname(file.name) || ".png";
    const targetPath = path.join(UPLOAD_DIR, `custom${extension}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);

    const config = await readConfig();
    const nextConfig = {
      ...config,
      displayMode: "custom" as const,
      customImagePath: targetPath,
    };

    await writeConfig(nextConfig);
    await applyConfig(nextConfig);

    return NextResponse.json({
      ok: true,
      path: targetPath,
      config: nextConfig,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
