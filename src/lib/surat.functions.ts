import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const JENIS_SURAT = [
  { kode: "PGT", label: "Surat Pengantar" },
  { kode: "DOM", label: "Surat Domisili" },
  { kode: "SKU", label: "Surat Keterangan Usaha" },
  { kode: "SKTM", label: "Surat Keterangan Tidak Mampu" },
  { kode: "LAIN", label: "Surat Keterangan Lainnya" },
] as const;

export const STATUS_LIST = ["Draft", "Menunggu", "Diproses", "Disetujui", "Ditolak", "Selesai"] as const;
export type SuratStatus = typeof STATUS_LIST[number];

const STATUS_ENUM = z.enum(STATUS_LIST);

const actorShape = {
  actor_id: z.string().optional().or(z.literal("")),
  actor_nama: z.string().optional().or(z.literal("")),
  actor_role: z.string().optional().or(z.literal("")),
};

const suratFields = {
  jenis: z.string().min(2).max(80),
  jenisKode: z.string().min(2).max(10),
  pemohon_nama: z.string().trim().min(2).max(120),
  pemohon_nik: z.string().trim().max(32).optional().or(z.literal("")),
  nomor_kk: z.string().trim().max(32).optional().or(z.literal("")),
  pemohon_alamat: z.string().trim().max(300).optional().or(z.literal("")),
  pemohon_telp: z.string().trim().max(40).optional().or(z.literal("")),
  keperluan: z.string().trim().min(3).max(500),
  catatan: z.string().trim().max(500).optional().or(z.literal("")),
};

async function logActor(
  actor: { actor_nama?: string } | undefined,
  aksi: string,
  modul: string,
  detail?: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    await supabaseAdmin.from("audit_log").insert({
      pengurus_id: null,
      nama: actor?.actor_nama || "Anonim",
      role: null,
      aksi,
      modul,
      detail: detail ?? null,
    });
  } catch (e) {
    console.error("audit log error", e);
  }
}

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

export const getSuratById = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("surat_pengajuan")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createSurat = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ ...suratFields, ...actorShape, status: STATUS_ENUM.optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
        nomor_kk: data.nomor_kk || null,
        pemohon_alamat: data.pemohon_alamat || null,
        pemohon_telp: data.pemohon_telp || null,
        keperluan: data.keperluan,
        catatan: data.catatan || null,
        status: (data.status ?? "Menunggu") as never,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logActor(data, "Ajukan surat", "Administrasi", `${data.jenis} — ${data.pemohon_nama} (${nomor})`);
    return row;
  });

export const updateSurat = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), ...suratFields, ...actorShape }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("surat_pengajuan")
      .update({
        jenis: data.jenis,
        pemohon_nama: data.pemohon_nama,
        pemohon_nik: data.pemohon_nik || null,
        nomor_kk: data.nomor_kk || null,
        pemohon_alamat: data.pemohon_alamat || null,
        pemohon_telp: data.pemohon_telp || null,
        keperluan: data.keperluan,
        catatan: data.catatan || null,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActor(data, "Ubah surat", "Administrasi", `${data.jenis} — ${data.pemohon_nama}`);
    return { ok: true };
  });

export const updateSuratStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: STATUS_ENUM,
      alasan_tolak: z.string().trim().max(500).optional().or(z.literal("")),
      ...actorShape,
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "Ditolak") {
      patch.alasan_tolak = data.alasan_tolak || null;
      patch.approved_by = null;
      patch.approved_at = null;
      patch.approved_nama = null;
      patch.approved_jabatan = null;
    } else if (data.status === "Disetujui") {
      patch.alasan_tolak = null;
      patch.approved_at = new Date().toISOString();
      patch.approved_nama = data.actor_nama || null;
      patch.approved_jabatan = data.actor_role || null;
    } else {
      patch.alasan_tolak = null;
    }
    const { error } = await supabaseAdmin.from("surat_pengajuan").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActor(data, `Ubah status surat → ${data.status}`, "Administrasi", data.id);
    return { ok: true };
  });

export const deleteSurat = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), ...actorShape }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("surat_pengajuan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActor(data, "Hapus surat", "Administrasi", data.id);
    return { ok: true };
  });