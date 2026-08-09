import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes, Plus, Trash2, Search, Pencil, Eye, Loader2, Printer,
  FileSpreadsheet, FileText, CornerDownLeft, Image as ImageIcon,
} from "lucide-react";
import { tanggal, rupiah } from "@/lib/storage";
import { useAuth, type Role } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, DataTable, Modal, Field, SubmitBtn, LoginRequired } from "./warga";

export const Route = createFileRoute("/inventaris")({
  head: () => ({
    meta: [
      { title: "Inventaris RT — SiRT 06 Digital" },
      { name: "description", content: "Data barang inventaris RT 06 beserta kondisi, nilai, dan peminjaman." },
      { property: "og:title", content: "Inventaris RT — SiRT 06 Digital" },
      { property: "og:description", content: "Kelola aset dan peminjaman barang RT 06 Bogeman Wetan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventarisPage,
});

const BUCKET = "inventaris-foto";

const KATEGORI = [
  "Perkakas", "Peralatan Kerja Bakti", "Peralatan Poskamling", "Tenda & Terpal",
  "Meja & Kursi", "Sound System", "Peralatan Listrik", "Motor Tossa", "Inventaris Lainnya",
] as const;
const KONDISI = ["Baik", "Rusak Ringan", "Rusak Berat", "Hilang"] as const;
const SATUAN = ["Unit", "Buah", "Set", "Lembar", "Meter", "Pasang", "Paket"];
const SUMBER_DANA = ["Kas RT", "Kas Sosial", "Kas Perkakas", "Kas Motor Tossa", "Kas HUT RI", "Hibah/Bantuan", "Swadaya Warga", "Lainnya"];

type Kategori = (typeof KATEGORI)[number];
type Kondisi = (typeof KONDISI)[number];

interface Barang {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  merk: string | null;
  jumlah: number;
  satuan: string;
  kondisi: Kondisi;
  lokasi: string | null;
  tanggal_pembelian: string | null;
  sumber_dana: string | null;
  nilai: number;
  foto_url: string | null;
  keterangan: string | null;
  jumlah_tersedia: number;
  status: string;
  created_at: string;
}


interface Pinjam {
  id: string;
  inventaris_id: string;
  peminjam: string;
  jumlah: number;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  status: "Dipinjam" | "Dikembalikan";
  catatan: string | null;
  petugas_nama: string | null;
  created_at: string;
}

function canManage(role?: Role | null) {
  return role === "Admin" || role === "Bendahara" || role === "Super Admin";
}
function canDelete(role?: Role | null) {
  return role === "Super Admin";
}

async function uploadFoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `barang/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

function InventarisPage() {
  const { user, logAction } = useAuth();
  const [tab, setTab] = useState<"barang" | "pinjaman">("barang");
  const [barang, setBarang] = useState<Barang[]>([]);
  const [pinjaman, setPinjaman] = useState<Pinjam[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [fKat, setFKat] = useState<string>("Semua");
  const [fKon, setFKon] = useState<string>("Semua");
  const [fLok, setFLok] = useState("");
  const [fStatus, setFStatus] = useState<string>("Semua");

  const [showBarang, setShowBarang] = useState(false);
  const [editBarang, setEditBarang] = useState<Barang | null>(null);
  const [detail, setDetail] = useState<Barang | null>(null);
  const [showPinjam, setShowPinjam] = useState(false);

  const manage = canManage(user?.role);
  const del = canDelete(user?.role);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [b, p] = await Promise.all([
        supabase.from("inventaris").select("*").order("created_at", { ascending: false }),
        supabase.from("peminjaman_inventaris").select("*").order("created_at", { ascending: false }),
      ]);
      if (b.error) throw b.error;
      if (p.error) throw p.error;
      setBarang((b.data ?? []) as unknown as Barang[]);
      setPinjaman((p.data ?? []) as unknown as Pinjam[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat data inventaris");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    return barang.filter((b) => {
      if (key && ![b.kode, b.nama, b.merk ?? "", b.lokasi ?? "", b.kategori].some((v) => v.toLowerCase().includes(key))) return false;
      if (fKat !== "Semua" && b.kategori !== fKat) return false;
      if (fKon !== "Semua" && b.kondisi !== fKon) return false;
      if (fLok.trim() && !(b.lokasi ?? "").toLowerCase().includes(fLok.trim().toLowerCase())) return false;
      return true;
    });
  }, [barang, q, fKat, fKon, fLok]);

  const pinjamFiltered = useMemo(() => {
    const key = q.trim().toLowerCase();
    return pinjaman.filter((p) => {
      if (fStatus !== "Semua" && p.status !== fStatus) return false;
      if (!key) return true;
      const nama = barang.find((b) => b.id === p.inventaris_id)?.nama ?? "";
      return p.peminjam.toLowerCase().includes(key) || nama.toLowerCase().includes(key);
    });
  }, [pinjaman, barang, q, fStatus]);

  const stats = useMemo(() => ({
    jenis: barang.length,
    unit: barang.reduce((a, b) => a + b.jumlah, 0),
    nilai: barang.reduce((a, b) => a + Number(b.nilai || 0), 0),
    rusak: barang.filter((b) => b.kondisi !== "Baik").length,
    dipinjam: pinjaman.filter((p) => p.status === "Dipinjam").length,
  }), [barang, pinjaman]);

  const saveBarang = async (d: Partial<Barang>, file: File | null, id?: string) => {
    let foto = d.foto_url ?? null;
    if (file) foto = await uploadFoto(file);
    if (id) {
      const { error } = await supabase.from("inventaris").update({ ...d, foto_url: foto } as never).eq("id", id);
      if (error) throw error;
      logAction("Edit barang", "Inventaris", d.nama ?? "");
    } else {
      const { data: kode, error: kErr } = await supabase.rpc("next_inventaris_kode" as never, { _kategori: d.kategori } as never);
      if (kErr) throw kErr;
      const { error } = await supabase.from("inventaris").insert({ ...d, foto_url: foto, kode: kode as unknown as string } as never);
      if (error) throw error;
      logAction("Tambah barang", "Inventaris", d.nama ?? "");
    }
    await load();
  };

  const hapusBarang = async (b: Barang) => {
    if (!confirm(`Hapus barang "${b.nama}"?`)) return;
    const { error } = await supabase.from("inventaris").delete().eq("id", b.id);
    if (error) { alert(error.message); return; }
    logAction("Hapus barang", "Inventaris", b.nama);
    await load();
  };

  const kembalikan = async (p: Pinjam) => {
    const { error } = await supabase.from("peminjaman_inventaris")
      .update({ status: "Dikembalikan", tanggal_kembali: new Date().toISOString().slice(0, 10) } as never)
      .eq("id", p.id);
    if (error) { alert(error.message); return; }
    logAction("Pengembalian barang", "Inventaris", p.peminjam);
    await load();
  };

  const exportRows = () => [
    ["Kode", "Nama Barang", "Kategori", "Merk", "Jumlah", "Satuan", "Kondisi", "Lokasi", "Tgl Pembelian", "Sumber Dana", "Nilai", "Keterangan"],
    ...filtered.map((b) => [
      b.kode, b.nama, b.kategori, b.merk ?? "-", String(b.jumlah), b.satuan, b.kondisi,
      b.lokasi ?? "-", b.tanggal_pembelian ? tanggal(b.tanggal_pembelian) : "-",
      b.sumber_dana ?? "-", String(b.nilai ?? 0), b.keterangan ?? "-",
    ]),
  ];

  const exportExcel = () => {
    const rows = exportRows();
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1">${
      rows.map((r, i) => `<tr>${r.map((c) => `<t${i === 0 ? "h" : "d"}>${escapeHtml(c)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join("")
    }</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventaris-rt06-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
    logAction("Export Excel", "Inventaris", `${filtered.length} barang`);
  };

  const cetak = (pdf = false) => {
    const rows = exportRows();
    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) return;
    w.document.write(`<html><head><title>Data Inventaris RT 06</title><style>
      body{font-family:Inter,Arial,sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin:0}p{font-size:12px;color:#555;margin:4px 0 16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
      th{background:#2563EB;color:#fff}
    </style></head><body>
      <h1>DATA INVENTARIS RT 06 RW 07 BOGEMAN WETAN</h1>
      <p>Dicetak: ${new Date().toLocaleString("id-ID")} · Total ${filtered.length} jenis barang</p>
      <table><thead><tr>${rows[0]!.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
    logAction(pdf ? "Export PDF" : "Cetak data", "Inventaris", `${filtered.length} barang`);
  };

  if (!user) return <LoginRequired modul="Inventaris" />;

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-4">
      <PageHeader title="Inventaris RT" desc="Data aset, kondisi barang, nilai, dan peminjaman" icon={Boxes} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([["Jenis", stats.jenis], ["Total Unit", stats.unit], ["Nilai Aset", rupiah(stats.nilai)], ["Perlu Perbaikan", stats.rusak], ["Dipinjam", stats.dipinjam]] as const).map(([l, v]) => (
          <div key={l} className="glass rounded-2xl p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
            <div className="text-sm sm:text-base font-bold tabular-nums break-words">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(["barang", "pinjaman"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold ${tab === t ? "gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
            {t === "barang" ? "Data Barang" : "Peminjaman"}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-3 space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "barang" ? "Cari kode / nama / merk / lokasi…" : "Cari peminjam / barang…"} className="form-inp pl-9" />
        </div>
        {tab === "barang" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select value={fKat} onChange={(e) => setFKat(e.target.value)} className="form-inp">
              <option>Semua</option>{KATEGORI.map((k) => <option key={k}>{k}</option>)}
            </select>
            <select value={fKon} onChange={(e) => setFKon(e.target.value)} className="form-inp">
              <option>Semua</option>{KONDISI.map((k) => <option key={k}>{k}</option>)}
            </select>
            <input value={fLok} onChange={(e) => setFLok(e.target.value)} placeholder="Lokasi" className="form-inp col-span-2 sm:col-span-1" />
          </div>
        ) : (
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="form-inp">
            <option>Semua</option><option>Dipinjam</option><option>Dikembalikan</option>
          </select>
        )}
      </div>

      {err && <div className="glass rounded-2xl p-3 text-xs text-destructive">{err}</div>}
      {loading && <div className="glass rounded-2xl p-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}

      {!loading && tab === "barang" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="text-sm font-semibold">{filtered.length} jenis barang</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => cetak(false)} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl glass text-xs font-semibold"><Printer className="h-4 w-4" /> Cetak</button>
              <button onClick={exportExcel} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl glass text-xs font-semibold"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
              <button onClick={() => cetak(true)} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl glass text-xs font-semibold"><FileText className="h-4 w-4" /> PDF</button>
              {manage && (
                <button onClick={() => { setEditBarang(null); setShowBarang(true); }} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                  <Plus className="h-4 w-4" /> Tambah
                </button>
              )}
            </div>
          </div>
          <DataTable
            headers={["Kode", "Nama", "Kategori", "Jumlah", "Kondisi", "Lokasi", "Nilai", ""]}
            rows={filtered.map((b) => [
              <span key="k" className="font-mono text-[11px]">{b.kode}</span>,
              b.nama,
              b.kategori,
              `${b.jumlah} ${b.satuan}`,
              <KondisiBadge key="c" k={b.kondisi} />,
              b.lokasi ?? "-",
              rupiah(Number(b.nilai || 0)),
              <div key="a" className="flex gap-1">
                <button onClick={() => setDetail(b)} className="p-1.5 rounded-lg hover:bg-accent" title="Detail"><Eye className="h-3.5 w-3.5" /></button>
                {manage && <button onClick={() => { setEditBarang(b); setShowBarang(true); }} className="p-1.5 rounded-lg hover:bg-accent" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
                {del && <button onClick={() => void hapusBarang(b)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>,
            ])}
            empty="Belum ada data"
          />
        </div>
      )}

      {!loading && tab === "pinjaman" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{pinjamFiltered.length} peminjaman</div>
            <button onClick={() => setShowPinjam(true)} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
              <Plus className="h-4 w-4" /> Pinjam Barang
            </button>
          </div>
          <DataTable
            headers={["Barang", "Peminjam", "Jml", "Tgl Pinjam", "Tgl Kembali", "Status", "Catatan", ""]}
            rows={pinjamFiltered.map((p) => {
              const b = barang.find((x) => x.id === p.inventaris_id);
              return [
                b?.nama ?? "-",
                p.peminjam,
                p.jumlah,
                tanggal(p.tanggal_pinjam),
                p.tanggal_kembali ? tanggal(p.tanggal_kembali) : "-",
                <span key="s" className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === "Dipinjam" ? "bg-warning/20 text-warning" : "bg-success/15 text-success"}`}>{p.status}</span>,
                p.catatan || "-",
                p.status === "Dipinjam" && manage
                  ? <button key="a" onClick={() => void kembalikan(p)} className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25" title="Catat pengembalian"><CornerDownLeft className="h-3.5 w-3.5" /></button>
                  : null,
              ];
            })}
            empty="Belum ada data"
          />
        </div>
      )}

      {showBarang && manage && (
        <Modal title={editBarang ? "Edit Barang" : "Tambah Barang"} onClose={() => setShowBarang(false)}>
          <BarangForm
            initial={editBarang}
            onSubmit={async (d, file) => { await saveBarang(d, file, editBarang?.id); setShowBarang(false); }}
          />
        </Modal>
      )}

      {showPinjam && (
        <Modal title="Peminjaman Barang" onClose={() => setShowPinjam(false)}>
          <PinjamForm
            barang={barang}
            defaultNama={user.nama}
            onSubmit={async (d) => {
              const { error } = await supabase.from("peminjaman_inventaris").insert({ ...d, petugas_nama: user.nama } as never);
              if (error) { alert(error.message); return; }
              logAction("Peminjaman barang", "Inventaris", String(d.peminjam));
              setShowPinjam(false);
              await load();
            }}
          />
        </Modal>
      )}

      {detail && (
        <Modal title="Detail Barang" onClose={() => setDetail(null)}>
          <DetailBarang b={detail} />
        </Modal>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

function KondisiBadge({ k }: { k: Kondisi }) {
  const map: Record<Kondisi, string> = {
    "Baik": "bg-success/15 text-success",
    "Rusak Ringan": "bg-warning/20 text-warning",
    "Rusak Berat": "bg-destructive/15 text-destructive",
    "Hilang": "bg-muted text-muted-foreground",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[k]}`}>{k}</span>;
}

function DetailBarang({ b }: { b: Barang }) {
  const url = useSignedUrl(b.foto_url);
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0 text-xs">
      <span className="text-muted-foreground shrink-0">{l}</span>
      <span className="font-medium text-right break-words">{v}</span>
    </div>
  );
  return (
    <div className="space-y-2">
      {url ? (
        <img src={url} alt={`Foto barang ${b.nama}`} loading="lazy" className="w-full h-40 object-cover rounded-2xl" />
      ) : (
        <div className="w-full h-24 rounded-2xl glass grid place-items-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>
      )}
      <Row l="Kode" v={<span className="font-mono">{b.kode}</span>} />
      <Row l="Nama Barang" v={b.nama} />
      <Row l="Kategori" v={b.kategori} />
      <Row l="Merk" v={b.merk || "-"} />
      <Row l="Jumlah" v={`${b.jumlah} ${b.satuan}`} />
      <Row l="Kondisi" v={<KondisiBadge k={b.kondisi} />} />
      <Row l="Lokasi Penyimpanan" v={b.lokasi || "-"} />
      <Row l="Tanggal Pembelian" v={b.tanggal_pembelian ? tanggal(b.tanggal_pembelian) : "-"} />
      <Row l="Sumber Dana" v={b.sumber_dana || "-"} />
      <Row l="Nilai Barang" v={rupiah(Number(b.nilai || 0))} />
      <Row l="Keterangan" v={b.keterangan || "-"} />
    </div>
  );
}

function BarangForm({ initial, onSubmit }: { initial: Barang | null; onSubmit: (d: Partial<Barang>, file: File | null) => Promise<void> }) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [kategori, setKategori] = useState<string>(initial?.kategori ?? KATEGORI[0]);
  const [merk, setMerk] = useState(initial?.merk ?? "");
  const [jumlah, setJumlah] = useState(String(initial?.jumlah ?? 1));
  const [satuan, setSatuan] = useState(initial?.satuan ?? SATUAN[0]!);
  const [kondisi, setKondisi] = useState<Kondisi>(initial?.kondisi ?? "Baik");
  const [lokasi, setLokasi] = useState(initial?.lokasi ?? "");
  const [tglBeli, setTglBeli] = useState(initial?.tanggal_pembelian ?? "");
  const [dana, setDana] = useState(initial?.sumber_dana ?? SUMBER_DANA[0]!);
  const [nilai, setNilai] = useState(String(initial?.nilai ?? 0));
  const [ket, setKet] = useState(initial?.keterangan ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!nama.trim()) return;
        setBusy(true); setError(null);
        try {
          await onSubmit({
            nama: nama.trim(), kategori, merk: merk || null, jumlah: Number(jumlah) || 1, satuan,
            kondisi, lokasi: lokasi || null, tanggal_pembelian: tglBeli || null,
            sumber_dana: dana || null, nilai: Number(nilai) || 0, keterangan: ket || null,
            foto_url: initial?.foto_url ?? null,
          }, file);
        } catch (er) {
          setError(er instanceof Error ? er.message : "Gagal menyimpan");
        } finally { setBusy(false); }
      }}
      className="space-y-3"
    >
      <Field label="Nama Barang"><input required value={nama} onChange={(e) => setNama(e.target.value)} className="form-inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Kategori"><select value={kategori} onChange={(e) => setKategori(e.target.value)} className="form-inp">{KATEGORI.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Merk"><input value={merk} onChange={(e) => setMerk(e.target.value)} className="form-inp" /></Field>
        <Field label="Jumlah"><input required type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="form-inp" /></Field>
        <Field label="Satuan"><select value={satuan} onChange={(e) => setSatuan(e.target.value)} className="form-inp">{SATUAN.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Kondisi"><select value={kondisi} onChange={(e) => setKondisi(e.target.value as Kondisi)} className="form-inp">{KONDISI.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Lokasi Penyimpanan"><input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className="form-inp" /></Field>
        <Field label="Tanggal Pembelian"><input type="date" value={tglBeli} onChange={(e) => setTglBeli(e.target.value)} className="form-inp" /></Field>
        <Field label="Sumber Dana"><select value={dana} onChange={(e) => setDana(e.target.value)} className="form-inp">{SUMBER_DANA.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="Nilai Barang (Rp)"><input type="number" min={0} value={nilai} onChange={(e) => setNilai(e.target.value)} className="form-inp" /></Field>
      <Field label="Foto Barang"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="form-inp" /></Field>
      <Field label="Keterangan"><textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={2} className="form-inp" /></Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <SubmitBtn>{busy ? "Menyimpan…" : initial ? "Simpan Perubahan" : "Simpan Barang"}</SubmitBtn>
    </form>
  );
}

function PinjamForm({ barang, defaultNama, onSubmit }: { barang: Barang[]; defaultNama: string; onSubmit: (d: Record<string, unknown>) => Promise<void> }) {
  const [inventarisId, setId] = useState(barang[0]?.id ?? "");
  const [peminjam, setP] = useState(defaultNama);
  const [jumlah, setJ] = useState("1");
  const [tglPinjam, setTP] = useState(new Date().toISOString().slice(0, 10));
  const [tglKembali, setTK] = useState("");
  const [status, setStatus] = useState<"Dipinjam" | "Dikembalikan">("Dipinjam");
  const [catatan, setC] = useState("");
  const [busy, setBusy] = useState(false);

  if (barang.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-6">Belum ada data barang. Tambahkan barang terlebih dahulu.</div>;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!inventarisId || !peminjam.trim()) return;
        setBusy(true);
        await onSubmit({
          inventaris_id: inventarisId, peminjam: peminjam.trim(), jumlah: Number(jumlah) || 1,
          tanggal_pinjam: tglPinjam, tanggal_kembali: tglKembali || null, status, catatan: catatan || null,
        });
        setBusy(false);
      }}
      className="space-y-3"
    >
      <Field label="Barang">
        <select required value={inventarisId} onChange={(e) => setId(e.target.value)} className="form-inp">
          {barang.map((b) => <option key={b.id} value={b.id}>{b.nama} ({b.jumlah} {b.satuan})</option>)}
        </select>
      </Field>
      <Field label="Nama Peminjam"><input required value={peminjam} onChange={(e) => setP(e.target.value)} className="form-inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Jumlah"><input required type="number" min={1} value={jumlah} onChange={(e) => setJ(e.target.value)} className="form-inp" /></Field>
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as "Dipinjam" | "Dikembalikan")} className="form-inp"><option>Dipinjam</option><option>Dikembalikan</option></select></Field>
        <Field label="Tanggal Pinjam"><input type="date" value={tglPinjam} onChange={(e) => setTP(e.target.value)} className="form-inp" /></Field>
        <Field label="Tanggal Kembali"><input type="date" value={tglKembali} onChange={(e) => setTK(e.target.value)} className="form-inp" /></Field>
      </div>
      <Field label="Catatan"><textarea value={catatan} onChange={(e) => setC(e.target.value)} rows={2} className="form-inp" /></Field>
      <SubmitBtn>{busy ? "Menyimpan…" : "Simpan Peminjaman"}</SubmitBtn>
    </form>
  );
}
