import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readNetworkSnapshot } from "@/lib/network";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const snapshot = await readNetworkSnapshot();

  return NextResponse.json({
    ok: true,
    ...snapshot,
  });
}
