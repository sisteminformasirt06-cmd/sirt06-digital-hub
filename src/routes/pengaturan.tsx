import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Settings, Building2, Users as UsersIcon, Phone, Wallet, Music2, Siren,
  SlidersHorizontal, DatabaseBackup, ShieldCheck, Upload, Plus, Trash2,
  Download, FileSpreadsheet, FileText as FileTextIcon, CheckCircle2,
} from "lucide-react";
import { PageHeader, Field, SubmitBtn, LoginRequired } from "./warga";
import { useSettings, type RtIdentity, type PengurusInfo, type KontakRT, type EmergencyKontak } from "@/lib/settings-context";
import { useAuth, ROLES, type Role, type StaffUser } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { KAS_LIST, type KasJenis } from "./keuangan";
import { rupiah, uid } from "@/lib/storage";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — SiRT 06 Digital" },
      { name: "description", content: "Konfigurasi sistem SiRT 06 Digital." },
    ],
  }),
  component: PengaturanPage,
});

type Tab =
  | "setup" | "identitas" | "kontak" | "kas" | "musik"
  | "emergency" | "aplikasi" | "backup" | "keamanan";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; superOnly?: boolean }[] = [
  { id: "setup", label: "Pengaturan Awal", icon: Building2, superOnly: true },
  { id: "identitas", label: "Identitas RT", icon: UsersIcon },
  { id: "kontak", label: "Kontak", icon: Phone },
  { id: "kas", label: "Saldo Awal Kas", icon: Wallet },
  { id: "musik", label: "Musik", icon: Music2 },
  { id: "emergency", label: "Emergency", icon: Siren },
  { id: "aplikasi", label: "Aplikasi", icon: SlidersHorizontal },
  { id: "backup", label: "Backup", icon: DatabaseBackup },
  { id: "keamanan", label: "Keamanan", icon: ShieldCheck },
];

function PengaturanPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("setup");
  if (!user) return <LoginRequired modul="Pengaturan" />;
  const isSuper = user.role === "Super Admin";

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader title="Pengaturan" desc="Konfigurasi sistem & profil RT" icon={Settings} />

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.filter((t) => !t.superOnly || isSuper).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${tab === t.id ? "gradient-primary text-primary-foreground shadow-glow" : "glass"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "setup" && isSuper && <SetupAwal />}
      {tab === "identitas" && <IdentitasPengurus />}
      {tab === "kontak" && <KontakSection />}
      {tab === "kas" && <KasSection />}
      {tab === "musik" && <MusikSection />}
      {tab === "emergency" && <EmergencySection />}
      {tab === "aplikasi" && <AplikasiSection />}
      {tab === "backup" && <BackupSection />}
      {tab === "keamanan" && <KeamananSection isSuper={isSuper} />}
    </div>
  );
}

