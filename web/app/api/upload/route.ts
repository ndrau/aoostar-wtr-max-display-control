import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readConfig, writeConfig } from "@/lib/config";
import { applyConfig } from "@/lib/display";
import { appendLog } from "@/lib/logger";
import { UPLOAD_DIR } from "@/lib/paths";
import { getUploadExtension, validateUpload } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 },
      );
    }

    validateUpload(file);

    const extension = getUploadExtension(file.name);
    const targetPath = path.join(UPLOAD_DIR, `custom${extension}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);

    await appendLog(
      "info",
      "upload",
      "Custom image uploaded",
      `${file.name} -> ${targetPath}`,
    );

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
    await appendLog("error", "upload", "Upload failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
