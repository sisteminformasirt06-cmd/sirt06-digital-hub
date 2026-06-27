import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getCurrentPengurus } = await import("./auth-session.server");
  const u = await getCurrentPengurus();
  return u;
});

export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pin: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createSession, logAudit, getCurrentPengurus } = await import("./auth-session.server");
    const { data: res, error } = await supabaseAdmin.rpc("pengurus_attempt_login", { _pin: data.pin });
    if (error) throw new Error(error.message);
    const r = res as any;
    if (!r?.ok) {
      if (r?.locked) return { ok: false as const, locked: true, until: r.until as string };
      await logAudit(null, "Login gagal", "Auth", "PIN tidak valid");
      return { ok: false as const };
    }
    await createSession(r.id);
    const u = await getCurrentPengurus();
    await logAudit(u, "Login", "Auth");
    return { ok: true as const, harusGantiPin: r.harus_ganti_pin as boolean };
  });

export const logoutSession = createServerFn({ method: "POST" }).handler(async () => {
  const { destroyCurrentSession, getCurrentPengurus, logAudit } = await import("./auth-session.server");
  const u = await getCurrentPengurus();
  if (u) await logAudit(u, "Logout", "Auth");
  await destroyCurrentSession();
  return { ok: true };
});

export const changeMyPin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      oldPin: z.string().regex(/^\d{6}$/),
      newPin: z.string().regex(/^\d{6}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requirePengurus, logAudit } = await import("./auth-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const u = await requirePengurus();
    if (data.oldPin === data.newPin) throw new Error("PIN baru harus berbeda dari PIN lama");
    const { data: ok, error } = await supabaseAdmin.rpc("pengurus_change_pin", {
      _id: u.id, _old: data.oldPin, _new: data.newPin,
    });
    if (error) throw new Error(error.message);
    if (!ok) {
      await logAudit(u, "Ganti PIN gagal", "Auth", "PIN lama salah");
      throw new Error("PIN lama salah");
    }
    await logAudit(u, "Ganti PIN", "Auth");
    return { ok: true };
  });

export const recordAudit = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      aksi: z.string().min(1).max(200),
      modul: z.string().min(1).max(80),
      detail: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getCurrentPengurus, logAudit } = await import("./auth-session.server");
    const u = await getCurrentPengurus();
    await logAudit(u, data.aksi, data.modul, data.detail);
    return { ok: true };
  });