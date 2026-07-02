import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ShieldCheck, Users, KeySquare, Settings, FileText, History,
  Database, Plus, Trash2, RotateCcw, Power, Filter, Crown, Activity,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, ROLES, type Role } from "@/lib/auth-context";
import {
  listPengurus, createPengurus, updatePengurus, deletePengurus, resetPin, listAudit,
} from "@/lib/pengurus.functions";
import { JABATAN_LABEL, labelToJabatan, jabatanToLabel, type Jabatan } from "@/lib/role-map";

export const Route = createFileRoute("/super-admin")({
  head: () => ({
    meta: [
      { title: "Super Admin — SiRT 06 Digital" },
      { name: "description", content: "Pusat kontrol Super Admin: manajemen pengurus, hak akses, audit log, dan backup." },
    ],
  }),
  component: SuperAdminPage,
});

type Tab = "dashboard" | "users" | "akses" | "identitas" | "sistem" | "audit" | "backup";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "dashboard", label: "Dashboard Sistem", icon: Activity },
  { id: "users", label: "Manajemen Pengguna", icon: Users },
  { id: "akses", label: "Hak Akses", icon: KeySquare },
  { id: "identitas", label: "Identitas RT", icon: ShieldCheck },
  { id: "sistem", label: "Pengaturan Sistem", icon: Settings },
  { id: "audit", label: "Audit Log", icon: History },
  { id: "backup", label: "Backup", icon: Database },
];

function SuperAdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!user) {
    return (
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 text-center space-y-3">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
        <div className="text-base font-bold">Akses Terbatas</div>
        <div className="text-xs text-muted-foreground">Silakan login sebagai Super Admin untuk mengakses halaman ini.</div>
        <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold">Login</Link>
      </div>
    );
  }

  if (user.role !== "Super Admin") {
    return (
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 text-center space-y-2">
        <ShieldCheck className="h-10 w-10 mx-auto text-destructive" />
        <div className="text-base font-bold">Hanya untuk Super Admin</div>
        <div className="text-xs text-muted-foreground">Akun Anda ({user.role}) tidak memiliki izin membuka modul ini.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="glass-strong rounded-3xl p-4 sm:p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
          <Crown className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight">Super Admin</h1>
          <p className="text-[11px] text-muted-foreground">Pusat kontrol sistem SiRT 06 Digital</p>
        </div>
      </header>

      <nav className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              tab === id ? "gradient-primary text-primary-foreground shadow-glow" : "glass hover:bg-accent"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && <DashboardSection />}
      {tab === "users" && <UsersSection />}
      {tab === "akses" && <AksesSection />}
      {tab === "identitas" && <IdentitasShortcut />}
      {tab === "sistem" && <SistemShortcut />}
      {tab === "audit" && <AuditSection />}
      {tab === "backup" && <BackupShortcut />}
    </div>
  );
}

