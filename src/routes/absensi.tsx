import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ClipboardCheck, Plus, QrCode, ScanLine, Calendar, MapPin, Clock,
  Trash2, X, Users, TrendingUp, Trophy, CheckCircle2, XCircle, Download,
  Camera, Search,
} from "lucide-react";
import { useLS, uid, nowISO, tanggal, tanggalWaktu } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/absensi")({
  head: () => ({
    meta: [
      { title: "Absensi — SiRT 06 Digital" },
      { name: "description", content: "Absensi kegiatan RT 06 dengan QR Check-In." },
    ],
  }),
  component: AbsensiPage,
});

type JenisKegiatan = "Kerja Bakti" | "Rapat RT" | "Jalan Sehat" | "Posyandu" | "Lainnya";
const JENIS: JenisKegiatan[] = ["Kerja Bakti", "Rapat RT", "Jalan Sehat", "Posyandu", "Lainnya"];

interface Kegiatan {
  id: string;
  nama: string;
  jenis: JenisKegiatan;
  tanggal: string;
  jam: string;
  lokasi: string;
  deskripsi?: string;
  qrToken: string;
  qrExpiresAt: string;
  qrDurasiMenit: number;
  createdBy: string;
  createdAt: string;
}

interface Kehadiran {
  id: string;
  kegiatanId: string;
  nama: string;
  waktu: string;
}

const DEFAULT_KEGIATAN: Kegiatan[] = [];
const DEFAULT_KEHADIRAN: Kehadiran[] = [];
function getWargaNames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("sirt06_warga_v1");
    if (!raw) return [];
    const arr = JSON.parse(raw) as { nama: string }[];
    return Array.isArray(arr) ? arr.map((w) => w.nama).filter(Boolean) : [];
  } catch { return []; }
}

type Tab = "kegiatan" | "scan" | "rekap" | "riwayat" | "statistik";

