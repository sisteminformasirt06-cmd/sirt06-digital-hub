// Fallback penyimpanan token sesi pengurus untuk lingkungan yang memblokir
// cookie pihak ketiga (mis. preview di dalam iframe). Cookie httpOnly tetap
// menjadi mekanisme utama; token ini hanya dikirim sebagai header tambahan.
export const SESSION_HEADER = "x-sirt-session";
const KEY = "sirt_session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}

export function setSessionToken(token: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, token); } catch { /* ignore */ }
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