/* ---------- Setup Awal ---------- */
function SetupAwal() {
  const { identity, setIdentity, setupDone, setSetupDone } = useSettings();
  const [f, setF] = useState<RtIdentity>(identity);
  const [saved, setSaved] = useState(false);
  const set = (p: Partial<RtIdentity>) => setF((prev) => ({ ...prev, ...p }));

  return (
    <Card title="Pengaturan Awal" desc="Identitas lokasi RT (Super Admin)">
      <form
        onSubmit={(e) => { e.preventDefault(); setIdentity(f); setSetupDone(true); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <Field label="Nama RT"><input className="form-inp" value={f.namaRT} onChange={(e) => set({ namaRT: e.target.value })} /></Field>
        <Field label="Nomor RT"><input className="form-inp" value={f.nomorRT} onChange={(e) => set({ nomorRT: e.target.value })} /></Field>
        <Field label="Nomor RW"><input className="form-inp" value={f.nomorRW} onChange={(e) => set({ nomorRW: e.target.value })} /></Field>
        <Field label="Nama Lingkungan"><input className="form-inp" value={f.namaLingkungan} onChange={(e) => set({ namaLingkungan: e.target.value })} /></Field>
        <Field label="Kelurahan"><input className="form-inp" value={f.kelurahan} onChange={(e) => set({ kelurahan: e.target.value })} /></Field>
        <Field label="Kecamatan"><input className="form-inp" value={f.kecamatan} onChange={(e) => set({ kecamatan: e.target.value })} /></Field>
        <Field label="Kota"><input className="form-inp" value={f.kota} onChange={(e) => set({ kota: e.target.value })} /></Field>
        <Field label="Provinsi"><input className="form-inp" value={f.provinsi} onChange={(e) => set({ provinsi: e.target.value })} /></Field>
        <Field label="Kode Pos"><input className="form-inp" value={f.kodePos} onChange={(e) => set({ kodePos: e.target.value })} /></Field>
        <div className="sm:col-span-2 flex items-center gap-2">
          <button type="submit" className="rounded-2xl gradient-primary text-primary-foreground py-2 px-4 text-sm font-semibold shadow-glow">Simpan Pengaturan</button>
          {setupDone && <span className="text-[11px] inline-flex items-center gap-1 text-success font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Setup selesai</span>}
          {saved && <span className="text-[11px] text-success">Tersimpan ✓</span>}
        </div>
      </form>
    </Card>
  );
}

/* ---------- Identitas Pengurus ---------- */
function IdentitasPengurus() {
  const { pengurus, setPengurus } = useSettings();
  const [f, setF] = useState<PengurusInfo>(pengurus);
  const [saved, setSaved] = useState(false);
  const logoRTRef = useRef<HTMLInputElement>(null);
  const logoRWRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<PengurusInfo>) => setF((prev) => ({ ...prev, ...p }));

  const readImg = (file: File, cb: (data: string) => void) => {
    if (file.size > 2 * 1024 * 1024) { alert("Maks 2MB"); return; }
    const r = new FileReader();
    r.onload = () => cb(String(r.result));
    r.readAsDataURL(file);
  };

  return (
    <Card title="Identitas RT" desc="Logo dan susunan pengurus">
      <form
        onSubmit={(e) => { e.preventDefault(); setPengurus(f); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <LogoUpload label="Logo RT" data={f.logoRT} onPick={() => logoRTRef.current?.click()} onClear={() => set({ logoRT: undefined })} />
          <LogoUpload label="Logo RW" data={f.logoRW} onPick={() => logoRWRef.current?.click()} onClear={() => set({ logoRW: undefined })} />
          <input ref={logoRTRef} type="file" accept="image/*" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) readImg(fl, (d) => set({ logoRT: d })); }} />
          <input ref={logoRWRef} type="file" accept="image/*" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) readImg(fl, (d) => set({ logoRW: d })); }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Ketua RT"><input className="form-inp" value={f.ketuaRT} onChange={(e) => set({ ketuaRT: e.target.value })} /></Field>
          <Field label="Masa Jabatan"><input className="form-inp" placeholder="2024 - 2027" value={f.masaJabatan} onChange={(e) => set({ masaJabatan: e.target.value })} /></Field>
          <Field label="Sekretaris"><input className="form-inp" value={f.sekretaris} onChange={(e) => set({ sekretaris: e.target.value })} /></Field>
          <Field label="Bendahara 1"><input className="form-inp" value={f.bendahara1} onChange={(e) => set({ bendahara1: e.target.value })} /></Field>
          <Field label="Bendahara 2"><input className="form-inp" value={f.bendahara2} onChange={(e) => set({ bendahara2: e.target.value })} /></Field>
          <Field label="Humas"><input className="form-inp" value={f.humas} onChange={(e) => set({ humas: e.target.value })} /></Field>
          <Field label="Keamanan 1"><input className="form-inp" value={f.keamanan1} onChange={(e) => set({ keamanan1: e.target.value })} /></Field>
          <Field label="Keamanan 2"><input className="form-inp" value={f.keamanan2} onChange={(e) => set({ keamanan2: e.target.value })} /></Field>
          <Field label="Sie Perlengkapan"><input className="form-inp" value={f.siePerlengkapan} onChange={(e) => set({ siePerlengkapan: e.target.value })} /></Field>
          <Field label="Sie Kematian"><input className="form-inp" value={f.sieKematian} onChange={(e) => set({ sieKematian: e.target.value })} /></Field>
          <Field label="Sie Umum"><input className="form-inp" value={f.sieUmum} onChange={(e) => set({ sieUmum: e.target.value })} /></Field>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="submit" className="rounded-2xl gradient-primary text-primary-foreground py-2 px-4 text-sm font-semibold shadow-glow">Simpan Identitas</button>
          {saved && <span className="text-[11px] text-success">Tersimpan ✓</span>}
        </div>
      </form>
    </Card>
  );
}

