import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  MessageSquareWarning, Send, Image as ImageIcon, X, Bell, CheckCircle2,
  Loader2, Inbox, Filter, Trash2, Eye, ShieldAlert, Sparkles,
} from "lucide-react";
import { useLS, uid, nowISO, tanggalWaktu } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, Field, SubmitBtn, Modal } from "./warga";

export const Route = createFileRoute("/kritik-saran")({
  head: () => ({
    meta: [
      { title: "Kritik & Saran — SiRT 06 Digital" },
      { name: "description", content: "Sampaikan masukan untuk perbaikan lingkungan RT 06 RW 07 Bogeman Wetan." },
    ],
  }),
  component: KritikSaranPage,
});

type Kategori = "Keamanan" | "Kebersihan" | "Infrastruktur" | "Sosial" | "Lainnya";
type Status = "Diterima" | "Diproses" | "Selesai";

interface Notif { waktu: string; status: Status; catatan?: string; oleh: string; }
interface Laporan {
  id: string;
  kode: string;
  nama: string;
  anonim: boolean;
  kategori: Kategori;
  judul: string;
  isi: string;
  foto?: string; // dataURL
  status: Status;
  createdAt: string;
  riwayat: Notif[];
}

const KATEGORI: Kategori[] = ["Keamanan", "Kebersihan", "Infrastruktur", "Sosial", "Lainnya"];
const STATUS: Status[] = ["Diterima", "Diproses", "Selesai"];

const DUMMY: Laporan[] = [
  {
    id: "lap_seed_1", kode: "KS-2026-001",
    nama: "Pak Suparman", anonim: false, kategori: "Infrastruktur",
    judul: "Lampu jalan depan Gg. Mawar mati",
    isi: "Sudah 3 hari lampu PJU di Gg. Mawar RT 06 mati total, jalan jadi gelap dan rawan. Mohon segera diperbaiki.",
    status: "Diproses",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    riwayat: [
      { waktu: new Date(Date.now() - 86400000 * 3).toISOString(), status: "Diterima", oleh: "Sistem" },
      { waktu: new Date(Date.now() - 86400000 * 2).toISOString(), status: "Diproses", oleh: "Sie Perlengkapan", catatan: "Sudah dilaporkan ke kelurahan." },
    ],
  },
  {
    id: "lap_seed_2", kode: "KS-2026-002",
    nama: "Anonim", anonim: true, kategori: "Kebersihan",
    judul: "Tumpukan sampah di pojok lapangan",
    isi: "Sampah menumpuk di sudut lapangan voli sejak minggu lalu, bau menyengat saat sore. Tolong diatur jadwal angkut tambahan.",
    status: "Selesai",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    riwayat: [
      { waktu: new Date(Date.now() - 86400000 * 7).toISOString(), status: "Diterima", oleh: "Sistem" },
      { waktu: new Date(Date.now() - 86400000 * 6).toISOString(), status: "Diproses", oleh: "Sie Lingkungan" },
      { waktu: new Date(Date.now() - 86400000 * 4).toISOString(), status: "Selesai", oleh: "Sie Lingkungan", catatan: "Sampah sudah diangkut, jadwal tambahan setiap Jumat." },
    ],
  },
  {
    id: "lap_seed_3", kode: "KS-2026-003",
    nama: "Ibu Wati", anonim: false, kategori: "Keamanan",
    judul: "Motor asing parkir tengah malam di Gg. Melati",
    isi: "Beberapa malam terakhir ada motor tidak dikenal parkir lama di depan rumah kosong Gg. Melati. Mohon ditingkatkan patroli poskamling.",
    status: "Diterima",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    riwayat: [
      { waktu: new Date(Date.now() - 86400000 * 1).toISOString(), status: "Diterima", oleh: "Sistem" },
    ],
  },
  {
    id: "lap_seed_4", kode: "KS-2026-004",
    nama: "Mas Bagus", anonim: false, kategori: "Sosial",
    judul: "Usulan kerja bakti bulanan rutin",
    isi: "Mengusulkan kerja bakti rutin tiap Minggu pertama agar lingkungan tetap rapi dan warga makin akrab.",
    status: "Diproses",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    riwayat: [
      { waktu: new Date(Date.now() - 86400000 * 2).toISOString(), status: "Diterima", oleh: "Sistem" },
      { waktu: new Date(Date.now() - 86400000 * 1).toISOString(), status: "Diproses", oleh: "Ketua RT", catatan: "Akan dibahas pada rapat RT mendatang." },
    ],
  },
];

