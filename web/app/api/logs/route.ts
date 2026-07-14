import { NextResponse } from "next/server";
import { clearLogs, readLogs } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || "200");

  const logs = await readLogs(Number.isFinite(limit) ? limit : 200);
  return NextResponse.json({ ok: true, logs });
}

export async function DELETE() {
  await clearLogs();
  return NextResponse.json({ ok: true });
}
