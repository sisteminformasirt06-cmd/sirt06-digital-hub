import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Plus, Trash2, Search, X, Home, UserPlus, Filter, Pencil, Eye, Loader2, Image as ImageIcon } from "lucide-react";
import { tanggal } from "@/lib/storage";
import { useAuth, type Role } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/warga")({
  head: () => ({
    meta: [
      { title: "Data Warga — SiRT 06 Digital" },
      { name: "description", content: "Kelola data warga RT 06 secara digital dan terpusat." },
    ],
  }),
  component: WargaPage,
});

const BUCKET = "warga-photos";
const STATUS_WARGA = ["Warga Tetap", "Warga Domisili", "Warga Kontrak/Sewa"] as const;
type StatusWarga = (typeof STATUS_WARGA)[number];
const JK_LIST = ["Laki-laki", "Perempuan"] as const;
type JK = (typeof JK_LIST)[number];
const AGAMA_LIST = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"];
const PENDIDIKAN_LIST = ["Belum Sekolah", "SD", "SMP", "SMA/SMK", "D1/D2/D3", "S1", "S2", "S3"];
const STATUS_KELUARGA_LIST = ["Kepala Keluarga", "Istri", "Anak", "Orang Tua", "Famili Lain", "Lainnya"];
const STATUS_PERKAWINAN_LIST = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];

interface KK {
  id: string;
  nomor_kk: string;
  kepala_keluarga: string;
  alamat: string;
  no_wa: string | null;
  rt: string | null;
  rw: string | null;
  status_kk: "Aktif" | "Pindah";
  foto_kk_url: string | null;
}

interface Anggota {
  id: string;
  kk_id: string;
  nik: string;
  nama: string;
  jenis_kelamin: JK;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama: string | null;
  pendidikan: string | null;
  pekerjaan: string | null;
  status_keluarga: string | null;
  status_perkawinan: string | null;
  status_warga: StatusWarga;
  no_hp: string | null;
  foto_url: string | null;
}

type Tab = "warga" | "kk";

function canManage(role?: Role | null) {
  return role === "Admin" || role === "Bendahara" || role === "Super Admin";
}
function canDelete(role?: Role | null) {
  return role === "Super Admin";
}

async function uploadFoto(file: File, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

function useSignedUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (alive) setUrl(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [path]);
  return url;
}