/* ---------------- Dashboard Sistem ---------------- */
function DashboardSection() {
  const fnList = useServerFn(listPengurus);
  const fnAudit = useServerFn(listAudit);
  const usersQ = useQuery({ queryKey: ["pengurus", "list"], queryFn: () => fnList() });
  const auditQ = useQuery({ queryKey: ["audit", "list"], queryFn: () => fnAudit() });
  const users = (usersQ.data ?? []) as any[];
  const audits = (auditQ.data ?? []) as any[];
  const aktif = users.filter((u) => u.aktif).length;
  const locked = users.filter((u) => u.locked_until && new Date(u.locked_until) > new Date()).length;
  const last24 = audits.filter((a) => Date.now() - new Date(a.waktu).getTime() < 86400_000).length;

  const cards = [
    { label: "Total Pengurus", value: users.length, icon: Users, tone: "primary" },
    { label: "Aktif", value: aktif, icon: ShieldCheck, tone: "success" },
    { label: "Terkunci", value: locked, icon: KeySquare, tone: "warning" },
    { label: "Aktivitas 24 Jam", value: last24, icon: Activity, tone: "primary" },
  ];

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {cards.map((c) => (
          <div key={c.label} className="glass-strong rounded-2xl p-3.5">
            <c.icon className="h-4 w-4 text-primary" />
            <div className="mt-2 text-2xl font-bold tabular-nums">{c.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-strong rounded-2xl p-4">
        <h3 className="text-sm font-bold mb-2">Aktivitas Terbaru</h3>
        {audits.length === 0 ? (
          <div className="text-xs text-muted-foreground">Belum ada aktivitas tercatat.</div>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {audits.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{a.aksi} <span className="text-muted-foreground font-normal">• {a.modul}</span></div>
                  <div className="text-[10px] text-muted-foreground truncate">{a.nama}{a.detail ? ` — ${a.detail}` : ""}</div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">{new Date(a.waktu).toLocaleString("id-ID")}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ---------------- Manajemen Pengguna ---------------- */
function UsersSection() {
  const qc = useQueryClient();
  const fnList = useServerFn(listPengurus);
  const fnCreate = useServerFn(createPengurus);
  const fnUpdate = useServerFn(updatePengurus);
  const fnDelete = useServerFn(deletePengurus);
  const fnReset = useServerFn(resetPin);
  const { user: me } = useAuth();

  const q = useQuery({ queryKey: ["pengurus", "list"], queryFn: () => fnList() });
  const users = (q.data ?? []) as Array<{
    id: string; nama: string; jabatan: Jabatan; aktif: boolean;
    harus_ganti_pin: boolean; gagal_login: number;
    locked_until: string | null; last_login_at: string | null; created_at: string;
  }>;

  const [nama, setNama] = useState("");
  const [jabatan, setJabatan] = useState<Jabatan>("sekretaris");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pengurus", "list"] });

  const submit = async () => {
    setErr(null); setMsg(null);
    if (!nama.trim()) { setErr("Nama wajib diisi"); return; }
    if (pin && !/^\d{6}$/.test(pin)) { setErr("PIN harus 6 digit (atau kosongkan untuk default 123456)"); return; }
    try {
      await fnCreate({ data: { nama: nama.trim(), jabatan, pin: pin || undefined } });
      setNama(""); setPin("");
      setMsg(`Pengurus ditambahkan. PIN default: ${pin || "123456"} (wajib diganti saat login pertama).`);
      await invalidate();
    } catch (e) { setErr((e as Error).message); }
  };

  const onReset = async (id: string, n: string) => {
    if (!confirm(`Reset PIN untuk ${n}? PIN akan diatur ulang menjadi 123456.`)) return;
    try {
      await fnReset({ data: { id } });
      setMsg(`PIN ${n} direset ke 123456 dan wajib diganti saat login berikutnya.`);
      await invalidate();
    } catch (e) { setErr((e as Error).message); }
  };

  const onToggle = async (id: string, aktif: boolean) => {
    try {
      await fnUpdate({ data: { id, aktif: !aktif } });
      await invalidate();
    } catch (e) { setErr((e as Error).message); }
  };

  const onDelete = async (id: string, n: string) => {
    if (!confirm(`Hapus pengurus ${n}?`)) return;
    try { await fnDelete({ data: { id } }); await invalidate(); }
    catch (e) { setErr((e as Error).message); }
  };

  const onChangeJabatan = async (id: string, j: Jabatan) => {
    try { await fnUpdate({ data: { id, jabatan: j } }); await invalidate(); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <section className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold">Tambah Pengurus</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
          <input className="form-inp" placeholder="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} />
          <select className="form-inp" value={jabatan} onChange={(e) => setJabatan(e.target.value as Jabatan)}>
            {Object.entries(JABATAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="form-inp tabular-nums" placeholder="PIN (opsional)" maxLength={6} inputMode="numeric"
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          <button onClick={submit} className="rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-xs font-semibold inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Tambah
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground">Kosongkan PIN untuk menggunakan default <b>123456</b>. Pengguna wajib mengganti PIN saat login pertama.</div>
        {err && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{err}</div>}
        {msg && <div className="text-xs text-success bg-success/10 rounded-lg px-3 py-2">{msg}</div>}
      </div>

      <div className="space-y-2">
        {q.isPending && <div className="text-xs text-muted-foreground">Memuat…</div>}
        {users.map((u) => {
          const lockedActive = u.locked_until && new Date(u.locked_until) > new Date();
          return (
            <div key={u.id} className="glass-strong rounded-2xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{u.nama}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {jabatanToLabel(u.jabatan)} • Dibuat {new Date(u.created_at).toLocaleDateString("id-ID")}
                    {u.last_login_at ? ` • Login terakhir ${new Date(u.last_login_at).toLocaleString("id-ID")}` : " • Belum pernah login"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.aktif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {u.aktif ? "AKTIF" : "NONAKTIF"}
                  </span>
                  {u.harus_ganti_pin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-bold">WAJIB GANTI PIN</span>}
                  {lockedActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">TERKUNCI</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <select className="form-inp text-xs py-1.5" value={u.jabatan} onChange={(e) => onChangeJabatan(u.id, e.target.value as Jabatan)}>
                  {Object.entries(JABATAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => onToggle(u.id, u.aktif)} className="rounded-xl glass text-xs py-1.5 font-semibold inline-flex items-center justify-center gap-1">
                  <Power className="h-3.5 w-3.5" /> {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button onClick={() => onReset(u.id, u.nama)} className="rounded-xl bg-warning/15 text-warning text-xs py-1.5 font-semibold inline-flex items-center justify-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset PIN
                </button>
                <button
                  onClick={() => onDelete(u.id, u.nama)}
                  disabled={me?.id === u.id}
                  className="rounded-xl bg-destructive/15 text-destructive text-xs py-1.5 font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </button>
              </div>
            </div>
          );
        })}
        {!q.isPending && users.length === 0 && <div className="text-xs text-muted-foreground">Belum ada pengurus.</div>}
      </div>
    </section>
  );
}

/* ---------------- Hak Akses ---------------- */
function AksesSection() {
  const matrix: { modul: string; roles: Role[] }[] = [
    { modul: "Super Admin", roles: ["Super Admin"] },
    { modul: "Manajemen Pengurus & Reset PIN", roles: ["Super Admin"] },
    { modul: "Pengaturan Identitas & Sistem", roles: ["Super Admin", "Ketua RT"] },
    { modul: "Data Warga & KK", roles: ["Super Admin", "Ketua RT", "Sekretaris"] },
    { modul: "Keuangan 5 Kas", roles: ["Super Admin", "Ketua RT", "Bendahara 1", "Bendahara 2"] },
    { modul: "Inventaris", roles: ["Super Admin", "Ketua RT", "Sekretaris", "Sie Perlengkapan"] },
    { modul: "Absensi & Kegiatan", roles: ["Super Admin", "Ketua RT", "Sekretaris", "Humas"] },
    { modul: "Pengumuman & Media", roles: ["Super Admin", "Ketua RT", "Sekretaris", "Humas"] },
    { modul: "Kritik & Saran (Tindak Lanjut)", roles: ["Super Admin", "Ketua RT", "Sekretaris"] },
    { modul: "Emergency / Keamanan", roles: ["Super Admin", "Ketua RT", "Keamanan 1", "Keamanan 2"] },
    { modul: "Audit Log", roles: ["Super Admin", "Ketua RT"] },
    { modul: "Backup Data", roles: ["Super Admin"] },
  ];
  return (
    <section className="glass-strong rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-bold">Matriks Hak Akses</h3>
      <p className="text-[11px] text-muted-foreground">Ringkasan modul vs role yang berhak. Pengaturan rinci disimpan pada masing-masing modul.</p>
      <div className="space-y-1.5">
        {matrix.map((m) => (
          <div key={m.modul} className="glass rounded-xl p-3">
            <div className="text-xs font-semibold">{m.modul}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {m.roles.map((r) => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{r}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground">Warga & publik dapat mengakses dashboard, pengumuman, dan kritik-saran tanpa login.</div>
    </section>
  );
}

/* ---------------- Audit Log ---------------- */
function AuditSection() {
  const fnAudit = useServerFn(listAudit);
  const q = useQuery({ queryKey: ["audit", "list"], queryFn: () => fnAudit() });
  const all = (q.data ?? []) as Array<{
    id: string; nama: string; role: string | null; aksi: string; modul: string; detail: string | null; waktu: string;
  }>;
  const [modul, setModul] = useState<string>("");
  const [search, setSearch] = useState("");

  const modulList = useMemo(() => Array.from(new Set(all.map((a) => a.modul))).sort(), [all]);
  const filtered = useMemo(() => {
    return all.filter((a) =>
      (!modul || a.modul === modul) &&
      (!search || (a.aksi + a.nama + (a.detail ?? "")).toLowerCase().includes(search.toLowerCase())),
    );
  }, [all, modul, search]);

  const exportCsv = () => {
    const rows = [
      ["Waktu", "Nama", "Role", "Modul", "Aksi", "Detail"],
      ...filtered.map((a) => [a.waktu, a.nama, a.role ?? "", a.modul, a.aksi, a.detail ?? ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Audit Log</h3>
          <button onClick={exportCsv} className="rounded-xl glass text-xs px-3 py-1.5 font-semibold inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Export CSV</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input className="form-inp" placeholder="Cari aksi / nama / detail…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-inp" value={modul} onChange={(e) => setModul(e.target.value)}>
            <option value="">Semua modul</option>
            {modulList.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Filter className="h-3 w-3" /> {filtered.length} entri (maks 500 terbaru)</div>
      </div>

      <div className="space-y-1.5">
        {q.isPending && <div className="text-xs text-muted-foreground">Memuat…</div>}
        {filtered.map((a) => (
          <div key={a.id} className="glass rounded-xl p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold truncate">{a.aksi} <span className="text-muted-foreground font-normal">• {a.modul}</span></div>
              <div className="text-[10px] text-muted-foreground shrink-0">{new Date(a.waktu).toLocaleString("id-ID")}</div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {a.nama}{a.role ? ` (${a.role})` : ""}{a.detail ? ` — ${a.detail}` : ""}
            </div>
          </div>
        ))}
        {!q.isPending && filtered.length === 0 && <div className="text-xs text-muted-foreground">Belum ada aktivitas tercatat.</div>}
      </div>
    </section>
  );
}

/* ---------------- Shortcuts to existing settings page ---------------- */
function ShortcutCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link to={href} className="block glass-strong rounded-2xl p-4 hover:bg-accent transition">
      <div className="text-sm font-bold">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{desc}</div>
      <div className="text-xs text-primary font-semibold mt-2">Buka pengaturan →</div>
    </Link>
  );
}
function IdentitasShortcut() {
  return <ShortcutCard title="Pengaturan Identitas RT" desc="Nama RT/RW, kelurahan, logo, dan data pengurus." href="/pengaturan" />;
}
function SistemShortcut() {
  return <ShortcutCard title="Pengaturan Sistem" desc="Musik latar, kontak emergency, format WIB & Rupiah." href="/pengaturan" />;
}
function BackupShortcut() {
  return <ShortcutCard title="Backup & Restore" desc="Ekspor JSON/CSV/PDF data sistem." href="/pengaturan" />;
}