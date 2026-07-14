"use client";

const TOKEN_STORAGE_KEY = "aoostar-display-api-token";

export function getStoredApiToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
}

export function storeApiToken(token: string) {
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
}

export function authHeaders(): HeadersInit {
  const token = getStoredApiToken();
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getStoredApiToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