function LogoUpload({ label, data, onPick, onClear }: { label: string; data?: string; onPick: () => void; onClear: () => void }) {
  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-3">
      <div className="h-14 w-14 rounded-xl bg-muted grid place-items-center overflow-hidden">
        {data ? <img src={data} alt={label} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">{label}</div>
        <div className="flex gap-1 mt-1">
          <button type="button" onClick={onPick} className="text-[11px] px-2 py-1 rounded-lg glass inline-flex items-center gap-1"><Upload className="h-3 w-3" /> Upload</button>
          {data && <button type="button" onClick={onClear} className="text-[11px] px-2 py-1 rounded-lg text-destructive hover:bg-destructive/10">Hapus</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Kontak ---------- */
function KontakSection() {
  const { kontak, setKontak } = useSettings();
  const [f, setF] = useState<KontakRT>(kontak);
  const [saved, setSaved] = useState(false);
  const set = (p: Partial<KontakRT>) => setF((prev) => ({ ...prev, ...p }));
  return (
    <Card title="Kontak Resmi" desc="Sarana komunikasi resmi RT">
      <form onSubmit={(e) => { e.preventDefault(); setKontak(f); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nomor WhatsApp RT"><input className="form-inp" placeholder="628xxxxxxxxxx" value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
        <Field label="Email RT"><input type="email" className="form-inp" value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Website (opsional)"><input className="form-inp" value={f.website} onChange={(e) => set({ website: e.target.value })} /></Field>
        <Field label="Alamat Sekretariat RT"><input className="form-inp" value={f.alamatSekretariat} onChange={(e) => set({ alamatSekretariat: e.target.value })} /></Field>
        <div className="sm:col-span-2 flex items-center gap-2">
          <button type="submit" className="rounded-2xl gradient-primary text-primary-foreground py-2 px-4 text-sm font-semibold shadow-glow">Simpan Kontak</button>
          {saved && <span className="text-[11px] text-success">Tersimpan ✓</span>}
        </div>
      </form>
    </Card>
  );
}

/* ---------- Saldo Awal Kas ---------- */
function KasSection() {
  const { kasSaldoAwal, setKasSaldoAwal } = useSettings();
  const [f, setF] = useState<Record<KasJenis, number>>(kasSaldoAwal);
  const [saved, setSaved] = useState(false);
  return (
    <Card title="Saldo Awal Kas" desc="Saldo awal sebelum sistem mulai mencatat transaksi">
      <form onSubmit={(e) => { e.preventDefault(); setKasSaldoAwal(f); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {KAS_LIST.map((k) => (
            <Field key={k} label={k}>
              <input type="number" min={0} className="form-inp tabular-nums" value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: Number(e.target.value) || 0 }))} />
              <div className="text-[10px] text-muted-foreground mt-1">Saat ini: {rupiah(f[k])}</div>
            </Field>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="rounded-2xl gradient-primary text-primary-foreground py-2 px-4 text-sm font-semibold shadow-glow">Simpan Saldo Awal</button>
          {saved && <span className="text-[11px] text-success">Tersimpan ✓</span>}
        </div>
      </form>
    </Card>
  );
}

/* ---------- Musik ---------- */
function MusikSection() {
  const { musik, setMusik } = useSettings();
  // The actual file upload happens via the floating music player. Settings hold prefs only.
  return (
    <Card title="Pengaturan Musik" desc="Upload, ganti, hapus lagu via Floating Player. Atur volume awal & aktif/nonaktif di sini.">
      <div className="space-y-3">
        <div className="flex items-center justify-between glass rounded-2xl p-3">
          <div>
            <div className="text-sm font-semibold">Aktifkan Music Player</div>
            <div className="text-[11px] text-muted-foreground">Tampilkan tombol musik mengambang.</div>
          </div>
          <button
            onClick={() => setMusik({ ...musik, aktif: !musik.aktif })}
            className={`relative h-7 w-12 rounded-full transition ${musik.aktif ? "bg-success" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${musik.aktif ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        <Field label={`Volume Awal: ${Math.round(musik.volumeAwal * 100)}%`}>
          <input type="range" min={0} max={1} step={0.05} value={musik.volumeAwal}
            onChange={(e) => setMusik({ ...musik, volumeAwal: Number(e.target.value) })}
            className="w-full accent-primary" />
        </Field>
        <div className="text-[11px] text-muted-foreground glass rounded-xl p-3">
          <strong>Upload / Ganti / Hapus Lagu:</strong> Buka Floating Music Player di pojok kanan bawah, klik tombol Upload untuk mengganti MP3 atau Stop untuk menghapus.
        </div>
      </div>
    </Card>
  );
}

/* ---------- Emergency ---------- */
function EmergencySection() {
  const { emergency, setEmergency } = useSettings();
  const [draft, setDraft] = useState<{ kategori: "Internal" | "Instansi"; label: string; nomor: string }>({ kategori: "Internal", label: "", nomor: "" });

  const add = () => {
    if (!draft.label.trim()) return;
    setEmergency([...emergency, { id: uid("emc"), ...draft }]);
    setDraft({ kategori: draft.kategori, label: "", nomor: "" });
  };
  const update = (id: string, patch: Partial<EmergencyKontak>) =>
    setEmergency(emergency.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => setEmergency(emergency.filter((e) => e.id !== id));

  const internal = emergency.filter((e) => e.kategori === "Internal");
  const instansi = emergency.filter((e) => e.kategori === "Instansi");

  return (
    <Card title="Kontak Emergency" desc="Nomor cepat untuk panic button">
      <div className="space-y-4">
        {(["Internal", "Instansi"] as const).map((kat) => {
          const items = kat === "Internal" ? internal : instansi;
          return (
            <div key={kat}>
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">{kat}</div>
              <div className="space-y-2">
                {items.length === 0 && <div className="text-[11px] text-muted-foreground italic">Belum ada kontak.</div>}
                {items.map((c) => (
                  <div key={c.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input className="form-inp" value={c.label} onChange={(e) => update(c.id, { label: e.target.value })} />
                    <input className="form-inp tabular-nums" placeholder="08xx" value={c.nomor} onChange={(e) => update(c.id, { nomor: e.target.value })} />
                    <button onClick={() => remove(c.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="glass rounded-2xl p-3 space-y-2">
          <div className="text-xs font-semibold">Tambah Kontak Baru</div>
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
            <select className="form-inp" value={draft.kategori} onChange={(e) => setDraft({ ...draft, kategori: e.target.value as "Internal" | "Instansi" })}>
              <option>Internal</option>
              <option>Instansi</option>
            </select>
            <input className="form-inp" placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <input className="form-inp tabular-nums" placeholder="Nomor" value={draft.nomor} onChange={(e) => setDraft({ ...draft, nomor: e.target.value })} />
            <button onClick={add} className="p-2 rounded-lg gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Aplikasi ---------- */
function AplikasiSection() {
  const { theme, setTheme } = useTheme();
  return (
    <Card title="Preferensi Aplikasi" desc="Tampilan, bahasa, waktu, format">
      <div className="space-y-2">
        <Row label="Tema">
          <div className="flex gap-1.5">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${theme === t ? "gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>{t === "light" ? "Terang" : "Gelap"}</button>
            ))}
          </div>
        </Row>
        <Row label="Bahasa"><span className="text-sm font-semibold">Indonesia</span></Row>
        <Row label="Zona Waktu"><span className="text-sm font-semibold">WIB (UTC+7)</span></Row>
        <Row label="Format Tanggal"><span className="text-sm font-semibold">Indonesia (dd MMM yyyy)</span></Row>
        <Row label="Mata Uang"><span className="text-sm font-semibold">Rupiah (Rp)</span></Row>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between glass rounded-xl px-3 py-2.5">
      <div className="text-xs text-muted-foreground font-semibold">{label}</div>
      {children}
    </div>
  );
}

/* ---------- Backup ---------- */
const BACKUP_KEYS = [
  "sirt06_warga_v1", "sirt06_kk_v1", "sirt06_mutasi_v1",
  "sirt06_trx_v1", "sirt06_barang_v1", "sirt06_pinjaman_v1",
  "sirt06_kegiatan_v1", "sirt06_kehadiran_v1",
  "sirt06_pengumuman_v1", "sirt06_kritik_saran_v1",
  "sirt06_settings_identity_v1", "sirt06_settings_pengurus_v1",
  "sirt06_settings_kontak_v1", "sirt06_settings_kas_saldo_v1",
  "sirt06_settings_emergency_v1", "sirt06_settings_app_v1",
  "sirt06_settings_musik_v1", "sirt06_staff_users_v1", "sirt06_audit_v1",
];

function BackupSection() {
  const [msg, setMsg] = useState<string | null>(null);

  const downloadJSON = () => {
    const data: Record<string, unknown> = {};
    BACKUP_KEYS.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw) data[k] = JSON.parse(raw);
    });
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    triggerDownload(blob, `sirt06-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setMsg("Backup JSON berhasil diunduh.");
  };

  const exportExcelCSV = () => {
    const lines: string[] = [];
    BACKUP_KEYS.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (!raw) return;
      try {
        const v = JSON.parse(raw);
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
          lines.push(`# ${k}`);
          const headers = Object.keys(v[0]);
          lines.push(headers.join(","));
          v.forEach((row: Record<string, unknown>) => {
            lines.push(headers.map((h) => csvCell(row[h])).join(","));
          });
          lines.push("");
        }
      } catch { /* skip */ }
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `sirt06-data-${new Date().toISOString().slice(0, 10)}.csv`);
    setMsg("Export Excel (CSV) berhasil.");
  };

  const exportPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    let html = `<html><head><title>SiRT 06 — Backup Laporan</title>
      <style>body{font-family:sans-serif;padding:24px}h2{color:#2563EB}table{border-collapse:collapse;width:100%;margin-bottom:24px;font-size:11px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f0f4ff}</style>
    </head><body><h1>SiRT 06 Digital — Backup Laporan</h1><p>Dicetak: ${new Date().toLocaleString("id-ID")}</p>`;
    BACKUP_KEYS.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (!raw) return;
      try {
        const v = JSON.parse(raw);
        html += `<h2>${k}</h2>`;
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
          const headers = Object.keys(v[0]);
          html += "<table><thead><tr>" + headers.map((h) => `<th>${h}</th>`).join("") + "</tr></thead><tbody>";
          v.forEach((row: Record<string, unknown>) => {
            html += "<tr>" + headers.map((h) => `<td>${String(row[h] ?? "").slice(0, 200)}</td>`).join("") + "</tr>";
          });
          html += "</tbody></table>";
        } else {
          html += `<pre>${JSON.stringify(v, null, 2)}</pre>`;
        }
      } catch { /* skip */ }
    });
    html += "</body></html>";
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
    setMsg("Pratinjau PDF dibuka — silakan cetak/simpan PDF.");
  };

  return (
    <Card title="Backup & Export" desc="Backup manual dan placeholder integrasi Google Drive">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button onClick={exportExcelCSV} className="glass rounded-2xl p-4 text-left hover:bg-accent transition">
            <FileSpreadsheet className="h-6 w-6 text-emerald-500 mb-2" />
            <div className="text-sm font-bold">Export Excel</div>
            <div className="text-[11px] text-muted-foreground">CSV terbuka di Excel/Sheets</div>
          </button>
          <button onClick={exportPDF} className="glass rounded-2xl p-4 text-left hover:bg-accent transition">
            <FileTextIcon className="h-6 w-6 text-red-500 mb-2" />
            <div className="text-sm font-bold">Export PDF</div>
            <div className="text-[11px] text-muted-foreground">Cetak via dialog browser</div>
          </button>
          <button onClick={downloadJSON} className="glass rounded-2xl p-4 text-left hover:bg-accent transition">
            <Download className="h-6 w-6 text-primary mb-2" />
            <div className="text-sm font-bold">Backup Manual (JSON)</div>
            <div className="text-[11px] text-muted-foreground">Snapshot lengkap data</div>
          </button>
        </div>
        {msg && <div className="text-[11px] text-success">{msg}</div>}

        <div className="glass rounded-2xl p-4 border border-dashed border-border/60">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center shrink-0">
              <DatabaseBackup className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold">Integrasi Google Drive (placeholder)</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sinkronisasi otomatis ke akun <code className="px-1 rounded bg-muted text-foreground">sisteminformasirt06@gmail.com</code> akan tersedia di rilis mendatang.
              </p>
              <button disabled className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[11px] font-semibold cursor-not-allowed">
                Hubungkan Google Drive (segera hadir)
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function csvCell(v: unknown) {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Keamanan ---------- */
function KeamananSection({ isSuper }: { isSuper: boolean }) {
  const { users, addUser, updateUser, removeUser } = useAuth();
  const [nama, setNama] = useState("");
  const [role, setRole] = useState<Role>("Sekretaris");
  const [pin, setPin] = useState("");

  if (!isSuper) {
    return (
      <Card title="Keamanan" desc="Akses Role Based">
        <div className="text-xs text-muted-foreground">Hanya Super Admin yang dapat mengelola akun pengurus.</div>
      </Card>
    );
  }

  const add = () => {
    if (!nama.trim() || pin.length !== 6) { alert("Nama wajib & PIN harus 6 digit"); return; }
    addUser({ nama: nama.trim(), role, pin, aktif: true });
    setNama(""); setPin("");
  };

  return (
    <Card title="Keamanan & Akses" desc="Role Based Access — PIN 6 digit untuk pengurus, Warga tanpa login">
      <div className="space-y-3">
        <div className="glass rounded-xl p-3 text-[11px] text-muted-foreground">
          Portal warga tetap dapat diakses tanpa login. PIN 6 digit hanya untuk pengurus.
        </div>

        <div className="space-y-1.5">
          {users.map((u: StaffUser) => (
            <div key={u.id} className="glass rounded-xl p-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{u.nama}</div>
                <div className="text-[10px] text-muted-foreground">{u.role} • PIN •••{u.pin.slice(-2)}</div>
              </div>
              <select
                className="form-inp text-xs py-1"
                value={u.role}
                onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
              >
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <button
                onClick={() => updateUser(u.id, { aktif: !u.aktif })}
                className={`text-[10px] px-2 py-1 rounded-lg font-bold ${u.aktif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
              >
                {u.aktif ? "AKTIF" : "NONAKTIF"}
              </button>
              <button onClick={() => removeUser(u.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-3 space-y-2">
          <div className="text-xs font-semibold">Tambah Pengurus</div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
            <input className="form-inp" placeholder="Nama pengurus" value={nama} onChange={(e) => setNama(e.target.value)} />
            <select className="form-inp" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.filter((r) => r !== "Warga").map((r) => <option key={r}>{r}</option>)}
            </select>
            <input className="form-inp tabular-nums" placeholder="PIN 6 digit" maxLength={6} inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <button onClick={add} className="rounded-xl gradient-primary text-primary-foreground px-3 text-xs font-semibold inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Tambah</button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Shared Card ---------- */
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

// Helpers
function _unused() { return { Upload, SubmitBtn }; }