function AbsensiPage() {
  const { user, logAction } = useAuth();
  const [kegiatan, setKegiatan] = useLS<Kegiatan[]>("sirt06_kegiatan_v1", DEFAULT_KEGIATAN);
  const [hadir, setHadir] = useLS<Kehadiran[]>("sirt06_kehadiran_v1", DEFAULT_KEHADIRAN);
  const [tab, setTab] = useState<Tab>("kegiatan");
  const [showForm, setShowForm] = useState(false);
  const [qrFor, setQrFor] = useState<Kegiatan | null>(null);
  const [detailFor, setDetailFor] = useState<Kegiatan | null>(null);

  const canManage = !!user && ["Ketua RT", "Sekretaris", "Admin", "Sie Sosial", "Sie Humas"].includes(user.role);

  const sortedKegiatan = useMemo(
    () => [...kegiatan].sort((a, b) => (b.tanggal + b.jam).localeCompare(a.tanggal + a.jam)),
    [kegiatan]
  );

  const addKegiatan = (data: Omit<Kegiatan, "id" | "qrToken" | "qrExpiresAt" | "createdAt" | "createdBy">) => {
    const startMs = new Date(`${data.tanggal}T${data.jam}:00`).getTime();
    const k: Kegiatan = {
      ...data,
      id: uid("k"),
      qrToken: `RT06-${data.jenis.slice(0, 2).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      qrExpiresAt: new Date(startMs + data.qrDurasiMenit * 60000).toISOString(),
      createdBy: user?.nama ?? "Pengurus",
      createdAt: nowISO(),
    };
    setKegiatan((p) => [k, ...p]);
    logAction("Tambah kegiatan", "Absensi", k.nama);
    setShowForm(false);
  };

  const hapusKegiatan = (id: string) => {
    if (!confirm("Hapus kegiatan ini beserta data kehadirannya?")) return;
    setKegiatan((p) => p.filter((k) => k.id !== id));
    setHadir((p) => p.filter((h) => h.kegiatanId !== id));
    logAction("Hapus kegiatan", "Absensi", id);
  };

  const regenerateQR = (id: string, durasiMenit: number) => {
    setKegiatan((p) =>
      p.map((k) =>
        k.id === id
          ? {
              ...k,
              qrToken: `RT06-${k.jenis.slice(0, 2).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
              qrExpiresAt: new Date(Date.now() + durasiMenit * 60000).toISOString(),
              qrDurasiMenit: durasiMenit,
            }
          : k
      )
    );
    logAction("Generate ulang QR", "Absensi", id);
  };

  const checkIn = (token: string, nama: string): { ok: boolean; pesan: string } => {
    const t = token.trim().toUpperCase();
    const n = nama.trim();
    if (!t || !n) return { ok: false, pesan: "Nama dan kode QR wajib diisi." };
    const k = kegiatan.find((x) => x.qrToken.toUpperCase() === t);
    if (!k) return { ok: false, pesan: "Kode QR tidak ditemukan." };
    if (new Date(k.qrExpiresAt).getTime() < Date.now())
      return { ok: false, pesan: `QR kegiatan "${k.nama}" sudah kedaluwarsa.` };
    const dup = hadir.find((h) => h.kegiatanId === k.id && h.nama.toLowerCase() === n.toLowerCase());
    if (dup) return { ok: false, pesan: `${n} sudah tercatat hadir di kegiatan ini.` };
    setHadir((p) => [{ id: uid("h"), kegiatanId: k.id, nama: n, waktu: nowISO() }, ...p]);
    logAction("Check-in absensi", "Absensi", `${n} → ${k.nama}`);
    return { ok: true, pesan: `✓ Hadir tercatat: ${n} di "${k.nama}"` };
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <Header />
      <Tabs tab={tab} setTab={setTab} canManage={canManage} onAdd={() => setShowForm(true)} />

      {tab === "kegiatan" && (
        <KegiatanList
          items={sortedKegiatan}
          hadir={hadir}
          canManage={canManage}
          onQR={(k) => setQrFor(k)}
          onDetail={(k) => setDetailFor(k)}
          onDelete={hapusKegiatan}
        />
      )}
      {tab === "scan" && <ScanPanel onCheckIn={checkIn} kegiatan={sortedKegiatan} />}
      {tab === "rekap" && <RekapPanel kegiatan={sortedKegiatan} hadir={hadir} totalWarga={WARGA_DUMMY.length} />}
      {tab === "riwayat" && <RiwayatPanel kegiatan={kegiatan} hadir={hadir} />}
      {tab === "statistik" && <StatistikPanel kegiatan={kegiatan} hadir={hadir} />}

      {showForm && <FormKegiatan onClose={() => setShowForm(false)} onSave={addKegiatan} />}
      {qrFor && (
        <QRModal
          k={qrFor}
          kegiatan={kegiatan}
          onClose={() => setQrFor(null)}
          onRegenerate={(d) => { regenerateQR(qrFor.id, d); }}
        />
      )}
      {detailFor && (
        <DetailModal
          k={detailFor}
          hadir={hadir.filter((h) => h.kegiatanId === detailFor.id)}
          onClose={() => setDetailFor(null)}
        />
      )}
    </div>
  );
}

/* ---------------- HEADER & TABS ---------------- */

function Header() {
  return (
    <div className="glass-strong rounded-3xl p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary shadow-glow shrink-0">
          <ClipboardCheck className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold leading-tight">Absensi Kegiatan</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">QR Check-In otomatis · RT 06 RW 07 Bogeman Wetan</p>
        </div>
      </div>
    </div>
  );
}

function Tabs({ tab, setTab, canManage, onAdd }: { tab: Tab; setTab: (t: Tab) => void; canManage: boolean; onAdd: () => void }) {
  const items: { id: Tab; label: string; icon: typeof ClipboardCheck }[] = [
    { id: "kegiatan", label: "Kegiatan", icon: Calendar },
    { id: "scan", label: "Scan QR", icon: ScanLine },
    { id: "rekap", label: "Rekap", icon: CheckCircle2 },
    { id: "riwayat", label: "Riwayat", icon: Users },
    { id: "statistik", label: "Statistik", icon: TrendingUp },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className={[
                "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold transition",
                active ? "gradient-primary text-primary-foreground shadow-glow" : "glass hover:bg-accent",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </button>
          );
        })}
      </div>
      {canManage && (
        <button
          onClick={onAdd}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow"
        >
          <Plus className="h-4 w-4" /> Kegiatan
        </button>
      )}
    </div>
  );
}

