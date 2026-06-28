import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const JENIS_SURAT = [
  { kode: "PGT", label: "Surat Pengantar RT" },
  { kode: "DOM", label: "Surat Domisili" },
  { kode: "KET", label: "Surat Keterangan" },
  { kode: "SKU", label: "Surat Keterangan Usaha" },
  { kode: "SKTM", label: "Surat Keterangan Tidak Mampu" },
  { kode: "LAIN", label: "Surat Lainnya" },
] as const;

const STATUS = ["Menunggu", "Diproses", "Disetujui", "Ditolak"] as const;

export const listSurat = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("surat_pengajuan")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createSurat = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      jenis: z.string().min(2).max(80),
      jenisKode: z.string().min(2).max(10),
      pemohon_nama: z.string().trim().min(2).max(120),
      pemohon_nik: z.string().trim().max(32).optional().or(z.literal("")),
      pemohon_alamat: z.string().trim().max(300).optional().or(z.literal("")),
      pemohon_telp: z.string().trim().max(40).optional().or(z.literal("")),
      keperluan: z.string().trim().min(3).max(500),
      catatan: z.string().trim().max(500).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCurrentPengurus, logAudit } = await import("./auth-session.server");
    const me = await getCurrentPengurus();
    const { data: nomor, error: errNo } = await supabaseAdmin.rpc("next_surat_nomor", {
      _jenis_kode: data.jenisKode,
    });
    if (errNo) throw new Error(errNo.message);
    const { data: row, error } = await supabaseAdmin
      .from("surat_pengajuan")
      .insert({
        nomor_surat: nomor as string,
        jenis: data.jenis,
        pemohon_nama: data.pemohon_nama,
        pemohon_nik: data.pemohon_nik || null,
        pemohon_alamat: data.pemohon_alamat || null,
        pemohon_telp: data.pemohon_telp || null,
        keperluan: data.keperluan,
        catatan: data.catatan || null,
        created_by: me?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(me, "Ajukan surat", "Administrasi", `${data.jenis} — ${data.pemohon_nama} (${nomor})`);
    return row;
  });

export const updateSuratStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(STATUS),
      alasan_tolak: z.string().trim().max(500).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requirePengurus, logAudit } = await import("./auth-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { jabatanToLabel } = await import("./role-map");
    const me = await requirePengurus();

    const patch: {
      status: typeof data.status;
      alasan_tolak?: string | null;
      approved_by?: string | null;
      approved_at?: string | null;
      approved_nama?: string | null;
      approved_jabatan?: string | null;
    } = { status: data.status };
    if (data.status === "Ditolak") {
      patch.alasan_tolak = data.alasan_tolak || null;
      patch.approved_by = null;
      patch.approved_at = null;
      patch.approved_nama = null;
      patch.approved_jabatan = null;
    } else if (data.status === "Disetujui") {
      if (me.jabatan !== "ketua_rt" && me.jabatan !== "super_admin") {
        throw new Error("Hanya Ketua RT (atau Super Admin) yang dapat menyetujui surat.");
      }
      patch.alasan_tolak = null;
      patch.approved_by = me.id;
      patch.approved_at = new Date().toISOString();
      patch.approved_nama = me.nama;
      patch.approved_jabatan = jabatanToLabel(me.jabatan);
    } else {
      patch.alasan_tolak = null;
    }
    const { error } = await supabaseAdmin.from("surat_pengajuan").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(me, `Ubah status surat → ${data.status}`, "Administrasi", data.id);
    return { ok: true };
  });

export const deleteSurat = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requirePengurus, logAudit } = await import("./auth-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requirePengurus();
    if (me.jabatan !== "super_admin" && me.jabatan !== "ketua_rt" && me.jabatan !== "sekretaris") {
      throw new Error("Tidak diizinkan menghapus pengajuan.");
    }
    const { error } = await supabaseAdmin.from("surat_pengajuan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(me, "Hapus surat", "Administrasi", data.id);
    return { ok: true };
  });