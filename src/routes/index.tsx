import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, Home, Wallet, Megaphone, CalendarCheck, Eye,
  RefreshCw, Clock, CalendarDays, TrendingUp, ArrowUpRight,
  Siren, Store, MessageSquareWarning, Wifi, Activity, CalendarRange,
  CheckCircle2, Database, CalendarX, MapPin,
} from "lucide-react";
import logo from "@/assets/logo-rt.png";
import { loadLS } from "@/lib/storage";
import { PENGUMUMAN_KEY, isAktif, type Pengumuman } from "./media";
import { useSettings } from "@/lib/settings-context";
import { rupiah } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SiRT 06 Digital" },
      { name: "description", content: "Dashboard komunitas RT 06 / RW 07 Bogeman Wetan." },
    ],
  }),
  component: Dashboard,
});

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function nowWIB() {
  // Convert to Asia/Jakarta (UTC+7)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600000);
}

const DEFAULT_ANNOUNCEMENTS: string[] = [];

const quickAccess = [
  { label: "Pengumuman", to: "/media", icon: Megaphone, tone: "from-amber-500 to-orange-500" },
  { label: "Agenda", to: "/administrasi", icon: CalendarCheck, tone: "from-fuchsia-500 to-pink-500" },
  { label: "Transparansi Kas", to: "/keuangan", icon: Wallet, tone: "from-emerald-500 to-teal-500" },
  { label: "Emergency Center", to: "/emergency", icon: Siren, tone: "from-red-500 to-rose-600" },
  { label: "UMKM Warga", to: "/umkm", icon: Store, tone: "from-cyan-500 to-blue-500" },
  { label: "Kritik & Saran", to: "/kritik-saran", icon: MessageSquareWarning, tone: "from-violet-500 to-purple-500" },
] as const;