const statusColor: Record<Status, string> = {
  Diterima: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  Diproses: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  Selesai: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

function KritikSaranPage() {
  const { user, logAction } = useAuth();
  const [laporan, setLaporan] = useLS<Laporan[]>("sirt06_kritik_saran_v1", DUMMY);
  const [tab, setTab] = useState<"kirim" | "riwayat" | "dashboard">("kirim");
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Laporan | null>(null);
  const [filter, setFilter] = useState<"semua" | Status>("semua");

  const canManage = !!user && ["Ketua RT", "Sekretaris", "Admin", "Sie Sosial", "Sie Humas", "Sie Lingkungan", "Sie Keamanan", "Sie Perlengkapan"].includes(user.role);

  const stats = useMemo(() => ({
    total: laporan.length,
    diterima: laporan.filter((l) => l.status === "Diterima").length,
    diproses: laporan.filter((l) => l.status === "Diproses").length,
    selesai: laporan.filter((l) => l.status === "Selesai").length,
  }), [laporan]);

  const filtered = useMemo(() => {
    const list = filter === "semua" ? laporan : laporan.filter((l) => l.status === filter);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [laporan, filter]);

  function tambahLaporan(data: Omit<Laporan, "id" | "kode" | "status" | "createdAt" | "riwayat">) {
    const kode = `KS-${new Date().getFullYear()}-${String(laporan.length + 1).padStart(3, "0")}`;
    const baru: Laporan = {
      ...data, id: uid("lap"), kode, status: "Diterima", createdAt: nowISO(),
      riwayat: [{ waktu: nowISO(), status: "Diterima", oleh: "Sistem" }],
    };
    setLaporan((p) => [baru, ...p]);
    setShowForm(false);
    setTab("riwayat");
  }

  function ubahStatus(id: string, status: Status, catatan?: string) {
    if (!user) return;
    setLaporan((p) => p.map((l) => l.id === id ? {
      ...l, status,
      riwayat: [...l.riwayat, { waktu: nowISO(), status, oleh: user.nama, catatan }],
    } : l));
    logAction(`Ubah status laporan ${id} → ${status}`, "Kritik & Saran", catatan);
    setDetail((d) => d && d.id === id ? {
      ...d, status,
      riwayat: [...d.riwayat, { waktu: nowISO(), status, oleh: user.nama, catatan }],
    } : d);
  }

  function hapusLaporan(id: string) {
    if (!user) return;
    if (!confirm("Hapus laporan ini?")) return;
    setLaporan((p) => p.filter((l) => l.id !== id));
    logAction(`Hapus laporan ${id}`, "Kritik & Saran");
    setDetail(null);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-32">
      <PageHeader
        title="Kritik & Saran"
        desc="Sampaikan masukan dan pantau tindak lanjut pengurus RT 06 RW 07 Bogeman Wetan."
        icon={MessageSquareWarning}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Total Laporan" value={stats.total} icon={Inbox} tone="primary" />
        <StatCard label="Diterima" value={stats.diterima} icon={Bell} tone="amber" />
        <StatCard label="Diproses" value={stats.diproses} icon={Loader2} tone="blue" />
        <StatCard label="Selesai" value={stats.selesai} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="glass-strong rounded-2xl p-1.5 flex gap-1.5 overflow-x-auto">
        {([
          ["kirim", "Kirim Masukan"],
          ["riwayat", "Riwayat"],
          ["dashboard", "Dashboard Pengurus"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === k ? "gradient-primary text-primary-foreground shadow-glow" : "hover:bg-primary/5"}`}
          >{l}</button>
        ))}
      </div>

      {tab === "kirim" && (
        <div className="glass-strong rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground grid place-items-center shadow-glow shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Suara Warga Bogeman Wetan</h2>
              <p className="text-xs text-muted-foreground">Laporanmu akan ditindaklanjuti pengurus. Mode anonim tersedia.</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 font-semibold shadow-glow flex items-center justify-center gap-2 active:scale-[0.98] transition"
          ><Send className="h-4 w-4" /> Buat Laporan Baru</button>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {KATEGORI.map((k) => {
              const n = laporan.filter((l) => l.kategori === k).length;
              return (
                <div key={k} className="glass rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="text-lg font-extrabold text-primary">{n}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "riwayat" && (
        <div className="space-y-3">
          <div className="glass-strong rounded-2xl p-2 flex items-center gap-2 overflow-x-auto">
            <Filter className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
            {(["semua", ...STATUS] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${filter === s ? "gradient-primary text-primary-foreground" : "hover:bg-primary/5"}`}
              >{s === "semua" ? "Semua" : s}</button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
              Belum ada laporan pada kategori ini.
            </div>
          )}
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => setDetail(l)}
              className="glass-strong rounded-2xl p-4 w-full text-left hover:shadow-glow transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">{l.kode}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{l.kategori}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor[l.status]}`}>{l.status}</span>
                  </div>
                  <div className="font-bold text-sm mt-1.5 line-clamp-1">{l.judul}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{l.isi}</p>
                  <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2">
                    <span>{l.anonim ? "Anonim" : l.nama}</span>
                    <span>•</span>
                    <span>{tanggalWaktu(l.createdAt)}</span>
                  </div>
                </div>
                {l.foto && <img src={l.foto} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "dashboard" && (
        <DashboardPengurus
          laporan={laporan}
          canManage={canManage}
          onOpen={(l) => setDetail(l)}
        />
      )}

      {showForm && (
        <Modal title="Kirim Laporan Baru" onClose={() => setShowForm(false)}>
          <FormLaporan onSubmit={tambahLaporan} defaultNama={user?.nama ?? ""} />
        </Modal>
      )}

      {detail && (
        <Modal title={`Detail ${detail.kode}`} onClose={() => setDetail(null)}>
          <DetailLaporan
            laporan={detail}
            canManage={canManage}
            onUbahStatus={ubahStatus}
            onHapus={hapusLaporan}
          />
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: "primary" | "amber" | "blue" | "emerald" }) {
  const toneCls: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/15 text-amber-600",
    blue: "bg-blue-500/15 text-blue-600",
    emerald: "bg-emerald-500/15 text-emerald-600",
  };
  return (
    <div className="glass-strong rounded-2xl p-3.5 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${toneCls[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-extrabold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function FormLaporan({ onSubmit, defaultNama }: {
  onSubmit: (d: Omit<Laporan, "id" | "kode" | "status" | "createdAt" | "riwayat">) => void;
  defaultNama: string;
}) {
  const [anonim, setAnonim] = useState(false);
  const [nama, setNama] = useState(defaultNama);
  const [kategori, setKategori] = useState<Kategori>("Kebersihan");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [foto, setFoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert("Maks 2MB"); return; }
    const r = new FileReader();
    r.onload = () => setFoto(String(r.result));
    r.readAsDataURL(f);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (judul.trim().length < 5) { alert("Judul minimal 5 karakter"); return; }
        if (isi.trim().length < 10) { alert("Isi minimal 10 karakter"); return; }
        onSubmit({
          nama: anonim ? "Anonim" : (nama.trim() || "Warga"),
          anonim, kategori,
          judul: judul.trim().slice(0, 120),
          isi: isi.trim().slice(0, 1000),
          foto,
        });
      }}
      className="space-y-3"
    >
      <label className="glass rounded-xl p-3 flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={anonim} onChange={(e) => setAnonim(e.target.checked)} className="h-4 w-4 accent-primary" />
        <div className="flex-1">
          <div className="text-sm font-semibold flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-primary" /> Kirim sebagai Anonim</div>
          <div className="text-[11px] text-muted-foreground">Identitas Anda disembunyikan dari warga lain.</div>
        </div>
      </label>

      {!anonim && (
        <Field label="Nama (opsional)">
          <input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={60} placeholder="Misal: Pak Joko" className="form-inp" />
        </Field>
      )}

      <Field label="Kategori">
        <select value={kategori} onChange={(e) => setKategori(e.target.value as Kategori)} className="form-inp">
          {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>

      <Field label="Judul Laporan">
        <input required maxLength={120} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Ringkas masalah dalam 1 kalimat" className="form-inp" />
      </Field>

      <Field label="Isi Laporan">
        <textarea required maxLength={1000} rows={5} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Ceritakan lokasi, waktu, dan kondisi…" className="form-inp" />
        <div className="text-[10px] text-right text-muted-foreground mt-1">{isi.length}/1000</div>
      </Field>

      <Field label="Foto Pendukung (opsional)">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        {!foto ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="glass rounded-xl w-full py-6 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:bg-primary/5">
            <ImageIcon className="h-6 w-6" />
            Pilih foto (maks 2MB)
          </button>
        ) : (
          <div className="relative">
            <img src={foto} alt="" className="w-full rounded-xl max-h-56 object-cover" />
            <button type="button" onClick={() => setFoto(undefined)} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white grid place-items-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </Field>

      <SubmitBtn>Kirim Laporan</SubmitBtn>
    </form>
  );
}

function DetailLaporan({ laporan, canManage, onUbahStatus, onHapus }: {
  laporan: Laporan;
  canManage: boolean;
  onUbahStatus: (id: string, s: Status, catatan?: string) => void;
  onHapus: (id: string) => void;
}) {
  const [catatan, setCatatan] = useState("");
  const [newStatus, setNewStatus] = useState<Status>(laporan.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground">{laporan.kode}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{laporan.kategori}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor[laporan.status]}`}>{laporan.status}</span>
      </div>
      <div>
        <h3 className="font-extrabold text-lg leading-tight">{laporan.judul}</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {laporan.anonim ? "Anonim" : laporan.nama} • {tanggalWaktu(laporan.createdAt)}
        </p>
      </div>
      {laporan.foto && <img src={laporan.foto} alt="" className="w-full rounded-xl max-h-72 object-cover" />}
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{laporan.isi}</p>

      <div className="glass rounded-xl p-3">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" /> Notifikasi & Riwayat Status
        </div>
        <ol className="space-y-2">
          {laporan.riwayat.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs">
              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${r.status === "Selesai" ? "bg-emerald-500" : r.status === "Diproses" ? "bg-blue-500" : "bg-amber-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{r.status} <span className="text-muted-foreground font-normal">• {r.oleh}</span></div>
                {r.catatan && <div className="text-muted-foreground">{r.catatan}</div>}
                <div className="text-[10px] text-muted-foreground">{tanggalWaktu(r.waktu)}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {canManage && (
        <div className="glass rounded-xl p-3 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Aksi Pengurus</div>
          <div className="grid grid-cols-3 gap-2">
            {STATUS.map((s) => (
              <button key={s} type="button" onClick={() => setNewStatus(s)}
                className={`py-2 rounded-lg text-xs font-bold border ${newStatus === s ? statusColor[s] : "border-border/50 hover:bg-primary/5"}`}
              >{s}</button>
            ))}
          </div>
          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tindak lanjut (opsional)" rows={2} className="form-inp" />
          <div className="flex gap-2">
            <button type="button" onClick={() => onUbahStatus(laporan.id, newStatus, catatan || undefined)}
              className="flex-1 gradient-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold shadow-glow">
              Perbarui Status
            </button>
            <button type="button" onClick={() => onHapus(laporan.id)}
              className="px-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardPengurus({ laporan, canManage, onOpen }: {
  laporan: Laporan[]; canManage: boolean; onOpen: (l: Laporan) => void;
}) {
  const perKategori = useMemo(() => {
    return KATEGORI.map((k) => ({ k, n: laporan.filter((l) => l.kategori === k).length }));
  }, [laporan]);
  const max = Math.max(1, ...perKategori.map((p) => p.n));
  const antrian = useMemo(() => laporan.filter((l) => l.status !== "Selesai")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [laporan]);

  return (
    <div className="space-y-4">
      {!canManage && (
        <div className="glass rounded-xl p-3 text-xs text-muted-foreground border border-amber-500/30 bg-amber-500/5">
          Login sebagai pengurus untuk mengubah status laporan. Tampilan tetap dapat dilihat warga.
        </div>
      )}
      <div className="glass-strong rounded-2xl p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Distribusi per Kategori</div>
        <div className="space-y-2">
          {perKategori.map((p) => (
            <div key={p.k}>
              <div className="flex justify-between text-xs mb-1"><span className="font-semibold">{p.k}</span><span className="text-muted-foreground">{p.n}</span></div>
              <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full gradient-primary" style={{ width: `${(p.n / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Antrian Tindak Lanjut</div>
        {antrian.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Semua laporan sudah selesai 🎉</div>}
        <div className="space-y-2">
          {antrian.map((l) => (
            <button key={l.id} onClick={() => onOpen(l)} className="w-full text-left glass rounded-xl p-3 flex items-center gap-3 hover:shadow-glow transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor[l.status]}`}>{l.status}</span>
                  <span className="text-[10px] text-muted-foreground">{l.kode}</span>
                </div>
                <div className="font-semibold text-sm line-clamp-1 mt-1">{l.judul}</div>
                <div className="text-[10px] text-muted-foreground">{l.kategori} • {tanggalWaktu(l.createdAt)}</div>
              </div>
              <Eye className="h-4 w-4 text-primary shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}