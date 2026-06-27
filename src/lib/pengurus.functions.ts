import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { JABATAN_LIST, type Jabatan } from "./role-map";

const jabatanSchema = z.enum(JABATAN_LIST as [Jabatan, ...Jabatan[]]);

export const listPengurus = createServerFn({ method: "GET" }).handler(async () => {
  const { requirePengurus } = await import("./auth-session.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await requirePengurus();
  const { data, error } = await supabaseAdmin
    .from("pengurus")
    .select("id, nama, jabatan, aktif, harus_ganti_pin, gagal_login, locked_until, last_login_at, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createPengurus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      nama: z.string().trim().min(2).max(80),
      jabatan: jabatanSchema,
      pin: z.string().regex(/^\d{6}$/).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, logAudit } = await import("./auth-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireSuperAdmin();
    const pin = data.pin ?? "123456";
    // insert with placeholder, then set pin via SECURITY DEFINER hash function
    const { data: created, error } = await supabaseAdmin
      .from("pengurus")
      .insert({
        nama: data.nama,
        jabatan: data.jabatan,
        pin_hash: "placeholder",
        aktif: true,
        harus_ganti_pin: true,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: errPin } = await supabaseAdmin.rpc("pengurus_set_pin", { _id: created.id, _pin: pin });
    if (errPin) throw new Error(errPin.message);
    await supabaseAdmin.from("user_roles").insert({ pengurus_id: created.id, role: data.jabatan });
    await logAudit(me, "Tambah pengurus", "Manajemen Pengguna", `${data.nama} (${data.jabatan})`);
    return { id: created.id };
  });

export const updatePengurus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      nama: z.string().trim().min(2).max(80).optional(),
      jabatan: jabatanSchema.optional(),
      aktif: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, logAudit } = await import("./auth-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireSuperAdmin();
    const patch: { nama?: string; jabatan?: Jabatan; aktif?: boolean } = {};
    if (data.nama !== undefined) patch.nama = data.nama;
    if (data.jabatan !== undefined) patch.jabatan = data.jabatan;
    if (data.aktif !== undefined) patch.aktif = data.aktif;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("pengurus").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.jabatan !== undefined) {
      await supabaseAdmin.from("user_roles").delete().eq("pengurus_id", data.id);
      await supabaseAdmin.from("user_roles").insert({ pengurus_id: data.id, role: data.jabatan });
    }
    await logAudit(me, "Ubah pengurus", "Manajemen Pengguna", `${data.id}`);
    return { ok: true };
  });

export const deletePengurus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, logAudit } = await import("./auth-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireSuperAdmin();
    if (data.id === me.id) throw new Error("Tidak bisa menghapus akun Anda sendiri.");
    const { error } = await supabaseAdmin.from("pengurus").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(me, "Hapus pengurus", "Manajemen Pengguna", `${data.id}`);
    return { ok: true };
  });

export const resetPin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, logAudit } = await import("./auth-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireSuperAdmin();
    const { error } = await supabaseAdmin.rpc("pengurus_reset_pin", { _id: data.id });
    if (error) throw new Error(error.message);
    await logAudit(me, "Reset PIN", "Manajemen Pengguna", `${data.id}`);
    return { ok: true, defaultPin: "123456" };
  });

export const listAudit = createServerFn({ method: "GET" }).handler(async () => {
  const { requirePengurus } = await import("./auth-session.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await requirePengurus();
  const { data, error } = await supabaseAdmin
    .from("audit_log")
    .select("id, nama, role, aksi, modul, detail, waktu")
    .order("waktu", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
});