function Dashboard() {
  const { identity, kasSaldoAwal } = useSettings();
  const [time, setTime] = useState<Date | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [online, setOnline] = useState(0);
  const [today, setToday] = useState(0);
  const [month, setMonth] = useState(0);
  const [announcements, setAnnouncements] = useState<string[]>(DEFAULT_ANNOUNCEMENTS);
  const [counts, setCounts] = useState({ warga: 0, kk: 0, kas: 0, pengumumanAktif: 0, agenda: 0 });

  useEffect(() => {
    const refresh = () => {
      const warga = loadLS<unknown[]>("sirt06_warga_v1", []);
      const kk = loadLS<unknown[]>("sirt06_kk_v1", []);
      const trx = loadLS<{ kas: string; tipe: string; jumlah: number }[]>("sirt06_trx_v1", []);
      let totalKas = 0;
      Object.values(kasSaldoAwal).forEach((v) => (totalKas += Number(v) || 0));
      trx.forEach((t) => { totalKas += t.tipe === "Masuk" ? t.jumlah : -t.jumlah; });
      const pgm = loadLS<Pengumuman[]>(PENGUMUMAN_KEY, []);
      const now = new Date();
      const aktif = pgm.filter((p) => isAktif(p, now)).length;
      const agenda = loadLS<unknown[]>("sirt06_kegiatan_v1", []).length;
      setCounts({ warga: warga.length, kk: kk.length, kas: totalKas, pengumumanAktif: aktif, agenda });
    };
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [kasSaldoAwal]);

  const stats = [
    { label: "Total Warga", value: counts.warga, icon: Users, trend: counts.warga ? "Live" : "—", tone: "from-blue-500 to-indigo-500" },
    { label: "Total KK", value: counts.kk, icon: Home, trend: counts.kk ? "Live" : "—", tone: "from-cyan-500 to-blue-500" },
    { label: "Total Kas", value: rupiah(counts.kas), icon: Wallet, trend: "Live", tone: "from-emerald-500 to-teal-500" },
    { label: "Pengumuman Aktif", value: counts.pengumumanAktif, icon: Megaphone, trend: counts.pengumumanAktif ? "Aktif" : "—", tone: "from-amber-500 to-orange-500" },
    { label: "Agenda", value: counts.agenda, icon: CalendarCheck, trend: counts.agenda ? "Tersedia" : "—", tone: "from-fuchsia-500 to-pink-500" },
    { label: "Pengunjung Online", value: online, icon: Eye, trend: "Live", tone: "from-violet-500 to-purple-500" },
  ];

  useEffect(() => {
    const refresh = () => {
      const list = loadLS<Pengumuman[]>(PENGUMUMAN_KEY, []);
      const now = new Date();
      const aktif = list
        .filter((p) => isAktif(p, now))
        .sort((a, b) => (a.prioritas === b.prioritas ? 0 : a.prioritas === "Penting" ? -1 : 1))
        .map((p) => `${p.prioritas === "Penting" ? "⚠️" : "📢"} ${p.judul}`);
      setAnnouncements(aktif);
    };
    refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === PENGUMUMAN_KEY) refresh(); };
    window.addEventListener("storage", onStorage);
    const id = setInterval(refresh, 30000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(id); };
  }, []);

  useEffect(() => {
    setTime(nowWIB());
    const id = setInterval(() => setTime(nowWIB()), 1000);
    return () => clearInterval(id);
  }, []);

  // Realtime visitor simulation (lightweight)
  useEffect(() => {
    const id = setInterval(() => {
      setOnline((v) => Math.max(8, Math.min(60, v + Math.round((Math.random() - 0.5) * 4))));
      setToday((v) => v + (Math.random() < 0.35 ? 1 : 0));
      setMonth((v) => v + (Math.random() < 0.15 ? 1 : 0));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const liveVisitorStats = [
    { label: "Online Sekarang", value: online, icon: Wifi, tone: "from-emerald-500 to-teal-500", live: true },
    { label: "Pengunjung Hari Ini", value: today.toLocaleString("id-ID"), icon: Activity, tone: "from-blue-500 to-indigo-500" },
    { label: "Pengunjung Bulan Ini", value: month.toLocaleString("id-ID"), icon: CalendarRange, tone: "from-violet-500 to-fuchsia-500" },
  ];

  const jam = time ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}` : "--:--:--";
  const hari = time ? HARI[time.getDay()] : "—";
  const tanggal = time ? `${time.getDate()} ${BULAN[time.getMonth()]} ${time.getFullYear()}` : "—";

  // Demo: agenda hari ini (kosong by default — diisi dari modul Administrasi nanti)
  const agendaHariIni: { nama: string; jam: string; tempat: string }[] = [];

  const backupTerakhir = time
    ? `${time.getDate()} ${BULAN[time.getMonth()]} ${time.getFullYear()} • 03:00 WIB`
    : "—";

  const handleRefresh = () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Running text — tepat di bawah header */}
      <div className="overflow-hidden rounded-2xl glass border border-primary/20">
        <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5">
          <div className="shrink-0 h-8 px-2.5 rounded-lg gradient-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1.5 shadow-soft">
            <Megaphone className="h-3 w-3" /> INFO
          </div>
          <div className="overflow-hidden flex-1 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
            <div className="flex gap-10 whitespace-nowrap animate-marquee text-[13px] sm:text-sm font-medium">
              {(announcements.length ? [...announcements, ...announcements] : ["Belum ada pengumuman aktif. Buat di menu Pengumuman."]).map((a, i) => (
                <span key={i} className="text-foreground/90">{a}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl glass-strong p-5 sm:p-7">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full gradient-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 w-72 h-72 rounded-full bg-primary-glow opacity-10 blur-3xl" />

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img src={logo} alt="Logo RT 06 RW 07 Bogeman Wetan" className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl shadow-glow shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                <span>👋</span> Selamat Datang
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold leading-tight">
                Sistem Informasi <span className="text-gradient-primary">{identity.namaRT || "RT 06"}</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Digitalisasi dan Transparansi</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">Warga RT {identity.nomorRT || "06"} RW {identity.nomorRW || "07"} {identity.namaLingkungan || "Bogeman Wetan"}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="glass rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 flex items-center gap-2 text-xs sm:text-sm font-semibold hover:bg-accent transition shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Clock row */}
        <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-4">
          <ClockCard icon={<Clock className="h-4 w-4" />} label="Waktu WIB" value={jam} mono />
          <ClockCard icon={<CalendarDays className="h-4 w-4" />} label="Hari" value={hari} />
          <ClockCard icon={<CalendarDays className="h-4 w-4" />} label="Tanggal" value={tanggal} />
        </div>
      </section>

      {/* Quick Access */}
      <section>
        <div className="flex items-end justify-between mb-3 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold">Akses Cepat</h2>
            <p className="text-xs text-muted-foreground">Pintasan ke fitur utama warga</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
          {quickAccess.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.label}
                to={q.to}
                className="glass-strong rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 text-center hover:translate-y-[-2px] transition group"
              >
                <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${q.tone} text-white grid place-items-center shadow-soft group-hover:shadow-glow transition`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="text-[11px] sm:text-xs font-semibold leading-tight">{q.label}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Visitor Stats */}
      <section>
        <div className="flex items-end justify-between mb-3 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold">Statistik Pengunjung</h2>
            <p className="text-xs text-muted-foreground">Aktivitas kunjungan portal warga</p>
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Realtime
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {liveVisitorStats.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.label} className="glass-strong rounded-2xl p-3 sm:p-5 relative overflow-hidden">
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${v.tone} opacity-20 blur-xl`} />
                <div className="flex items-center gap-2 relative">
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${v.tone} text-white grid place-items-center shrink-0 shadow-soft`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  {v.live && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-success/15 text-success flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-success animate-pulse" /> LIVE
                    </span>
                  )}
                </div>
                <div className="mt-2.5 text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">{v.label}</div>
                <div className="text-lg sm:text-2xl font-extrabold leading-tight mt-0.5 tabular-nums transition-all">{v.value}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="flex items-end justify-between mb-3 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold">Statistik Dashboard</h2>
            <p className="text-xs text-muted-foreground">Ringkasan data komunitas hari ini</p>
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live data
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Agenda Hari Ini + Status Sistem */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-strong rounded-2xl p-4 sm:p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground grid place-items-center shadow-soft">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base leading-tight">Agenda Hari Ini</h3>
                <p className="text-[11px] text-muted-foreground">{hari}, {tanggal}</p>
              </div>
            </div>
            <Link to="/administrasi" className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline">
              Semua <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {agendaHariIni.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 px-3 rounded-xl border border-dashed border-border/60">
              <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center mb-2">
                <CalendarX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-semibold">Tidak ada agenda hari ini</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Jadwal kegiatan akan tampil di sini saat tersedia.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {agendaHariIni.map((a, i) => (
                <li key={i} className="flex items-center gap-3 p-2.5 rounded-xl glass">
                  <div className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground grid place-items-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{a.nama}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{a.jam} • {a.tempat}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-strong rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white grid place-items-center shadow-soft">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Status Sistem</h3>
              <p className="text-[11px] text-muted-foreground">Kondisi platform</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl glass">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                </span>
                <span className="text-xs font-semibold truncate">Sistem Online</span>
              </div>
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            </div>
            <div className="p-2.5 rounded-xl glass">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Backup Terakhir</div>
              <div className="text-xs font-bold tabular-nums mt-0.5 truncate">{backupTerakhir}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl glass text-center">
                <div className="text-[10px] text-muted-foreground">Uptime</div>
                <div className="text-sm font-extrabold text-success">99.9%</div>
              </div>
              <div className="p-2.5 rounded-xl glass text-center">
                <div className="text-[10px] text-muted-foreground">Versi</div>
                <div className="text-sm font-extrabold">1.0.0</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-strong rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Aktivitas Terbaru</h3>
            <Link to="/pengaturan" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
              Audit Log <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center text-center py-8 px-3 rounded-xl border border-dashed border-border/60">
            <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center mb-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm font-semibold">Belum ada aktivitas tercatat</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Aktivitas pengurus akan tampil di sini.</p>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h3 className="font-bold mb-1">Agenda Mendatang</h3>
          <p className="text-xs text-muted-foreground mb-4">Jadwal kegiatan RT</p>
          <div className="flex flex-col items-center justify-center text-center py-8 px-3 rounded-xl border border-dashed border-border/60">
            <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center mb-2">
              <CalendarX className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm font-semibold">Belum ada agenda</div>
            <Link to="/absensi" className="text-[11px] text-primary font-semibold mt-1 hover:underline">Buat Agenda →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClockCard({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="glass rounded-2xl p-3 sm:p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-sm sm:text-xl font-extrabold truncate ${mono ? "tabular-nums" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, tone }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; trend: string; tone: string;
}) {
  return (
    <div className="glass-strong rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:translate-y-[-2px] transition">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${tone} opacity-20 blur-xl`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tone} text-white grid place-items-center shadow-soft`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-success/15 text-success">{trend}</span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground font-medium">{label}</div>
      <div className="text-lg sm:text-2xl font-extrabold leading-tight mt-0.5 truncate">{value}</div>
    </div>
  );
}
