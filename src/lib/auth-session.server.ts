import { createHash, randomBytes } from "node:crypto";
import { getCookie, setCookie, getHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { jabatanToLabel, type Jabatan } from "./role-map";
import { SESSION_HEADER } from "./session-token";

export const SESSION_COOKIE = "sirt_pengurus_session";
export const SESSION_DAYS = 7;

export function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

export interface SessionUser {
  id: string;
  nama: string;
  jabatan: Jabatan;
  role: string;
  harus_ganti_pin: boolean;
  aktif: boolean;
}

/**
 * Token sesi diambil dari header (fallback untuk preview di dalam iframe /
 * browser yang memblokir cookie pihak ketiga) atau dari cookie httpOnly.
 */
function readSessionToken(): string | null {
  let header: string | undefined;
  try { header = getHeader(SESSION_HEADER); } catch { header = undefined; }
  if (header) return header;
  try { return getCookie(SESSION_COOKIE) ?? null; } catch { return null; }
}

export async function getCurrentPengurus(): Promise<SessionUser | null> {
  const token = readSessionToken();
  if (!token) return null;
  const hash = sha256(token);
  const { data: sess } = await supabaseAdmin
    .from("pengurus_session")
    .select("pengurus_id, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!sess) return null;
  if (new Date(sess.expires_at) < new Date()) {
    await supabaseAdmin.from("pengurus_session").delete().eq("token_hash", hash);
    return null;
  }
  const { data: p } = await supabaseAdmin
    .from("pengurus")
    .select("id, nama, jabatan, harus_ganti_pin, aktif")
    .eq("id", sess.pengurus_id)
    .maybeSingle();
  if (!p || !p.aktif) return null;
  return {
    id: p.id,
    nama: p.nama,
    jabatan: p.jabatan as Jabatan,
    role: jabatanToLabel(p.jabatan as Jabatan),
    harus_ganti_pin: p.harus_ganti_pin,
    aktif: p.aktif,
  };
}

export async function requirePengurus(): Promise<SessionUser> {
  const u = await getCurrentPengurus();
  if (!u) throw new Error("Tidak ada sesi pengurus. Silakan login.");
  return u;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const u = await requirePengurus();
  if (u.jabatan !== "super_admin") throw new Error("Hanya Super Admin yang diizinkan.");
  return u;
}

export async function createSession(pengurusId: string) {
  const token = newToken();
  const hash = sha256(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  await supabaseAdmin.from("pengurus_session").insert({
    pengurus_id: pengurusId,
    token_hash: hash,
    expires_at: expires.toISOString(),
  });
  try {
    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      // "none" agar sesi tetap terkirim ketika aplikasi dibuka di dalam iframe
      sameSite: "none",
      path: "/",
      maxAge: SESSION_DAYS * 86400,
      secure: true,
    });
  } catch { /* cookie opsional; token header tetap dipakai */ }
  return token;
}

export async function destroyCurrentSession() {
  const token = readSessionToken();
  if (token) {
    await supabaseAdmin.from("pengurus_session").delete().eq("token_hash", sha256(token));
  }
  try {
    setCookie(SESSION_COOKIE, "", { path: "/", maxAge: 0, sameSite: "none", secure: true });
  } catch { /* ignore */ }
}

export async function logAudit(
  user: SessionUser | null,
  aksi: string,
  modul: string,
  detail?: string,
) {
  try {
    await supabaseAdmin.from("audit_log").insert({
      pengurus_id: user?.id ?? null,
      nama: user?.nama ?? "Anonim",
      role: (user?.jabatan ?? null) as any,
      aksi,
      modul,
      detail: detail ?? null,
    });
  } catch (e) {
    console.error("audit log error", e);
  }
}