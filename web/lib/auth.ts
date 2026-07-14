import { NextResponse } from "next/server";

const API_TOKEN = process.env.API_TOKEN?.trim();

export function isAuthEnabled(): boolean {
  return Boolean(API_TOKEN);
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export function verifyRequest(request: Request): boolean {
  if (!API_TOKEN) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${API_TOKEN}`) {
    return true;
  }

  const apiToken = request.headers.get("x-api-token");
  return apiToken === API_TOKEN;
}

export function requireAuth(request: Request): NextResponse | null {
  if (verifyRequest(request)) {
    return null;
  }

  return unauthorizedResponse();
}