/* ---------------- KEGIATAN LIST ---------------- */

function KegiatanList({
  items, hadir, canManage, onQR, onDetail, onDelete,
}: {
  items: Kegiatan[]; hadir: Kehadiran[]; canManage: boolean;
  onQR: (k: Kegiatan) => void; onDetail: (k: Kegiatan) => void; onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Belum ada kegiatan. {canManage ? "Klik + Kegiatan untuk menambah." : "Hubungi pengurus."}
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((k) => {
        const count = hadir.filter((h) => h.kegiatanId === k.id).length;
        const active = new Date(k.qrExpiresAt).getTime() > Date.now();
        const startMs = new Date(`${k.tanggal}T${k.jam}:00`).getTime();
        const upcoming = startMs > Date.now();
        return (
          <div key={k.id} className="glass rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl grid place-items-center bg-primary/10 text-primary shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{k.jenis}</span>
                  <span className={[
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground",
                  ].join(" ")}>{active ? "QR Aktif" : "QR Nonaktif"}</span>
                  {upcoming && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">Akan datang</span>}
                </div>
                <div className="font-bold mt-1 text-[15px] leading-tight truncate">{k.nama}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{tanggal(k.tanggal)} · {k.jam}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{k.lokasi}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" /><b className="text-foreground">{count}</b> hadir
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onDetail(k)} className="px-3 py-1.5 rounded-lg glass text-xs font-semibold">Detail</button>
                <button onClick={() => onQR(k)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                  <QrCode className="h-3.5 w-3.5" /> QR
                </button>
                {canManage && (
                  <button onClick={() => onDelete(k.id)} className="h-8 w-8 grid place-items-center rounded-lg bg-destructive/10 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- FORM KEGIATAN ---------------- */

function FormKegiatan({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<Kegiatan, "id" | "qrToken" | "qrExpiresAt" | "createdAt" | "createdBy">) => void;
}) {
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState<JenisKegiatan>("Kerja Bakti");
  const today = new Date().toISOString().slice(0, 10);
  const [tgl, setTgl] = useState(today);
  const [jam, setJam] = useState("08:00");
  const [lokasi, setLokasi] = useState("Balai RT 06");
  const [deskripsi, setDeskripsi] = useState("");
  const [durasi, setDurasi] = useState(120);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !lokasi.trim()) return;
    onSave({ nama: nama.trim(), jenis, tanggal: tgl, jam, lokasi: lokasi.trim(), deskripsi: deskripsi.trim(), qrDurasiMenit: durasi });
  };

  return (
    <Modal title="Tambah Kegiatan" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nama Kegiatan"><input className="form-inp" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Kerja Bakti Lingkungan" required /></Field>
        <Field label="Jenis">
          <select className="form-inp" value={jenis} onChange={(e) => setJenis(e.target.value as JenisKegiatan)}>
            {JENIS.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal"><input type="date" className="form-inp" value={tgl} onChange={(e) => setTgl(e.target.value)} required /></Field>
          <Field label="Jam"><input type="time" className="form-inp" value={jam} onChange={(e) => setJam(e.target.value)} required /></Field>
        </div>
        <Field label="Lokasi"><input className="form-inp" value={lokasi} onChange={(e) => setLokasi(e.target.value)} required /></Field>
        <Field label="Deskripsi (opsional)"><textarea className="form-inp" rows={2} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></Field>
        <Field label={`Masa berlaku QR: ${durasi} menit`}>
          <input type="range" min={15} max={480} step={15} value={durasi} onChange={(e) => setDurasi(parseInt(e.target.value))} className="w-full" />
        </Field>
        <button type="submit" className="w-full rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold shadow-glow">Simpan Kegiatan</button>
      </form>
    </Modal>
  );
}

/* ---------------- QR MODAL ---------------- */

function QRModal({ k, kegiatan, onClose, onRegenerate }: { k: Kegiatan; kegiatan: Kegiatan[]; onClose: () => void; onRegenerate: (durasi: number) => void; }) {
  const live = kegiatan.find((x) => x.id === k.id) ?? k;
  const [dataUrl, setDataUrl] = useState<string>("");
  const [durasi, setDurasi] = useState(live.qrDurasiMenit || 120);

  useEffect(() => {
    const payload = JSON.stringify({ t: "SiRT06-ABS", kegiatan: live.nama, token: live.qrToken });
    QRCode.toDataURL(payload, { width: 480, margin: 2, color: { dark: "#1e3a8a", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [live.qrToken, live.nama]);

  const expired = new Date(live.qrExpiresAt).getTime() < Date.now();
  const sisa = Math.max(0, Math.floor((new Date(live.qrExpiresAt).getTime() - Date.now()) / 60000));

  return (
    <Modal title="QR Check-In" onClose={onClose}>
      <div className="text-center">
        <div className="font-bold text-base">{live.nama}</div>
        <div className="text-xs text-muted-foreground">{tanggal(live.tanggal)} · {live.jam} · {live.lokasi}</div>
        <div className="mt-3 inline-block rounded-3xl bg-white p-3 shadow-soft">
          {dataUrl ? <img src={dataUrl} alt="QR" className="w-56 h-56 sm:w-64 sm:h-64" /> : <div className="w-56 h-56 grid place-items-center text-xs text-slate-500">Membuat QR…</div>}
        </div>
        <div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Kode Manual</div>
        <div className="font-mono text-lg font-bold tracking-widest text-primary">{live.qrToken}</div>
        <div className={["mt-1 text-xs font-semibold", expired ? "text-destructive" : "text-emerald-600"].join(" ")}>
          {expired ? "Kedaluwarsa" : `Berlaku ${sisa} menit lagi`}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Field label={`Perpanjang masa berlaku: ${durasi} menit`}>
          <input type="range" min={15} max={480} step={15} value={durasi} onChange={(e) => setDurasi(parseInt(e.target.value))} className="w-full" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onRegenerate(durasi)} className="rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Generate Ulang</button>
          {dataUrl && (
            <a href={dataUrl} download={`QR-${live.qrToken}.png`} className="inline-flex items-center justify-center gap-1.5 rounded-xl glass py-2.5 text-sm font-semibold">
              <Download className="h-4 w-4" /> Unduh
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- DETAIL MODAL ---------------- */

function DetailModal({ k, hadir, onClose }: { k: Kegiatan; hadir: Kehadiran[]; onClose: () => void }) {
  return (
    <Modal title="Detail Kegiatan" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <div className="font-bold text-base">{k.nama}</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge>{k.jenis}</Badge>
          <Badge><Clock className="h-3 w-3 mr-1" />{tanggal(k.tanggal)} · {k.jam}</Badge>
          <Badge><MapPin className="h-3 w-3 mr-1" />{k.lokasi}</Badge>
        </div>
        {k.deskripsi && <p className="text-sm text-muted-foreground">{k.deskripsi}</p>}
        <div className="text-xs text-muted-foreground">Dibuat oleh <b>{k.createdBy}</b> · {tanggalWaktu(k.createdAt)}</div>
        <div className="pt-2 border-t border-border">
          <div className="text-sm font-semibold mb-2">Daftar Hadir ({hadir.length})</div>
          {hadir.length === 0 ? (
            <div className="text-xs text-muted-foreground">Belum ada warga yang check-in.</div>
          ) : (
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {hadir.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-xs glass rounded-lg px-3 py-2">
                  <span className="font-medium">{h.nama}</span>
                  <span className="text-muted-foreground">{tanggalWaktu(h.waktu)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- SCAN PANEL ---------------- */

function ScanPanel({ onCheckIn, kegiatan }: { onCheckIn: (token: string, nama: string) => { ok: boolean; pesan: string }; kegiatan: Kegiatan[] }) {
  const [nama, setNama] = useState("");
  const [kode, setKode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; pesan: string } | null>(null);
  const [showCam, setShowCam] = useState(false);
  const [sugg, setSugg] = useState<string[]>([]);
  const camRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!nama.trim()) { setSugg([]); return; }
    const q = nama.toLowerCase();
    setSugg(WARGA_DUMMY.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 5));
  }, [nama]);

  useEffect(() => {
    if (!showCam) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled || !camRef.current) return;
        const id = "absensi-cam-box";
        camRef.current.id = id;
        const Scanner = mod.Html5Qrcode;
        const s = new Scanner(id);
        scannerRef.current = s;
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (decoded: string) => {
          let token = decoded;
          try { const j = JSON.parse(decoded); if (j?.token) token = j.token; } catch { /* plain */ }
          setKode(token);
          const res = onCheckIn(token, nama);
          setMsg(res);
          if (res.ok) { s.stop().catch(() => {}); setShowCam(false); }
        }, () => {});
      } catch {
        setMsg({ ok: false, pesan: "Tidak dapat mengakses kamera. Gunakan kode manual." });
        setShowCam(false);
      }
    })();
    return () => {
      cancelled = true;
      try { scannerRef.current?.stop?.().catch?.(() => {}); } catch { /* noop */ }
    };
  }, [showCam, nama, onCheckIn]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(onCheckIn(kode, nama));
  };

  const aktif = kegiatan.filter((k) => new Date(k.qrExpiresAt).getTime() > Date.now());

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-strong rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 grid place-items-center rounded-xl bg-primary/10 text-primary"><ScanLine className="h-5 w-5" /></div>
          <div>
            <div className="font-bold">Check-In Kehadiran</div>
            <div className="text-[11px] text-muted-foreground">Scan QR atau masukkan kode manual</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nama Lengkap">
            <input className="form-inp" placeholder="cth: Pak Sudarmaji" value={nama} onChange={(e) => setNama(e.target.value)} autoComplete="off" />
            {sugg.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {sugg.map((s) => (
                  <button key={s} type="button" onClick={() => setNama(s)} className="text-[11px] px-2 py-1 rounded-full glass">{s}</button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Kode QR">
            <input className="form-inp font-mono tracking-widest" placeholder="RT06-XX-XXXXXX" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setShowCam((v) => !v)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl glass py-3 text-sm font-semibold">
              <Camera className="h-4 w-4" /> {showCam ? "Tutup Kamera" : "Scan Kamera"}
            </button>
            <button type="submit" className="rounded-2xl gradient-primary text-primary-foreground py-3 text-sm font-semibold shadow-glow">Check-In</button>
          </div>
        </form>
        {showCam && <div ref={camRef} className="rounded-2xl overflow-hidden bg-black aspect-square w-full" />}
        {msg && (
          <div className={["rounded-xl px-3 py-2 text-sm flex items-start gap-2", msg.ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"].join(" ")}>
            {msg.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            <span>{msg.pesan}</span>
          </div>
        )}
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="font-bold mb-2">Kegiatan dengan QR Aktif</div>
        {aktif.length === 0 ? (
          <div className="text-xs text-muted-foreground">Tidak ada QR aktif saat ini.</div>
        ) : (
          <ul className="space-y-2">
            {aktif.map((k) => (
              <li key={k.id} className="glass rounded-xl p-3 text-sm">
                <div className="font-semibold">{k.nama}</div>
                <div className="text-[11px] text-muted-foreground">{tanggal(k.tanggal)} · {k.jam} · {k.lokasi}</div>
                <button type="button" onClick={() => setKode(k.qrToken)} className="mt-1 font-mono text-xs text-primary underline">{k.qrToken}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- REKAP PANEL ---------------- */

function RekapPanel({ kegiatan, hadir, totalWarga }: { kegiatan: Kegiatan[]; hadir: Kehadiran[]; totalWarga: number }) {
  const rows = kegiatan.map((k) => {
    const h = hadir.filter((x) => x.kegiatanId === k.id).length;
    return { k, hadir: h, tidak: Math.max(0, totalWarga - h), pct: totalWarga ? Math.round((h / totalWarga) * 100) : 0 };
  });

  if (rows.length === 0) return <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Belum ada kegiatan.</div>;

  const avg = Math.round(rows.reduce((s, r) => s + r.pct, 0) / Math.max(1, rows.length));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Total Kegiatan" value={kegiatan.length} />
        <Stat label="Total Check-In" value={hadir.length} />
        <Stat label="Rata Kehadiran" value={`${avg}%`} />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_56px_56px_64px] sm:grid-cols-[2fr_80px_80px_140px] text-[10px] sm:text-[11px] font-bold uppercase text-muted-foreground px-3 py-2 border-b border-border">
          <span>Kegiatan</span><span className="text-right">Hadir</span><span className="text-right">Tidak</span><span className="text-right">%</span>
        </div>
        {rows.map((r) => (
          <div key={r.k.id} className="grid grid-cols-[1fr_56px_56px_64px] sm:grid-cols-[2fr_80px_80px_140px] items-center px-3 py-2.5 text-sm border-b border-border/50 last:border-0">
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.k.nama}</div>
              <div className="text-[10px] text-muted-foreground">{tanggal(r.k.tanggal)}</div>
            </div>
            <span className="text-right font-bold text-emerald-600 tabular-nums">{r.hadir}</span>
            <span className="text-right font-bold text-muted-foreground tabular-nums">{r.tidak}</span>
            <div className="text-right">
              <div className="text-xs font-bold tabular-nums">{r.pct}%</div>
              <div className="hidden sm:block h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                <div className="h-full gradient-primary" style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- RIWAYAT PANEL ---------------- */

function RiwayatPanel({ kegiatan, hadir }: { kegiatan: Kegiatan[]; hadir: Kehadiran[] }) {
  const [q, setQ] = useState("");
  const map = new Map(kegiatan.map((k) => [k.id, k]));
  const rows = [...hadir].sort((a, b) => b.waktu.localeCompare(a.waktu))
    .filter((h) => !q || h.nama.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Cari nama warga…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Belum ada riwayat kehadiran.</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          {rows.map((h) => {
            const k = map.get(h.kegiatanId);
            return (
              <div key={h.id} className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{h.nama}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{k?.nama ?? "Kegiatan dihapus"} · {k ? tanggal(k.tanggal) : "-"}</div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Hadir
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- STATISTIK PANEL ---------------- */

function StatistikPanel({ kegiatan, hadir }: { kegiatan: Kegiatan[]; hadir: Kehadiran[] }) {
  const byKegiatan = kegiatan.map((k) => ({ k, count: hadir.filter((h) => h.kegiatanId === k.id).length }))
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...byKegiatan.map((r) => r.count));

  const wargaCount = new Map<string, number>();
  hadir.forEach((h) => wargaCount.set(h.nama, (wargaCount.get(h.nama) ?? 0) + 1));
  const topWarga = [...wargaCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ramai = byKegiatan[0];

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div className="font-bold">Kegiatan Paling Ramai</div>
          </div>
          {ramai && ramai.count > 0 ? (
            <>
              <div className="font-semibold">{ramai.k.nama}</div>
              <div className="text-xs text-muted-foreground">{tanggal(ramai.k.tanggal)} · {ramai.k.lokasi}</div>
              <div className="mt-2 text-2xl font-bold text-primary">{ramai.count} <span className="text-sm font-normal text-muted-foreground">warga hadir</span></div>
            </>
          ) : <div className="text-xs text-muted-foreground">Belum ada data.</div>}
        </div>
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <div className="font-bold">Warga Paling Aktif</div>
          </div>
          {topWarga.length === 0 ? (
            <div className="text-xs text-muted-foreground">Belum ada data.</div>
          ) : (
            <ol className="space-y-1.5">
              {topWarga.map(([n, c], i) => (
                <li key={n} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={["h-6 w-6 grid place-items-center rounded-full text-[11px] font-bold",
                      i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-muted"].join(" ")}>{i + 1}</span>
                    {n}
                  </span>
                  <span className="font-bold text-primary">{c}×</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div className="font-bold">Grafik Kehadiran per Kegiatan</div>
        </div>
        {byKegiatan.length === 0 ? (
          <div className="text-xs text-muted-foreground">Belum ada kegiatan.</div>
        ) : (
          <div className="space-y-2">
            {byKegiatan.map((r) => (
              <div key={r.k.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate font-medium pr-2">{r.k.nama}</span>
                  <span className="font-bold tabular-nums shrink-0">{r.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-primary transition-all" style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- SHARED UI ---------------- */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-3 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-xl hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">{children}</span>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}