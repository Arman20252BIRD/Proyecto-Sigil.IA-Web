"use client";

/** Controller del frontend para peticiones protegidas del dashboard. */
export async function fetchWithAuth(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = window.sessionStorage.getItem("sigil_access_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    window.sessionStorage.removeItem("sigil_access_token");
    window.dispatchEvent(new Event("sigil-session-expired"));
  }
  return response;
}
