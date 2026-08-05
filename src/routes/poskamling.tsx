import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, LayoutDashboard, CalendarDays, ClipboardCheck, AlertTriangle,
  Boxes, Users, History, Plus, Pencil, Trash2, Search, Loader2, LogIn, LogOut,
  BellRing, Image as ImageIcon,
} from "lucide-react";
import { tanggal } from "@/lib/storage";
import { useAuth, type Role } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, DataTable, Modal, Field, SubmitBtn } from "./warga";

export const Route = createFileRoute("/poskamling")({
  head: () => ({
    meta: [
      { title: "Poskamling — SiRT 06 Digital" },
      { name: "description", content: "Jadwal ronda, absensi petugas, laporan keamanan, dan inventaris Poskamling RT 06 Bogeman Wetan." },
      { property: "og:title", content: "Poskamling — SiRT 06 Digital" },
      { property: "og:description", content: "Kelola jadwal ronda malam, absensi, dan laporan keamanan RT 06." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PoskamlingPage,
});

const BUCKET = "poskamling-foto";
const REGU = ["Regu 1", "Regu 2", "Regu 3", "Regu 4", "Regu 5"];
const TINGKAT = ["Ringan", "Sedang", "Berat", "Darurat"] as const;
const STATUS_LAPORAN = ["Baru", "Diproses", "Selesai"] as const;
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const TABS = [
  { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { k: "jadwal", label: "Jadwal Ronda", icon: CalendarDays },
  { k: "absensi", label: "Absensi", icon: ClipboardCheck },
  { k: "laporan", label: "Laporan Keamanan", icon: AlertTriangle },
  { k: "inventaris", label: "Inventaris", icon: Boxes },
  { k: "petugas", label: "Mutasi Petugas", icon: Users },
  { k: "riwayat", label: "Riwayat Kegiatan", icon: History },
] as const;
type TabKey = (typeof TABS)[number]["k"];

interface Petugas {
  id: string; nama: string; regu: string; no_hp: string | null;
  aktif: boolean; keterangan: string | null; created_at: string;
}
interface Jadwal {
  id: string; tanggal: string; hari: string; jam_mulai: string; jam_selesai: string;
  regu: string; petugas_1: string; petugas_2: string | null; petugas_cadangan: string | null;
  catatan: string | null; created_at: string;
}
interface Absensi {
  id: string; jadwal_id: string | null; tanggal: string; petugas_nama: string;
  status: string; jam_masuk: string | null; jam_pulang: string | null;
  lokasi: string | null; foto_url: string | null; catatan: string | null; created_at: string;
}
interface Laporan {
  id: string; judul: string; deskripsi: string; foto_url: string | null; lokasi: string | null;
  tingkat: string; status: string; tanggal: string; pelapor_nama: string | null;
  tindak_lanjut: string | null; created_at: string;
}
interface Barang { id: string; kode: string; nama: string; kategori: string; jumlah: number; satuan: string; kondisi: string; lokasi: string | null }
interface PosInv { id: string; inventaris_id: string; jumlah: number; catatan: string | null; created_at: string }

function canManage(role?: Role | null) {
  return role === "Admin" || role === "Bendahara" || role === "Super Admin";
}
function canDelete(role?: Role | null) {
  return role === "Super Admin";
}
const todayISO = () => new Date().toISOString().slice(0, 10);
const jamNow = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
const namaHari = (iso: string) => HARI[new Date(`${iso}T00:00:00`).getDay()] ?? "";

async function uploadFoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `pos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

function Empty({ text = "Belum ada data Poskamling." }: { text?: string }) {
  return (
    <div className="glass rounded-2xl p-8 text-center space-y-2">
      <div className="text-sm font-semibold">{text}</div>
      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">Data akan tampil di sini setelah pengurus menambahkannya.</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-sm sm:text-base font-bold tabular-nums break-words ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function Badge({ text, tone }: { text: string; tone: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tone}`}>{text}</span>;
}
const toneStatusLaporan = (s: string) =>
  s === "Selesai" ? "bg-success/15 text-success" : s === "Diproses" ? "bg-warning/20 text-warning" : "bg-primary/15 text-primary";
const toneTingkat = (t: string) =>
  t === "Darurat" || t === "Berat" ? "bg-destructive/15 text-destructive" : t === "Sedang" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground";

function PoskamlingPage() {
  const { user, logAction } = useAuth();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [absensi, setAbsensi] = useState<Absensi[]>([]);
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [posInv, setPosInv] = useState<PosInv[]>([]);
  const [wargaNama, setWargaNama] = useState<string[]>([]);

  const [q, setQ] = useState("");
  const [fRegu, setFRegu] = useState("Semua");
  const [fStatus, setFStatus] = useState("Semua");

  const [modal, setModal] = useState<null | { kind: "jadwal" | "absensi" | "laporan" | "petugas" | "pilihBarang"; data?: unknown }>(null);
  const [fotoDetail, setFotoDetail] = useState<string | null>(null);

  const manage = canManage(user?.role);
  const del = canDelete(user?.role);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [p, j, a, l, b, pi, w] = await Promise.all([
        supabase.from("poskamling_petugas").select("*").order("nama"),
        supabase.from("poskamling_jadwal").select("*").order("tanggal", { ascending: false }),
        supabase.from("poskamling_absensi").select("*").order("tanggal", { ascending: false }),
        supabase.from("poskamling_laporan").select("*").order("created_at", { ascending: false }),
        supabase.from("inventaris").select("id,kode,nama,kategori,jumlah,satuan,kondisi,lokasi").order("nama"),
        supabase.from("poskamling_inventaris").select("*").order("created_at", { ascending: false }),
        supabase.from("anggota_keluarga").select("nama").order("nama"),
      ]);
      for (const r of [p, j, a, l, b, pi, w]) if (r.error) throw r.error;
      setPetugas((p.data ?? []) as unknown as Petugas[]);
      setJadwal((j.data ?? []) as unknown as Jadwal[]);
      setAbsensi((a.data ?? []) as unknown as Absensi[]);
      setLaporan((l.data ?? []) as unknown as Laporan[]);
      setBarang((b.data ?? []) as unknown as Barang[]);
      setPosInv((pi.data ?? []) as unknown as PosInv[]);
      setWargaNama(((w.data ?? []) as { nama: string }[]).map((x) => x.nama));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat data Poskamling");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const today = todayISO();
  const besok = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const jadwalHariIni = useMemo(() => jadwal.filter((j) => j.tanggal === today), [jadwal, today]);
  const jadwalBesok = useMemo(() => jadwal.filter((j) => j.tanggal === besok), [jadwal, besok]);
  const jadwalBerikutnya = useMemo(
    () => [...jadwal].filter((j) => j.tanggal >= today).sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0] ?? null,
    [jadwal, today],
  );

  const petugasMalamIni = useMemo(() => {
    const set = new Set<string>();
    jadwalHariIni.forEach((j) => {
      [j.petugas_1, j.petugas_2, j.petugas_cadangan].forEach((n) => { if (n) set.add(n); });
    });
    return [...set];
  }, [jadwalHariIni]);

  const absensiHariIni = useMemo(() => absensi.filter((a) => a.tanggal === today), [absensi, today]);
  const hadirHariIni = useMemo(() => absensiHariIni.filter((a) => a.status === "Hadir").length, [absensiHariIni]);
  const tidakHadir = Math.max(petugasMalamIni.length - hadirHariIni, 0);

  const bulanIni = today.slice(0, 7);
  const statBulan = useMemo(() => {
    const rows = absensi.filter((a) => a.tanggal.startsWith(bulanIni));
    const hadir = rows.filter((a) => a.status === "Hadir").length;
    return { total: rows.length, hadir, izin: rows.filter((a) => a.status === "Izin").length, alpa: rows.filter((a) => a.status === "Tidak Hadir").length,
      persen: rows.length ? Math.round((hadir / rows.length) * 100) : 0 };
  }, [absensi, bulanIni]);

  // ---- mutations
  const simpanJadwal = async (d: Record<string, unknown>, id?: string) => {
    const payload = { ...d, hari: namaHari(String(d["tanggal"])), dibuat_oleh: user?.nama ?? null };
    const res = id
      ? await supabase.from("poskamling_jadwal").update(payload as never).eq("id", id)
      : await supabase.from("poskamling_jadwal").insert(payload as never);
    if (res.error) throw res.error;
    logAction(id ? "Edit jadwal ronda" : "Tambah jadwal ronda", "Poskamling", String(d["petugas_1"] ?? ""));
    await load();
  };
  const hapus = async (table: "poskamling_jadwal" | "poskamling_laporan" | "poskamling_petugas" | "poskamling_absensi" | "poskamling_inventaris", id: string, label: string) => {
    if (!confirm(`Hapus data "${label}"?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { alert(error.message); return; }
    logAction("Hapus data", "Poskamling", label);
    await load();
  };
  const checkIn = async (nama: string, jadwalId: string | null) => {
    const { error } = await supabase.from("poskamling_absensi").insert({
      jadwal_id: jadwalId, tanggal: today, petugas_nama: nama, status: "Hadir", jam_masuk: jamNow(),
    } as never);
    if (error) { alert(error.message); return; }
    logAction("Check in ronda", "Poskamling", nama);
    await load();
  };
  const checkOut = async (a: Absensi) => {
    const { error } = await supabase.from("poskamling_absensi").update({ jam_pulang: jamNow() } as never).eq("id", a.id);
    if (error) { alert(error.message); return; }
    logAction("Check out ronda", "Poskamling", a.petugas_nama);
    await load();
  };
  const ubahStatusLaporan = async (l: Laporan, status: string) => {
    const { error } = await supabase.from("poskamling_laporan").update({ status } as never).eq("id", l.id);
    if (error) { alert(error.message); return; }
    logAction("Ubah status laporan", "Poskamling", `${l.judul} → ${status}`);
    await load();
  };
  const toggleAktif = async (p: Petugas) => {
    const { error } = await supabase.from("poskamling_petugas").update({ aktif: !p.aktif } as never).eq("id", p.id);
    if (error) { alert(error.message); return; }
    logAction(p.aktif ? "Nonaktifkan petugas" : "Aktifkan petugas", "Poskamling", p.nama);
    await load();
  };

  const namaPetugasOpsi = useMemo(() => {
    const set = new Set<string>([...petugas.filter((p) => p.aktif).map((p) => p.nama), ...wargaNama]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [petugas, wargaNama]);

  const key = q.trim().toLowerCase();
  const jadwalFiltered = useMemo(() => jadwal.filter((j) => {
    if (fRegu !== "Semua" && j.regu !== fRegu) return false;
    if (!key) return true;
    return [j.petugas_1, j.petugas_2 ?? "", j.petugas_cadangan ?? "", j.regu, j.tanggal].some((v) => v.toLowerCase().includes(key));
  }), [jadwal, fRegu, key]);

  const laporanFiltered = useMemo(() => laporan.filter((l) => {
    if (fStatus !== "Semua" && l.status !== fStatus) return false;
    if (!key) return true;
    return [l.judul, l.deskripsi, l.lokasi ?? ""].some((v) => v.toLowerCase().includes(key));
  }), [laporan, fStatus, key]);

  const riwayat = useMemo(() => {
    type Item = { waktu: string; jenis: string; judul: string; detail: string };
    const items: Item[] = [
      ...jadwal.map((j) => ({ waktu: j.created_at, jenis: "Jadwal", judul: `${j.regu} — ${tanggal(j.tanggal)}`, detail: `${j.jam_mulai}–${j.jam_selesai} · ${j.petugas_1}` })),
      ...absensi.map((a) => ({ waktu: a.created_at, jenis: "Absensi", judul: a.petugas_nama, detail: `${a.status} · masuk ${a.jam_masuk ?? "-"} · pulang ${a.jam_pulang ?? "-"}` })),
      ...laporan.map((l) => ({ waktu: l.created_at, jenis: "Laporan", judul: l.judul, detail: `${l.tingkat} · ${l.status}` })),
    ];
    return items.sort((a, b) => b.waktu.localeCompare(a.waktu)).slice(0, 100);
  }, [jadwal, absensi, laporan]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-4">
      <PageHeader title="Poskamling" desc="Jadwal ronda, absensi, laporan keamanan & inventaris pos" icon={ShieldCheck} />

      {manage && jadwalBesok.length > 0 && (
        <div className="glass rounded-2xl p-3 flex items-start gap-2 border border-warning/40">
          <BellRing className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold">Pengingat H-1:</span>{" "}
            Ronda besok ({tanggal(besok)}) — {jadwalBesok.map((j) => `${j.regu}: ${j.petugas_1}${j.petugas_2 ? ` & ${j.petugas_2}` : ""}`).join(" · ")}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => { setTab(t.k); setQ(""); }}
            className={`inline-flex items-center gap-1.5 shrink-0 min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold ${tab === t.k ? "gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {err && <div className="glass rounded-2xl p-3 text-xs text-destructive">{err}</div>}
      {loading && <div className="glass rounded-2xl p-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}

      {!loading && tab === "dashboard" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Petugas Malam Ini" value={petugasMalamIni.length} />
            <Stat label="Hadir" value={hadirHariIni} tone="text-success" />
            <Stat label="Tidak Hadir" value={tidakHadir} tone="text-destructive" />
            <Stat label="Kehadiran Bulan Ini" value={`${statBulan.persen}%`} />
          </div>

          <div className="glass rounded-2xl p-4 space-y-2">
            <div className="text-sm font-semibold">Petugas Ronda Malam Ini</div>
            {petugasMalamIni.length === 0
              ? <p className="text-xs text-muted-foreground">Belum ada jadwal ronda untuk hari ini.</p>
              : <div className="flex flex-wrap gap-1.5">{petugasMalamIni.map((n) => <span key={n} className="px-2.5 py-1 rounded-full glass text-xs font-medium">{n}</span>)}</div>}
          </div>

          <div className="glass rounded-2xl p-4 space-y-1">
            <div className="text-sm font-semibold">Jadwal Ronda Berikutnya</div>
            {jadwalBerikutnya ? (
              <p className="text-xs text-muted-foreground">
                {tanggal(jadwalBerikutnya.tanggal)} · {jadwalBerikutnya.jam_mulai}–{jadwalBerikutnya.jam_selesai} · {jadwalBerikutnya.regu} —{" "}
                {jadwalBerikutnya.petugas_1}{jadwalBerikutnya.petugas_2 ? ` & ${jadwalBerikutnya.petugas_2}` : ""}
              </p>
            ) : <p className="text-xs text-muted-foreground">Belum ada jadwal ronda mendatang.</p>}
          </div>

          <div className="glass rounded-2xl p-4 space-y-2">
            <div className="text-sm font-semibold">Statistik Kehadiran Bulan Ini</div>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Total" value={statBulan.total} />
              <Stat label="Hadir" value={statBulan.hadir} tone="text-success" />
              <Stat label="Izin" value={statBulan.izin} tone="text-warning" />
              <Stat label="Alpa" value={statBulan.alpa} tone="text-destructive" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 space-y-2">
            <div className="text-sm font-semibold">Laporan Keamanan Terbaru</div>
            {laporan.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada data Poskamling.</p> : (
              <ul className="space-y-1.5">
                {laporan.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-xs border-b border-border/40 last:border-0 pb-1.5 last:pb-0">
                    <span className="min-w-0 truncate">{l.judul} <span className="text-muted-foreground">· {tanggal(l.tanggal)}</span></span>
                    <Badge text={l.status} tone={toneStatusLaporan(l.status)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && (tab === "jadwal" || tab === "laporan") && (
        <div className="glass rounded-2xl p-3 space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "jadwal" ? "Cari petugas / regu / tanggal…" : "Cari judul / lokasi…"} className="form-inp pl-9" />
          </div>
          {tab === "jadwal" ? (
            <select value={fRegu} onChange={(e) => setFRegu(e.target.value)} className="form-inp">
              <option>Semua</option>{REGU.map((r) => <option key={r}>{r}</option>)}
            </select>
          ) : (
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="form-inp">
              <option>Semua</option>{STATUS_LAPORAN.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>
      )}

      {!loading && tab === "jadwal" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{jadwalFiltered.length} jadwal</div>
            {manage && (
              <button onClick={() => setModal({ kind: "jadwal" })} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Tambah Jadwal
              </button>
            )}
          </div>
          {jadwalFiltered.length === 0 ? <Empty /> : (
            <DataTable
              headers={["Hari", "Tanggal", "Jam", "Regu", "Petugas 1", "Petugas 2", "Cadangan", "Catatan", ""]}
              rows={jadwalFiltered.map((j) => [
                j.hari || namaHari(j.tanggal),
                tanggal(j.tanggal),
                `${j.jam_mulai}–${j.jam_selesai}`,
                j.regu,
                j.petugas_1,
                j.petugas_2 || "-",
                j.petugas_cadangan || "-",
                j.catatan || "-",
                <div key="a" className="flex gap-1">
                  {manage && <button onClick={() => setModal({ kind: "jadwal", data: j })} className="p-1.5 rounded-lg hover:bg-accent" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
                  {del && <button onClick={() => void hapus("poskamling_jadwal", j.id, `${j.regu} ${j.tanggal}`)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>,
              ])}
              empty="Belum ada data Poskamling."
            />
          )}
        </div>
      )}

      {!loading && tab === "absensi" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Absensi {tanggal(today)}</div>
            {manage && (
              <button onClick={() => setModal({ kind: "absensi" })} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Absensi Manual
              </button>
            )}
          </div>

          {manage && petugasMalamIni.length > 0 && (
            <div className="glass rounded-2xl p-3 space-y-2">
              <div className="text-xs font-semibold">Check In Cepat — Petugas Malam Ini</div>
              <div className="flex flex-wrap gap-1.5">
                {petugasMalamIni.map((n) => {
                  const sudah = absensiHariIni.find((a) => a.petugas_nama === n);
                  return (
                    <button key={n} disabled={!!sudah}
                      onClick={() => void checkIn(n, jadwalHariIni[0]?.id ?? null)}
                      className={`inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl text-xs font-semibold ${sudah ? "glass opacity-60" : "gradient-primary text-primary-foreground shadow-glow"}`}>
                      <LogIn className="h-3.5 w-3.5" /> {n}{sudah ? ` · ${sudah.jam_masuk ?? "hadir"}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {absensi.length === 0 ? <Empty /> : (
            <DataTable
              headers={["Tanggal", "Petugas", "Status", "Jam Masuk", "Jam Pulang", "Lokasi", "Foto", "Catatan", ""]}
              rows={absensi.map((a) => [
                tanggal(a.tanggal),
                a.petugas_nama,
                <Badge key="s" text={a.status} tone={a.status === "Hadir" ? "bg-success/15 text-success" : a.status === "Izin" ? "bg-warning/20 text-warning" : "bg-destructive/15 text-destructive"} />,
                a.jam_masuk || "-",
                a.jam_pulang || "-",
                a.lokasi || "-",
                a.foto_url ? <button key="f" onClick={() => setFotoDetail(a.foto_url)} className="p-1.5 rounded-lg hover:bg-accent"><ImageIcon className="h-3.5 w-3.5" /></button> : "-",
                a.catatan || "-",
                <div key="a" className="flex gap-1">
                  {manage && !a.jam_pulang && <button onClick={() => void checkOut(a)} className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25" title="Check out"><LogOut className="h-3.5 w-3.5" /></button>}
                  {del && <button onClick={() => void hapus("poskamling_absensi", a.id, a.petugas_nama)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>,
              ])}
              empty="Belum ada data Poskamling."
            />
          )}
        </div>
      )}

      {!loading && tab === "laporan" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{laporanFiltered.length} laporan</div>
            {manage && (
              <button onClick={() => setModal({ kind: "laporan" })} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Buat Laporan
              </button>
            )}
          </div>
          {laporanFiltered.length === 0 ? <Empty /> : (
            <DataTable
              headers={["Tanggal", "Judul", "Lokasi", "Tingkat", "Status", "Foto", "Pelapor", ""]}
              rows={laporanFiltered.map((l) => [
                tanggal(l.tanggal),
                <span key="j" className="font-medium">{l.judul}</span>,
                l.lokasi || "-",
                <Badge key="t" text={l.tingkat} tone={toneTingkat(l.tingkat)} />,
                manage ? (
                  <select key="s" value={l.status} onChange={(e) => void ubahStatusLaporan(l, e.target.value)} className="form-inp !py-1 !text-[11px]">
                    {STATUS_LAPORAN.map((s) => <option key={s}>{s}</option>)}
                  </select>
                ) : <Badge key="s" text={l.status} tone={toneStatusLaporan(l.status)} />,
                l.foto_url ? <button key="f" onClick={() => setFotoDetail(l.foto_url)} className="p-1.5 rounded-lg hover:bg-accent"><ImageIcon className="h-3.5 w-3.5" /></button> : "-",
                l.pelapor_nama || "-",
                <div key="a" className="flex gap-1">
                  {manage && <button onClick={() => setModal({ kind: "laporan", data: l })} className="p-1.5 rounded-lg hover:bg-accent" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
                  {del && <button onClick={() => void hapus("poskamling_laporan", l.id, l.judul)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>,
              ])}
              empty="Belum ada data Poskamling."
            />
          )}
        </div>
      )}

      {!loading && tab === "inventaris" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{posInv.length} barang di Poskamling</div>
            {manage && (
              <button onClick={() => setModal({ kind: "pilihBarang" })} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Pilih Barang
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Data barang diambil dari Modul Inventaris RT. Petugas hanya memilih barang yang ada di Poskamling.</p>
          {posInv.length === 0 ? <Empty /> : (
            <DataTable
              headers={["Kode", "Nama Barang", "Kategori", "Jumlah di Pos", "Kondisi", "Catatan", ""]}
              rows={posInv.map((pi) => {
                const b = barang.find((x) => x.id === pi.inventaris_id);
                return [
                  <span key="k" className="font-mono text-[11px]">{b?.kode ?? "-"}</span>,
                  b?.nama ?? "-",
                  b?.kategori ?? "-",
                  `${pi.jumlah} ${b?.satuan ?? "Unit"}`,
                  b?.kondisi ?? "-",
                  pi.catatan || "-",
                  manage ? <button key="a" onClick={() => void hapus("poskamling_inventaris", pi.id, b?.nama ?? "barang")} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Keluarkan dari pos"><Trash2 className="h-3.5 w-3.5" /></button> : null,
                ];
              })}
              empty="Belum ada data Poskamling."
            />
          )}
        </div>
      )}

      {!loading && tab === "petugas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{petugas.length} petugas</div>
            {manage && (
              <button onClick={() => setModal({ kind: "petugas" })} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Tambah Petugas
              </button>
            )}
          </div>
          {petugas.length === 0 ? <Empty /> : (
            <DataTable
              headers={["Nama", "Regu", "No. HP", "Status", "Keterangan", ""]}
              rows={petugas.map((p) => [
                p.nama, p.regu, p.no_hp || "-",
                <Badge key="s" text={p.aktif ? "Aktif" : "Nonaktif"} tone={p.aktif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"} />,
                p.keterangan || "-",
                <div key="a" className="flex gap-1">
                  {manage && <button onClick={() => setModal({ kind: "petugas", data: p })} className="p-1.5 rounded-lg hover:bg-accent" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
                  {manage && <button onClick={() => void toggleAktif(p)} className="px-2 py-1 rounded-lg glass text-[10px] font-semibold">{p.aktif ? "Nonaktifkan" : "Aktifkan"}</button>}
                  {del && <button onClick={() => void hapus("poskamling_petugas", p.id, p.nama)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>,
              ])}
              empty="Belum ada data Poskamling."
            />
          )}
        </div>
      )}

      {!loading && tab === "riwayat" && (
        riwayat.length === 0 ? <Empty /> : (
          <DataTable
            headers={["Waktu", "Jenis", "Keterangan", "Detail"]}
            rows={riwayat.map((r) => [
              new Date(r.waktu).toLocaleString("id-ID"),
              <Badge key="j" text={r.jenis} tone="bg-primary/15 text-primary" />,
              r.judul,
              r.detail,
            ])}
            empty="Belum ada data Poskamling."
          />
        )
      )}

      {modal?.kind === "jadwal" && manage && (
        <Modal title={modal.data ? "Edit Jadwal Ronda" : "Tambah Jadwal Ronda"} onClose={() => setModal(null)}>
          <JadwalForm initial={modal.data as Jadwal | undefined} nama={namaPetugasOpsi}
            onSubmit={async (d) => { await simpanJadwal(d, (modal.data as Jadwal | undefined)?.id); setModal(null); }} />
        </Modal>
      )}

      {modal?.kind === "absensi" && manage && (
        <Modal title="Absensi Ronda" onClose={() => setModal(null)}>
          <AbsensiForm nama={namaPetugasOpsi} jadwalHariIni={jadwalHariIni}
            onSubmit={async (d, file) => {
              let foto: string | null = null;
              if (file) foto = await uploadFoto(file);
              const { error } = await supabase.from("poskamling_absensi").insert({ ...d, foto_url: foto } as never);
              if (error) throw error;
              logAction("Input absensi ronda", "Poskamling", String(d["petugas_nama"] ?? ""));
              setModal(null);
              await load();
            }} />
        </Modal>
      )}

      {modal?.kind === "laporan" && manage && (
        <Modal title={modal.data ? "Edit Laporan Keamanan" : "Laporan Keamanan"} onClose={() => setModal(null)}>
          <LaporanForm initial={modal.data as Laporan | undefined} pelapor={user?.nama ?? ""}
            onSubmit={async (d, file) => {
              const cur = modal.data as Laporan | undefined;
              let foto = cur?.foto_url ?? null;
              if (file) foto = await uploadFoto(file);
              const res = cur
                ? await supabase.from("poskamling_laporan").update({ ...d, foto_url: foto } as never).eq("id", cur.id)
                : await supabase.from("poskamling_laporan").insert({ ...d, foto_url: foto } as never);
              if (res.error) throw res.error;
              logAction(cur ? "Edit laporan keamanan" : "Tambah laporan keamanan", "Poskamling", String(d["judul"] ?? ""));
              setModal(null);
              await load();
            }} />
        </Modal>
      )}

      {modal?.kind === "petugas" && manage && (
        <Modal title={modal.data ? "Edit Petugas" : "Tambah Petugas"} onClose={() => setModal(null)}>
          <PetugasForm initial={modal.data as Petugas | undefined} nama={wargaNama}
            onSubmit={async (d) => {
              const cur = modal.data as Petugas | undefined;
              const res = cur
                ? await supabase.from("poskamling_petugas").update(d as never).eq("id", cur.id)
                : await supabase.from("poskamling_petugas").insert(d as never);
              if (res.error) throw res.error;
              logAction(cur ? "Edit petugas poskamling" : "Tambah petugas poskamling", "Poskamling", String(d["nama"] ?? ""));
              setModal(null);
              await load();
            }} />
        </Modal>
      )}

      {modal?.kind === "pilihBarang" && manage && (
        <Modal title="Pilih Barang dari Inventaris RT" onClose={() => setModal(null)}>
          <PilihBarangForm barang={barang.filter((b) => !posInv.some((p) => p.inventaris_id === b.id))}
            onSubmit={async (d) => {
              const { error } = await supabase.from("poskamling_inventaris").insert({ ...d, ditambah_oleh: user?.nama ?? null } as never);
              if (error) throw error;
              logAction("Tambah inventaris poskamling", "Poskamling", String(d["inventaris_id"] ?? ""));
              setModal(null);
              await load();
            }} />
        </Modal>
      )}

      {fotoDetail && (
        <Modal title="Foto" onClose={() => setFotoDetail(null)}>
          <FotoView path={fotoDetail} />
        </Modal>
      )}
    </div>
  );
}

function FotoView({ path }: { path: string }) {
  const url = useSignedUrl(path);
  if (!url) return <div className="h-40 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  return <img src={url} alt="Dokumentasi Poskamling" loading="lazy" className="w-full rounded-2xl" />;
}

function NamaInput({ value, onChange, list, required }: { value: string; onChange: (v: string) => void; list: string[]; required?: boolean }) {
  const id = `nm-${list.length}-${required ? "r" : "o"}`;
  return (
    <>
      <input required={required} value={value} onChange={(e) => onChange(e.target.value)} list={id} className="form-inp" placeholder="Ketik atau pilih nama warga" />
      <datalist id={id}>{list.map((n) => <option key={n} value={n} />)}</datalist>
    </>
  );
}

function JadwalForm({ initial, nama, onSubmit }: { initial?: Jadwal; nama: string[]; onSubmit: (d: Record<string, unknown>) => Promise<void> }) {
  const [tgl, setTgl] = useState(initial?.tanggal ?? todayISO());
  const [mulai, setMulai] = useState(initial?.jam_mulai ?? "20:00");
  const [selesai, setSelesai] = useState(initial?.jam_selesai ?? "00:00");
  const [regu, setRegu] = useState(initial?.regu ?? REGU[0]!);
  const [p1, setP1] = useState(initial?.petugas_1 ?? "");
  const [p2, setP2] = useState(initial?.petugas_2 ?? "");
  const [pc, setPc] = useState(initial?.petugas_cadangan ?? "");
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!p1.trim()) return;
      setBusy(true); setError(null);
      try {
        await onSubmit({ tanggal: tgl, jam_mulai: mulai, jam_selesai: selesai, regu, petugas_1: p1.trim(), petugas_2: p2 || null, petugas_cadangan: pc || null, catatan: catatan || null });
      } catch (er) { setError(er instanceof Error ? er.message : "Gagal menyimpan"); } finally { setBusy(false); }
    }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tanggal"><input required type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="form-inp" /></Field>
        <Field label="Hari"><input readOnly value={namaHari(tgl)} className="form-inp opacity-70" /></Field>
        <Field label="Jam Mulai"><input required type="time" value={mulai} onChange={(e) => setMulai(e.target.value)} className="form-inp" /></Field>
        <Field label="Jam Selesai"><input required type="time" value={selesai} onChange={(e) => setSelesai(e.target.value)} className="form-inp" /></Field>
      </div>
      <Field label="Regu"><select value={regu} onChange={(e) => setRegu(e.target.value)} className="form-inp">{REGU.map((r) => <option key={r}>{r}</option>)}</select></Field>
      <Field label="Petugas 1"><NamaInput required value={p1} onChange={setP1} list={nama} /></Field>
      <Field label="Petugas 2"><NamaInput value={p2} onChange={setP2} list={nama} /></Field>
      <Field label="Petugas Cadangan"><NamaInput value={pc} onChange={setPc} list={nama} /></Field>
      <Field label="Catatan"><textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} className="form-inp" /></Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : initial ? "Simpan Perubahan" : "Simpan Jadwal"}</SubmitBtn>
    </form>
  );
}

function AbsensiForm({ nama, jadwalHariIni, onSubmit }: { nama: string[]; jadwalHariIni: Jadwal[]; onSubmit: (d: Record<string, unknown>, file: File | null) => Promise<void> }) {
  const [petugasNama, setNama] = useState("");
  const [status, setStatus] = useState("Hadir");
  const [tgl, setTgl] = useState(todayISO());
  const [masuk, setMasuk] = useState(jamNow());
  const [pulang, setPulang] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!petugasNama.trim()) return;
      setBusy(true); setError(null);
      try {
        await onSubmit({
          jadwal_id: jadwalHariIni[0]?.id ?? null, tanggal: tgl, petugas_nama: petugasNama.trim(), status,
          jam_masuk: masuk || null, jam_pulang: pulang || null, lokasi: lokasi || null, catatan: catatan || null,
        }, file);
      } catch (er) { setError(er instanceof Error ? er.message : "Gagal menyimpan"); } finally { setBusy(false); }
    }}>
      <Field label="Nama Petugas"><NamaInput required value={petugasNama} onChange={setNama} list={nama} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tanggal"><input required type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="form-inp" /></Field>
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} className="form-inp"><option>Hadir</option><option>Izin</option><option>Tidak Hadir</option></select></Field>
        <Field label="Jam Masuk"><input type="time" value={masuk} onChange={(e) => setMasuk(e.target.value)} className="form-inp" /></Field>
        <Field label="Jam Pulang"><input type="time" value={pulang} onChange={(e) => setPulang(e.target.value)} className="form-inp" /></Field>
      </div>
      <Field label="Lokasi (opsional)"><input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className="form-inp" /></Field>
      <Field label="Foto (opsional)"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="form-inp" /></Field>
      <Field label="Catatan"><textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} className="form-inp" /></Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : "Simpan Absensi"}</SubmitBtn>
    </form>
  );
}

function LaporanForm({ initial, pelapor, onSubmit }: { initial?: Laporan; pelapor: string; onSubmit: (d: Record<string, unknown>, file: File | null) => Promise<void> }) {
  const [judul, setJudul] = useState(initial?.judul ?? "");
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? "");
  const [lokasi, setLokasi] = useState(initial?.lokasi ?? "");
  const [tingkat, setTingkat] = useState<string>(initial?.tingkat ?? TINGKAT[0]);
  const [status, setStatus] = useState<string>(initial?.status ?? STATUS_LAPORAN[0]);
  const [tgl, setTgl] = useState(initial?.tanggal ?? todayISO());
  const [tindak, setTindak] = useState(initial?.tindak_lanjut ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!judul.trim()) return;
      setBusy(true); setError(null);
      try {
        await onSubmit({
          judul: judul.trim(), deskripsi, lokasi: lokasi || null, tingkat, status, tanggal: tgl,
          pelapor_nama: initial?.pelapor_nama ?? pelapor, tindak_lanjut: tindak || null,
        }, file);
      } catch (er) { setError(er instanceof Error ? er.message : "Gagal menyimpan"); } finally { setBusy(false); }
    }}>
      <Field label="Judul Kejadian"><input required value={judul} onChange={(e) => setJudul(e.target.value)} className="form-inp" /></Field>
      <Field label="Deskripsi"><textarea rows={3} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className="form-inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tanggal"><input required type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="form-inp" /></Field>
        <Field label="Lokasi"><input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className="form-inp" /></Field>
        <Field label="Tingkat Kejadian"><select value={tingkat} onChange={(e) => setTingkat(e.target.value)} className="form-inp">{TINGKAT.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} className="form-inp">{STATUS_LAPORAN.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="Foto"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="form-inp" /></Field>
      <Field label="Tindak Lanjut"><textarea rows={2} value={tindak} onChange={(e) => setTindak(e.target.value)} className="form-inp" /></Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : initial ? "Simpan Perubahan" : "Simpan Laporan"}</SubmitBtn>
    </form>
  );
}

function PetugasForm({ initial, nama, onSubmit }: { initial?: Petugas; nama: string[]; onSubmit: (d: Record<string, unknown>) => Promise<void> }) {
  const [n, setN] = useState(initial?.nama ?? "");
  const [regu, setRegu] = useState(initial?.regu ?? REGU[0]!);
  const [hp, setHp] = useState(initial?.no_hp ?? "");
  const [aktif, setAktif] = useState(initial?.aktif ?? true);
  const [ket, setKet] = useState(initial?.keterangan ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!n.trim()) return;
      setBusy(true); setError(null);
      try {
        await onSubmit({ nama: n.trim(), regu, no_hp: hp || null, aktif, keterangan: ket || null });
      } catch (er) { setError(er instanceof Error ? er.message : "Gagal menyimpan"); } finally { setBusy(false); }
    }}>
      <Field label="Nama Petugas"><NamaInput required value={n} onChange={setN} list={nama} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Regu"><select value={regu} onChange={(e) => setRegu(e.target.value)} className="form-inp">{REGU.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="No. HP"><input value={hp} onChange={(e) => setHp(e.target.value)} className="form-inp" /></Field>
      </div>
      <Field label="Status"><select value={aktif ? "Aktif" : "Nonaktif"} onChange={(e) => setAktif(e.target.value === "Aktif")} className="form-inp"><option>Aktif</option><option>Nonaktif</option></select></Field>
      <Field label="Keterangan"><textarea rows={2} value={ket} onChange={(e) => setKet(e.target.value)} className="form-inp" /></Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : initial ? "Simpan Perubahan" : "Simpan Petugas"}</SubmitBtn>
    </form>
  );
}

function PilihBarangForm({ barang, onSubmit }: { barang: Barang[]; onSubmit: (d: Record<string, unknown>) => Promise<void> }) {
  const [id, setId] = useState(barang[0]?.id ?? "");
  const [jumlah, setJumlah] = useState("1");
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (barang.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-6">Tidak ada barang tersedia di Modul Inventaris RT. Tambahkan barang terlebih dahulu pada modul Inventaris.</div>;
  }

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!id) return;
      setBusy(true); setError(null);
      try { await onSubmit({ inventaris_id: id, jumlah: Number(jumlah) || 1, catatan: catatan || null }); }
      catch (er) { setError(er instanceof Error ? er.message : "Gagal menyimpan"); } finally { setBusy(false); }
    }}>
      <Field label="Barang (dari Inventaris RT)">
        <select required value={id} onChange={(e) => setId(e.target.value)} className="form-inp">
          {barang.map((b) => <option key={b.id} value={b.id}>{b.nama} — {b.kode} ({b.jumlah} {b.satuan})</option>)}
        </select>
      </Field>
      <Field label="Jumlah di Poskamling"><input required type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="form-inp" /></Field>
      <Field label="Catatan"><textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} className="form-inp" /></Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : "Simpan"}</SubmitBtn>
    </form>
  );
}
