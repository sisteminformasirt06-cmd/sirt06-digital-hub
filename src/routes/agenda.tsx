import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Plus, Search, Loader2, Pencil, Trash2, X, Eye,
  CalendarX, Archive, CheckCircle2, Clock, MapPin, Gauge,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  AGENDA_STATUS, type Agenda, type AgendaStatus,
  hariDari, tanggalPanjang, selisihHari, fetchAgenda,
  MARQUEE_SPEED_KEY, readMarqueeSpeed,
} from "@/lib/agenda-shared";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda RT — SiRT 06 Digital" },
      { name: "description", content: "Jadwal kegiatan RT 06 RW 07 Bogeman Wetan: kerja bakti, rapat warga, dan agenda lainnya." },
      { property: "og:title", content: "Agenda RT — SiRT 06 Digital" },
      { property: "og:description", content: "Jadwal kegiatan warga RT 06 RW 07 Bogeman Wetan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

type Filt = "hari" | "minggu" | "bulan" | "semua";

const emptyForm = {
  judul: "", tanggal: "", jam: "07:00", tempat: "", deskripsi: "",
  status: "Akan Datang" as AgendaStatus,
};

function statusTone(s: AgendaStatus) {
  switch (s) {
    case "Berlangsung": return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "Selesai": return "bg-muted text-muted-foreground";
    case "Dibatalkan": return "bg-red-500/15 text-red-600 dark:text-red-400";
    default: return "bg-primary/15 text-primary";
  }
}

function AgendaPage() {
  const { user, hasRole, logAction } = useAuth();
  const canEdit = hasRole("Admin", "Super Admin", "Ketua RT", "Sekretaris");
  const canApprove = hasRole("Super Admin", "Ketua RT");
  const canDelete = hasRole("Super Admin");

  const [list, setList] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filt, setFilt] = useState<Filt>("semua");
  const [showArsip, setShowArsip] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [detail, setDetail] = useState<Agenda | null>(null);
  const [saving, setSaving] = useState(false);
  const [speed, setSpeed] = useState(readMarqueeSpeed());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await fetchAgenda());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return list.filter((a) => {
      if (a.arsip !== showArsip) return false;
      if (term) {
        const hay = `${a.judul} ${hariDari(a.tanggal)} ${a.tanggal} ${tanggalPanjang(a.tanggal)} ${a.status} ${a.tempat}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (filt === "semua") return true;
      const d = selisihHari(a.tanggal);
      if (filt === "hari") return d === 0;
      if (filt === "minggu") return d >= 0 && d <= 6;
      const [y, m] = a.tanggal.split("-").map(Number);
      return filt === "bulan" ? y === today.getFullYear() && m === today.getMonth() + 1 : true;
    });
  }, [list, q, filt, showArsip]);

  const notifH1 = useMemo(
    () => list.filter((a) => !a.arsip && a.status === "Akan Datang" && selisihHari(a.tanggal) === 1),
    [list],
  );

  const resetForm = () => { setForm(emptyForm); setEditId(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul.trim() || !form.tanggal) return;
    setSaving(true);
    try {
      const payload = {
        judul: form.judul.trim(),
        tanggal: form.tanggal,
        jam: form.jam || "00:00",
        tempat: form.tempat.trim(),
        deskripsi: form.deskripsi.trim() || null,
        status: form.status,
        dibuat_oleh: user?.nama ?? null,
      };
      if (editId) {
        const { error } = await supabase.from("agenda").update(payload).eq("id", editId);
        if (error) throw error;
        logAction("Edit Agenda", "Agenda", payload.judul);
      } else {
        const { error } = await supabase.from("agenda").insert(payload);
        if (error) throw error;
        logAction("Tambah Agenda", "Agenda", payload.judul);
      }
      setOpenForm(false);
      resetForm();
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan agenda.");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (a: Agenda, p: Partial<Agenda>, aksi: string) => {
    const { error } = await supabase.from("agenda").update(p).eq("id", a.id);
    if (error) { setErr(error.message); return; }
    logAction(aksi, "Agenda", a.judul);
    await load();
  };

  const hapus = async (a: Agenda) => {
    if (!window.confirm(`Hapus agenda "${a.judul}"?`)) return;
    const { error } = await supabase.from("agenda").delete().eq("id", a.id);
    if (error) { setErr(error.message); return; }
    logAction("Hapus Agenda", "Agenda", a.judul);
    await load();
  };

  const startEdit = (a: Agenda) => {
    setForm({
      judul: a.judul, tanggal: a.tanggal, jam: a.jam, tempat: a.tempat,
      deskripsi: a.deskripsi ?? "", status: a.status,
    });
    setEditId(a.id);
    setOpenForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <section className="glass-strong rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl gradient-primary text-primary-foreground grid place-items-center shadow-soft shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-extrabold leading-tight">Agenda RT</h1>
              <p className="text-[11px] sm:text-sm text-muted-foreground">Jadwal kegiatan RT 06 RW 07 Bogeman Wetan</p>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => { resetForm(); setOpenForm(true); }}
              className="shrink-0 gradient-primary text-primary-foreground rounded-xl px-3 min-h-10 flex items-center gap-1.5 text-xs sm:text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" /> <span className="hidden xs:inline sm:inline">Tambah</span>
            </button>
          )}
        </div>
      </section>

      {canEdit && notifH1.length > 0 && (
        <div className="glass rounded-2xl border border-amber-500/30 p-3 sm:p-4">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">🔔 Pengingat H-1</div>
          <ul className="space-y-1">
            {notifH1.map((a) => (
              <li key={a.id} className="text-[12px] sm:text-sm">
                <b>{a.judul}</b> — besok {hariDari(a.tanggal)}, {tanggalPanjang(a.tanggal)} pukul {a.jam} WIB di {a.tempat || "-"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {err && (
        <div className="glass rounded-xl p-3 text-xs text-red-600 dark:text-red-400 border border-red-500/30">{err}</div>
      )}

      {/* Pencarian & filter */}
      <section className="glass-strong rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, hari, tanggal, atau status…"
            className="w-full glass rounded-xl pl-9 pr-3 min-h-10 text-sm bg-transparent outline-none focus:ring-2 ring-primary/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([["hari", "Hari Ini"], ["minggu", "Minggu Ini"], ["bulan", "Bulan Ini"], ["semua", "Semua"]] as [Filt, string][]).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilt(v)}
              className={`rounded-xl px-3 min-h-10 text-xs font-semibold transition ${filt === v ? "gradient-primary text-primary-foreground shadow-soft" : "glass hover:bg-accent"}`}
            >{l}</button>
          ))}
          <button
            onClick={() => setShowArsip((v) => !v)}
            className={`rounded-xl px-3 min-h-10 text-xs font-semibold flex items-center gap-1.5 transition ${showArsip ? "gradient-primary text-primary-foreground shadow-soft" : "glass hover:bg-accent"}`}
          >
            <Archive className="h-3.5 w-3.5" /> Arsip
          </button>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground shrink-0">Kecepatan teks berjalan</span>
            <input
              type="range" min={8} max={60} step={2} value={speed}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSpeed(v);
                window.localStorage.setItem(MARQUEE_SPEED_KEY, String(v));
                window.dispatchEvent(new Event("sirt06-marquee-speed"));
              }}
              className="flex-1 accent-primary"
            />
            <span className="text-[11px] font-bold tabular-nums w-10 text-right">{speed}s</span>
          </div>
        )}
      </section>

      {/* Daftar */}
      {loading ? (
        <div className="glass-strong rounded-2xl p-10 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong rounded-2xl flex flex-col items-center justify-center text-center py-12 px-4">
          <div className="h-14 w-14 rounded-2xl bg-muted grid place-items-center mb-2">
            <CalendarX className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-sm font-semibold">Belum ada agenda.</div>
          <p className="text-[11px] text-muted-foreground mt-1">Agenda kegiatan RT akan tampil di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((a) => (
            <article key={a.id} className="glass-strong rounded-2xl p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight break-words">{a.judul}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {hariDari(a.tanggal)}, {tanggalPanjang(a.tanggal)}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${statusTone(a.status)}`}>{a.status}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.jam} WIB</span>
                <span className="flex items-center gap-1 min-w-0"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{a.tempat || "-"}</span></span>
                {a.disetujui && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />Disetujui</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setDetail(a)} className="glass rounded-lg px-2.5 min-h-9 text-[11px] font-semibold flex items-center gap-1 hover:bg-accent">
                  <Eye className="h-3.5 w-3.5" /> Detail
                </button>
                {canEdit && (
                  <>
                    <button onClick={() => startEdit(a)} className="glass rounded-lg px-2.5 min-h-9 text-[11px] font-semibold flex items-center gap-1 hover:bg-accent">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => void patch(a, { arsip: !a.arsip }, a.arsip ? "Aktifkan Agenda" : "Arsipkan Agenda")} className="glass rounded-lg px-2.5 min-h-9 text-[11px] font-semibold flex items-center gap-1 hover:bg-accent">
                      <Archive className="h-3.5 w-3.5" /> {a.arsip ? "Aktifkan" : "Arsipkan"}
                    </button>
                  </>
                )}
                {canApprove && !a.disetujui && (
                  <button onClick={() => void patch(a, { disetujui: true }, "Setujui Agenda")} className="rounded-lg px-2.5 min-h-9 text-[11px] font-semibold flex items-center gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => void hapus(a)} className="rounded-lg px-2.5 min-h-9 text-[11px] font-semibold flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Form modal */}
      {openForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4 overflow-y-auto">
          <form onSubmit={submit} className="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 space-y-3 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">{editId ? "Edit Agenda" : "Tambah Agenda"}</h2>
              <button type="button" onClick={() => { setOpenForm(false); resetForm(); }} className="h-9 w-9 grid place-items-center rounded-xl glass"><X className="h-4 w-4" /></button>
            </div>
            <Field label="Judul Kegiatan">
              <input required value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="inp" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal">
                <input required type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="inp" />
              </Field>
              <Field label="Jam (WIB)">
                <input required type="time" value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} className="inp" />
              </Field>
            </div>
            {form.tanggal && (
              <p className="text-[11px] text-muted-foreground">Hari: <b>{hariDari(form.tanggal)}</b></p>
            )}
            <Field label="Tempat">
              <input value={form.tempat} onChange={(e) => setForm({ ...form, tempat: e.target.value })} placeholder="Contoh: Titik Kumpul Pos RT 06" className="inp" />
            </Field>
            <Field label="Deskripsi">
              <textarea rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} className="inp resize-none" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AgendaStatus })} className="inp">
                {AGENDA_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <button disabled={saving} className="w-full gradient-primary text-primary-foreground rounded-xl min-h-11 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
            </button>
          </form>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4">
          <div className="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 space-y-3 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-base leading-tight">{detail.judul}</h2>
              <button onClick={() => setDetail(null)} className="h-9 w-9 grid place-items-center rounded-xl glass shrink-0"><X className="h-4 w-4" /></button>
            </div>
            <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${statusTone(detail.status)}`}>{detail.status}</span>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <Row k="Hari" v={hariDari(detail.tanggal)} />
              <Row k="Tanggal" v={tanggalPanjang(detail.tanggal)} />
              <Row k="Jam" v={`${detail.jam} WIB`} />
              <Row k="Tempat" v={detail.tempat || "-"} />
              <Row k="Deskripsi" v={detail.deskripsi || "-"} />
              <Row k="Persetujuan" v={detail.disetujui ? "Disetujui Ketua RT" : "Menunggu persetujuan"} />
              <Row k="Dibuat oleh" v={detail.dibuat_oleh || "-"} />
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1 [&_.inp]:w-full [&_.inp]:glass [&_.inp]:rounded-xl [&_.inp]:px-3 [&_.inp]:py-2.5 [&_.inp]:min-h-10 [&_.inp]:text-sm [&_.inp]:bg-transparent [&_.inp]:outline-none [&_.inp]:focus:ring-2 [&_.inp]:ring-primary/40">
        {children}
      </div>
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="col-span-1 text-muted-foreground">{k}</dt>
      <dd className="col-span-2 font-medium break-words">{v}</dd>
    </>
  );
}