function WargaPage() {
  const { user, logAction } = useAuth();
  const [tab, setTab] = useState<Tab>("warga");
  const [kks, setKks] = useState<KK[]>([]);
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState<StatusWarga | "Semua">("Semua");
  const [fJK, setFJK] = useState<JK | "Semua">("Semua");
  const [fRT, setFRT] = useState("");
  const [fRW, setFRW] = useState("");

  const [editKK, setEditKK] = useState<KK | null>(null);
  const [showKK, setShowKK] = useState(false);
  const [editAng, setEditAng] = useState<Anggota | null>(null);
  const [showAng, setShowAng] = useState(false);
  const [detailAng, setDetailAng] = useState<Anggota | null>(null);
  const [detailKK, setDetailKK] = useState<KK | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [kkRes, angRes] = await Promise.all([
        supabase.from("kartu_keluarga").select("*").order("created_at", { ascending: false }),
        supabase.from("anggota_keluarga").select("*").order("created_at", { ascending: false }),
      ]);
      if (kkRes.error) throw kkRes.error;
      if (angRes.error) throw angRes.error;
      setKks((kkRes.data ?? []) as KK[]);
      setAnggota((angRes.data ?? []) as Anggota[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rtList = useMemo(() => Array.from(new Set(kks.map((k) => k.rt).filter(Boolean) as string[])).sort(), [kks]);
  const rwList = useMemo(() => Array.from(new Set(kks.map((k) => k.rw).filter(Boolean) as string[])).sort(), [kks]);

  const anggotaFiltered = useMemo(() => {
    return anggota.filter((a) => {
      const kk = kks.find((k) => k.id === a.kk_id);
      const qMatch = !q || [a.nama, a.nik, kk?.nomor_kk].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase());
      const sMatch = fStatus === "Semua" || a.status_warga === fStatus;
      const jMatch = fJK === "Semua" || a.jenis_kelamin === fJK;
      const rtMatch = !fRT || kk?.rt === fRT;
      const rwMatch = !fRW || kk?.rw === fRW;
      return qMatch && sMatch && jMatch && rtMatch && rwMatch;
    });
  }, [anggota, kks, q, fStatus, fJK, fRT, fRW]);

  const kkFiltered = useMemo(() => {
    return kks.filter((k) => {
      const qMatch = !q || [k.nomor_kk, k.kepala_keluarga, k.alamat].join(" ").toLowerCase().includes(q.toLowerCase());
      const rtMatch = !fRT || k.rt === fRT;
      const rwMatch = !fRW || k.rw === fRW;
      return qMatch && rtMatch && rwMatch;
    });
  }, [kks, q, fRT, fRW]);

  const stats = useMemo(() => ({
    total: anggota.length,
    kk: kks.length,
    tetap: anggota.filter((a) => a.status_warga === "Warga Tetap").length,
    domisili: anggota.filter((a) => a.status_warga === "Warga Domisili").length,
    kontrak: anggota.filter((a) => a.status_warga === "Warga Kontrak/Sewa").length,
    lk: anggota.filter((a) => a.jenis_kelamin === "Laki-laki").length,
  }), [anggota, kks]);

  if (!user) return <LoginRequired modul="Data Warga" />;

  const manage = canManage(user.role);
  const del = canDelete(user.role);

  const saveKK = async (data: Omit<KK, "id">, fotoFile: File | null) => {
    let foto_kk_url = data.foto_kk_url;
    if (fotoFile) foto_kk_url = await uploadFoto(fotoFile, "kk");
    if (editKK) {
      const { error } = await supabase.from("kartu_keluarga").update({ ...data, foto_kk_url }).eq("id", editKK.id);
      if (error) throw error;
      logAction("Edit KK", "Data Warga", data.nomor_kk);
    } else {
      const { error } = await supabase.from("kartu_keluarga").insert({ ...data, foto_kk_url });
      if (error) throw error;
      logAction("Tambah KK", "Data Warga", data.nomor_kk);
    }
    setShowKK(false); setEditKK(null); await load();
  };

  const removeKK = async (kk: KK) => {
    if (!confirm(`Hapus KK ${kk.nomor_kk}? Semua anggota keluarga ikut terhapus.`)) return;
    const { error } = await supabase.from("kartu_keluarga").delete().eq("id", kk.id);
    if (error) { alert(error.message); return; }
    logAction("Hapus KK", "Data Warga", kk.nomor_kk);
    await load();
  };

  const saveAng = async (data: Omit<Anggota, "id">, fotoFile: File | null) => {
    let foto_url = data.foto_url;
    if (fotoFile) foto_url = await uploadFoto(fotoFile, "warga");
    if (editAng) {
      const { error } = await supabase.from("anggota_keluarga").update({ ...data, foto_url }).eq("id", editAng.id);
      if (error) throw error;
      logAction("Edit Warga", "Data Warga", data.nama);
    } else {
      const { error } = await supabase.from("anggota_keluarga").insert({ ...data, foto_url });
      if (error) throw error;
      logAction("Tambah Warga", "Data Warga", data.nama);
    }
    setShowAng(false); setEditAng(null); await load();
  };

  const removeAng = async (a: Anggota) => {
    if (!confirm(`Hapus data ${a.nama}?`)) return;
    const { error } = await supabase.from("anggota_keluarga").delete().eq("id", a.id);
    if (error) { alert(error.message); return; }
    logAction("Hapus Warga", "Data Warga", a.nama);
    await load();
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader title="Data Warga" desc="Kelola KK dan anggota warga RT 06" icon={Users} />

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          ["Warga", stats.total], ["KK", stats.kk], ["Tetap", stats.tetap],
          ["Domisili", stats.domisili], ["Kontrak", stats.kontrak], ["L / P", `${stats.lk}/${stats.total - stats.lk}`],
        ].map(([l, v]) => (
          <div key={String(l)} className="glass rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{l}</div>
            <div className="text-lg font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["warga", "kk"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${tab === t ? "gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
            {t === "warga" ? "Anggota Warga" : "Kartu Keluarga"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, NIK, No. KK…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-input border border-border text-sm" />
        </div>
        {tab === "warga" && (
          <>
            <FilterBox>
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value as StatusWarga | "Semua")} className="bg-transparent outline-none">
                <option>Semua</option>
                {STATUS_WARGA.map((s) => <option key={s}>{s}</option>)}
              </select>
            </FilterBox>
            <FilterBox>
              <select value={fJK} onChange={(e) => setFJK(e.target.value as JK | "Semua")} className="bg-transparent outline-none">
                <option>Semua</option>
                {JK_LIST.map((j) => <option key={j}>{j}</option>)}
              </select>
            </FilterBox>
          </>
        )}
        <FilterBox>
          <select value={fRT} onChange={(e) => setFRT(e.target.value)} className="bg-transparent outline-none">
            <option value="">RT semua</option>
            {rtList.map((r) => <option key={r} value={r}>RT {r}</option>)}
          </select>
        </FilterBox>
        <FilterBox>
          <select value={fRW} onChange={(e) => setFRW(e.target.value)} className="bg-transparent outline-none">
            <option value="">RW semua</option>
            {rwList.map((r) => <option key={r} value={r}>RW {r}</option>)}
          </select>
        </FilterBox>
        {manage && (
          <button
            onClick={() => { if (tab === "warga") { setEditAng(null); setShowAng(true); } else { setEditKK(null); setShowKK(true); } }}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow"
          >
            {tab === "warga" ? <><UserPlus className="h-4 w-4" /> Tambah Warga</> : <><Plus className="h-4 w-4" /> Tambah KK</>}
          </button>
        )}
      </div>

      {err && <div className="glass rounded-2xl p-3 text-xs text-destructive">{err}</div>}
      {loading ? (
        <div className="glass rounded-2xl p-8 text-center flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat data…
        </div>
      ) : tab === "warga" ? (
        <DataTable
          headers={["Nama", "NIK", "JK", "Status Warga", "No. KK", "HP", ""]}
          rows={anggotaFiltered.map((a) => {
            const kk = kks.find((k) => k.id === a.kk_id);
            return [
              a.nama, a.nik, a.jenis_kelamin === "Laki-laki" ? "L" : "P",
              <StatusBadge key={a.id} status={a.status_warga} />,
              kk?.nomor_kk ?? "-", a.no_hp ?? "-",
              <RowActions key={a.id}
                onView={() => setDetailAng(a)}
                onEdit={manage ? () => { setEditAng(a); setShowAng(true); } : undefined}
                onDelete={del ? () => removeAng(a) : undefined}
              />,
            ];
          })}
          empty="Belum ada data warga."
        />
      ) : (
        <DataTable
          headers={["No. KK", "Kepala Keluarga", "Alamat", "RT/RW", "Anggota", "Status", ""]}
          rows={kkFiltered.map((k) => [
            k.nomor_kk, k.kepala_keluarga, k.alamat,
            `${k.rt ?? "-"}/${k.rw ?? "-"}`,
            anggota.filter((a) => a.kk_id === k.id).length,
            <span key={k.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${k.status_kk === "Aktif" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{k.status_kk}</span>,
            <RowActions key={k.id}
              onView={() => setDetailKK(k)}
              onEdit={manage ? () => { setEditKK(k); setShowKK(true); } : undefined}
              onDelete={del ? () => removeKK(k) : undefined}
            />,
          ])}
          empty="Belum ada data warga."
        />
      )}

      {showKK && (
        <Modal title={editKK ? "Edit KK" : "Tambah KK"} onClose={() => { setShowKK(false); setEditKK(null); }}>
          <KKForm initial={editKK} onSubmit={saveKK} />
        </Modal>
      )}
      {showAng && (
        <Modal title={editAng ? "Edit Anggota" : "Tambah Anggota"} onClose={() => { setShowAng(false); setEditAng(null); }}>
          <AnggotaForm kks={kks} anggotaAll={anggota} initial={editAng} onSubmit={saveAng} />
        </Modal>
      )}
      {detailAng && (
        <Modal title="Detail Warga" onClose={() => setDetailAng(null)}>
          <AnggotaDetail a={detailAng} kk={kks.find((k) => k.id === detailAng.kk_id) ?? null} />
        </Modal>
      )}
      {detailKK && (
        <Modal title={`Detail KK ${detailKK.nomor_kk}`} onClose={() => setDetailKK(null)}>
          <KKDetail k={detailKK} anggota={anggota.filter((a) => a.kk_id === detailKK.id)} />
        </Modal>
      )}
    </div>
  );
}

function FilterBox({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5 glass rounded-xl px-2 py-1.5 text-xs">{children}</div>;
}

function StatusBadge({ status }: { status: StatusWarga }) {
  const map: Record<StatusWarga, string> = {
    "Warga Tetap": "bg-primary/15 text-primary",
    "Warga Domisili": "bg-sky-500/15 text-sky-600",
    "Warga Kontrak/Sewa": "bg-amber-500/15 text-amber-600",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[status]}`}>{status}</span>;
}

function RowActions({ onView, onEdit, onDelete }: { onView?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-1">
      {onView && <button onClick={onView} className="p-1 rounded hover:bg-accent text-muted-foreground" title="Detail"><Eye className="h-3.5 w-3.5" /></button>}
      {onEdit && <button onClick={onEdit} className="p-1 rounded hover:bg-accent text-primary" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
      {onDelete && <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>}
    </div>
  );
}

function KKForm({ initial, onSubmit }: { initial: KK | null; onSubmit: (d: Omit<KK, "id">, foto: File | null) => Promise<void> }) {
  const [f, setF] = useState<Omit<KK, "id">>({
    nomor_kk: initial?.nomor_kk ?? "",
    kepala_keluarga: initial?.kepala_keluarga ?? "",
    alamat: initial?.alamat ?? "",
    no_wa: initial?.no_wa ?? "",
    rt: initial?.rt ?? "",
    rw: initial?.rw ?? "",
    status_kk: initial?.status_kk ?? "Aktif",
    foto_kk_url: initial?.foto_kk_url ?? null,
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));
  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); if (!f.nomor_kk || !f.kepala_keluarga || !f.alamat) return;
      setBusy(true); setError(null);
      try { await onSubmit(f, foto); } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan"); }
      finally { setBusy(false); }
    }} className="space-y-3">
      <Field label="No. KK *"><input required value={f.nomor_kk} onChange={(e) => set({ nomor_kk: e.target.value })} className="form-inp" /></Field>
      <Field label="Nama Kepala Keluarga *"><input required value={f.kepala_keluarga} onChange={(e) => set({ kepala_keluarga: e.target.value })} className="form-inp" /></Field>
      <Field label="Alamat *"><textarea required value={f.alamat} onChange={(e) => set({ alamat: e.target.value })} className="form-inp" rows={2} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="RT"><input value={f.rt ?? ""} onChange={(e) => set({ rt: e.target.value })} className="form-inp" placeholder="06" /></Field>
        <Field label="RW"><input value={f.rw ?? ""} onChange={(e) => set({ rw: e.target.value })} className="form-inp" placeholder="02" /></Field>
      </div>
      <Field label="Nomor WhatsApp"><input value={f.no_wa ?? ""} onChange={(e) => set({ no_wa: e.target.value })} className="form-inp" placeholder="08xxxxxxxxxx" /></Field>
      <Field label="Status KK">
        <select value={f.status_kk} onChange={(e) => set({ status_kk: e.target.value as "Aktif" | "Pindah" })} className="form-inp">
          <option>Aktif</option><option>Pindah</option>
        </select>
      </Field>
      <Field label="Foto KK (opsional)">
        <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="form-inp" />
      </Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : "Simpan KK"}</SubmitBtn>
    </form>
  );
}

function AnggotaForm({ kks, anggotaAll, initial, onSubmit }: {
  kks: KK[]; anggotaAll: Anggota[]; initial: Anggota | null;
  onSubmit: (d: Omit<Anggota, "id">, foto: File | null) => Promise<void>;
}) {
  const [f, setF] = useState<Omit<Anggota, "id">>({
    kk_id: initial?.kk_id ?? kks[0]?.id ?? "",
    nik: initial?.nik ?? "",
    nama: initial?.nama ?? "",
    jenis_kelamin: initial?.jenis_kelamin ?? "Laki-laki",
    tempat_lahir: initial?.tempat_lahir ?? "",
    tanggal_lahir: initial?.tanggal_lahir ?? "",
    agama: initial?.agama ?? "Islam",
    pendidikan: initial?.pendidikan ?? "",
    pekerjaan: initial?.pekerjaan ?? "",
    status_keluarga: initial?.status_keluarga ?? "Anak",
    status_perkawinan: initial?.status_perkawinan ?? "Belum Kawin",
    status_warga: initial?.status_warga ?? "Warga Tetap",
    no_hp: initial?.no_hp ?? "",
    foto_url: initial?.foto_url ?? null,
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));

  const kkCount = anggotaAll.filter((a) => a.kk_id === f.kk_id && a.id !== initial?.id).length;
  const overLimit = !initial && kkCount >= 8;

  if (kks.length === 0) {
    return <div className="text-sm text-muted-foreground">Belum ada KK. Tambahkan KK terlebih dahulu.</div>;
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!f.nik || !f.nama || !f.kk_id) return;
      if (overLimit) { setError("KK ini sudah memiliki 8 anggota."); return; }
      setBusy(true); setError(null);
      try { await onSubmit(f, foto); } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan"); }
      finally { setBusy(false); }
    }} className="space-y-3">
      <Field label="Kartu Keluarga *">
        <select required value={f.kk_id} onChange={(e) => set({ kk_id: e.target.value })} className="form-inp">
          {kks.map((k) => <option key={k.id} value={k.id}>{k.nomor_kk} · {k.kepala_keluarga}</option>)}
        </select>
      </Field>
      {overLimit && <div className="text-xs text-destructive">KK ini sudah berisi 8 anggota (batas maksimal).</div>}
      <Field label="NIK *"><input required maxLength={16} value={f.nik} onChange={(e) => set({ nik: e.target.value })} className="form-inp" /></Field>
      <Field label="Nama Lengkap *"><input required value={f.nama} onChange={(e) => set({ nama: e.target.value })} className="form-inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Jenis Kelamin"><select value={f.jenis_kelamin} onChange={(e) => set({ jenis_kelamin: e.target.value as JK })} className="form-inp">{JK_LIST.map((j) => <option key={j}>{j}</option>)}</select></Field>
        <Field label="Agama"><select value={f.agama ?? ""} onChange={(e) => set({ agama: e.target.value })} className="form-inp">{AGAMA_LIST.map((a) => <option key={a}>{a}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tempat Lahir"><input value={f.tempat_lahir ?? ""} onChange={(e) => set({ tempat_lahir: e.target.value })} className="form-inp" /></Field>
        <Field label="Tanggal Lahir"><input type="date" value={f.tanggal_lahir ?? ""} onChange={(e) => set({ tanggal_lahir: e.target.value })} className="form-inp" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Pendidikan"><select value={f.pendidikan ?? ""} onChange={(e) => set({ pendidikan: e.target.value })} className="form-inp"><option value="">—</option>{PENDIDIKAN_LIST.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Pekerjaan"><input value={f.pekerjaan ?? ""} onChange={(e) => set({ pekerjaan: e.target.value })} className="form-inp" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Status Dalam Keluarga"><select value={f.status_keluarga ?? ""} onChange={(e) => set({ status_keluarga: e.target.value })} className="form-inp">{STATUS_KELUARGA_LIST.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Status Perkawinan"><select value={f.status_perkawinan ?? ""} onChange={(e) => set({ status_perkawinan: e.target.value })} className="form-inp">{STATUS_PERKAWINAN_LIST.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="Status Warga">
        <select value={f.status_warga} onChange={(e) => set({ status_warga: e.target.value as StatusWarga })} className="form-inp">
          {STATUS_WARGA.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="No. HP"><input value={f.no_hp ?? ""} onChange={(e) => set({ no_hp: e.target.value })} className="form-inp" /></Field>
      <Field label="Foto Warga (opsional)">
        <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="form-inp" />
      </Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : "Simpan"}</SubmitBtn>
    </form>
  );
}

function AnggotaDetail({ a, kk }: { a: Anggota; kk: KK | null }) {
  const url = useSignedUrl(a.foto_url);
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 rounded-2xl bg-muted grid place-items-center overflow-hidden shrink-0">
          {url ? <img src={url} alt={a.nama} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <div className="font-bold">{a.nama}</div>
          <div className="text-xs text-muted-foreground">NIK {a.nik}</div>
          <div className="mt-1"><StatusBadge status={a.status_warga} /></div>
        </div>
      </div>
      <DetailRow label="KK" value={kk ? `${kk.nomor_kk} · ${kk.kepala_keluarga}` : "-"} />
      <DetailRow label="Jenis Kelamin" value={a.jenis_kelamin} />
      <DetailRow label="Tempat / Tgl Lahir" value={`${a.tempat_lahir ?? "-"}, ${a.tanggal_lahir ? tanggal(a.tanggal_lahir) : "-"}`} />
      <DetailRow label="Agama" value={a.agama ?? "-"} />
      <DetailRow label="Pendidikan" value={a.pendidikan ?? "-"} />
      <DetailRow label="Pekerjaan" value={a.pekerjaan ?? "-"} />
      <DetailRow label="Status Keluarga" value={a.status_keluarga ?? "-"} />
      <DetailRow label="Status Perkawinan" value={a.status_perkawinan ?? "-"} />
      <DetailRow label="No. HP" value={a.no_hp ?? "-"} />
    </div>
  );
}

function KKDetail({ k, anggota }: { k: KK; anggota: Anggota[] }) {
  const url = useSignedUrl(k.foto_kk_url);
  return (
    <div className="space-y-3 text-sm">
      {url && <img src={url} alt="KK" className="w-full rounded-2xl" />}
      <DetailRow label="No. KK" value={k.nomor_kk} />
      <DetailRow label="Kepala Keluarga" value={k.kepala_keluarga} />
      <DetailRow label="Alamat" value={k.alamat} />
      <DetailRow label="RT / RW" value={`${k.rt ?? "-"} / ${k.rw ?? "-"}`} />
      <DetailRow label="WhatsApp" value={k.no_wa ?? "-"} />
      <DetailRow label="Status" value={k.status_kk} />
      <div className="pt-2">
        <div className="text-xs font-semibold text-muted-foreground mb-1">Anggota ({anggota.length}/8)</div>
        {anggota.length === 0 ? (
          <div className="text-xs text-muted-foreground">Belum ada anggota.</div>
        ) : (
          <ul className="space-y-1">
            {anggota.map((a) => (
              <li key={a.id} className="glass rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="truncate">{a.nama}</span>
                <span className="text-[10px] text-muted-foreground">{a.status_keluarga ?? "-"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value}</span>
    </div>
  );
}

export function PageHeader({ title, desc, icon: Icon }: { title: string; desc: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="glass-strong rounded-3xl p-4 flex items-center gap-3">
      <div className="h-12 w-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground shadow-glow shrink-0">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg font-bold leading-tight truncate">{title}</h1>
        <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
      </div>
    </div>
  );
}

export function DataTable({ headers, rows, empty, action }: { headers: React.ReactNode[]; rows: React.ReactNode[][]; empty: string; action?: React.ReactNode }) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-3">
        <div className="text-sm font-semibold">{empty}</div>
        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">Tidak ada data yang tersedia. Mulai dengan menambahkan data baru.</p>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="border-b border-border/60">{headers.map((h, i) => <th key={i} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-border/40 last:border-0">{r.map((c, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md glass-strong rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-bold">{title}</div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-xl hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}

export function SubmitBtn({ children }: { children: React.ReactNode }) {
  return <button type="submit" className="w-full rounded-2xl gradient-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-glow">{children}</button>;
}

export function LoginRequired({ modul }: { modul: string }) {
  return (
    <div className="max-w-md mx-auto mt-6 glass-strong rounded-3xl p-6 text-center space-y-3">
      <div className="h-14 w-14 mx-auto rounded-2xl gradient-primary grid place-items-center text-primary-foreground shadow-glow">
        <Home className="h-7 w-7" />
      </div>
      <div className="text-base font-bold">Modul {modul} terkunci</div>
      <p className="text-xs text-muted-foreground">Hanya pengurus yang dapat membuka modul ini. Silakan login menggunakan PIN.</p>
      <Link to="/login" className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-glow">Login Pengurus</Link>
    </div>
  );
}
