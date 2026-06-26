import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Megaphone, Plus, Search, Filter, AlertTriangle, Pin, Archive,
  ArchiveRestore, Trash2, Edit3, FileText, Image as ImageIcon, X,
  Download, CalendarRange,
} from "lucide-react";
import { useLS, uid, nowISO, tanggal, tanggalWaktu } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, Field, SubmitBtn, Modal, LoginRequired } from "./warga";

export const Route = createFileRoute("/media")({
  head: () => ({
    meta: [
      { title: "Pengumuman — SiRT 06 Digital" },
      { name: "description", content: "Pengumuman resmi RT 06 RW 07 Bogeman Wetan." },
    ],
  }),
  component: PengumumanPage,
});

export type Prioritas = "Penting" | "Normal";

export interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  prioritas: Prioritas;
  publishedAt: string; // ISO date (yyyy-mm-dd ok)
  expiresAt?: string;  // optional
  fotoDataUrl?: string;
  pdfDataUrl?: string;
  pdfName?: string;
  petugas: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export const PENGUMUMAN_KEY = "sirt06_pengumuman_v1";

const SEED: Pengumuman[] = [];

export function isAktif(p: Pengumuman, now = new Date()) {
  if (p.archived) return false;
  const pub = new Date(p.publishedAt);
  if (pub > now) return false;
  if (p.expiresAt) {
    const exp = new Date(p.expiresAt);
    exp.setHours(23, 59, 59, 999);
    if (exp < now) return false;
  }
  return true;
}

type Tab = "aktif" | "arsip";

function PengumumanPage() {
  const { user, logAction } = useAuth();
  const [list, setList] = useLS<Pengumuman[]>(PENGUMUMAN_KEY, SEED);
  const [tab, setTab] = useState<Tab>("aktif");
  const [q, setQ] = useState("");
  const [fp, setFp] = useState<"Semua" | Prioritas>("Semua");
  const [edit, setEdit] = useState<Pengumuman | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const canManage = !!user && ["Ketua RT", "Sekretaris", "Sie Humas", "Admin"].includes(user.role);

  const filtered = useMemo(() => {
    const now = new Date();
    return list
      .filter((p) => (tab === "aktif" ? !p.archived : p.archived))
      .filter((p) => fp === "Semua" || p.prioritas === fp)
      .filter((p) =>
        !q ||
        p.judul.toLowerCase().includes(q.toLowerCase()) ||
        p.isi.toLowerCase().includes(q.toLowerCase())
      )
      .sort((a, b) => {
        // Penting first, then newest
        if (a.prioritas !== b.prioritas) return a.prioritas === "Penting" ? -1 : 1;
        return b.publishedAt.localeCompare(a.publishedAt);
      })
      .map((p) => ({ ...p, _aktif: tab === "aktif" && isAktif(p, now) }));
  }, [list, tab, q, fp]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: list.length,
      aktif: list.filter((p) => isAktif(p, now)).length,
      penting: list.filter((p) => isAktif(p, now) && p.prioritas === "Penting").length,
      arsip: list.filter((p) => p.archived).length,
    };
  }, [list]);

  if (!user) return <LoginRequired modul="Pengumuman" />;

  const upsert = (data: Omit<Pengumuman, "id" | "petugas" | "createdAt" | "updatedAt" | "archived"> & { id?: string }) => {
    if (data.id) {
      setList((p) => p.map((x) => (x.id === data.id ? { ...x, ...data, updatedAt: nowISO() } as Pengumuman : x)));
      logAction("Edit pengumuman", "Pengumuman", data.judul);
    } else {
      const baru: Pengumuman = {
        ...data,
        id: uid("pgm"),
        petugas: user.nama,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        archived: false,
      };
      setList((p) => [baru, ...p]);
      logAction("Tambah pengumuman", "Pengumuman", data.judul);
    }
    setEdit(null);
    setShowAdd(false);
  };

  const archive = (p: Pengumuman, val: boolean) => {
    setList((prev) => prev.map((x) => (x.id === p.id ? { ...x, archived: val, updatedAt: nowISO() } : x)));
    logAction(val ? "Arsipkan pengumuman" : "Pulihkan pengumuman", "Pengumuman", p.judul);
  };
  const remove = (p: Pengumuman) => {
    if (!confirm(`Hapus pengumuman "${p.judul}"?`)) return;
    setList((prev) => prev.filter((x) => x.id !== p.id));
    logAction("Hapus pengumuman", "Pengumuman", p.judul);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader title="Pengumuman" desc="Pengumuman resmi RT 06 RW 07 Bogeman Wetan" icon={Megaphone} />

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill label="Total" value={stats.total} tone="from-blue-500 to-indigo-500" />
        <StatPill label="Aktif" value={stats.aktif} tone="from-emerald-500 to-teal-500" />
        <StatPill label="Penting" value={stats.penting} tone="from-red-500 to-rose-600" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <StatPill label="Arsip" value={stats.arsip} tone="from-slate-500 to-zinc-600" icon={<Archive className="h-3.5 w-3.5" />} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl glass overflow-hidden">
          {(["aktif", "arsip"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs font-semibold capitalize ${tab === t ? "gradient-primary text-primary-foreground" : "hover:bg-accent"}`}>{t}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pengumuman..." className="form-inp pl-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 glass rounded-xl px-2 py-1.5 text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={fp} onChange={(e) => setFp(e.target.value as never)} className="bg-transparent outline-none text-xs font-semibold">
            <option value="Semua">Semua Prioritas</option>
            <option value="Penting">Penting</option>
            <option value="Normal">Normal</option>
          </select>
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
            <Plus className="h-4 w-4" /> Tambah
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-strong rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Belum ada pengumuman {tab === "arsip" ? "di arsip" : "aktif"}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <article key={p.id} className={`glass-strong rounded-2xl p-4 border ${p.prioritas === "Penting" ? "border-red-500/30" : "border-border/40"}`}>
              <div className="flex items-start gap-3">
                {p.fotoDataUrl ? (
                  <img src={p.fotoDataUrl} alt={p.judul} className="h-16 w-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className={`h-16 w-16 rounded-xl grid place-items-center text-white shrink-0 bg-gradient-to-br ${p.prioritas === "Penting" ? "from-red-500 to-rose-600" : "from-blue-500 to-indigo-500"}`}>
                    <Megaphone className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.prioritas === "Penting" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500">
                        <Pin className="h-2.5 w-2.5" /> PENTING
                      </span>
                    )}
                    {p._aktif ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success/15 text-success">AKTIF</span>
                    ) : !p.archived ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">TIDAK AKTIF</span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">ARSIP</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold leading-tight mt-1 truncate">{p.judul}</h3>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarRange className="h-3 w-3" />
                    {tanggal(p.publishedAt)}{p.expiresAt ? ` — ${tanggal(p.expiresAt)}` : ""}
                  </div>
                </div>
              </div>
              <p className="text-xs text-foreground/80 mt-2.5 whitespace-pre-wrap line-clamp-4">{p.isi}</p>
              {p.pdfDataUrl && (
                <a href={p.pdfDataUrl} download={p.pdfName ?? "lampiran.pdf"} className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline">
                  <FileText className="h-3.5 w-3.5" /> {p.pdfName ?? "Lampiran PDF"} <Download className="h-3 w-3" />
                </a>
              )}
              <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>oleh {p.petugas} • {tanggalWaktu(p.updatedAt)}</span>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEdit(p)} className="p-1.5 rounded-lg hover:bg-accent" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                    {p.archived ? (
                      <button onClick={() => archive(p, false)} className="p-1.5 rounded-lg hover:bg-accent" title="Pulihkan"><ArchiveRestore className="h-3.5 w-3.5" /></button>
                    ) : (
                      <button onClick={() => archive(p, true)} className="p-1.5 rounded-lg hover:bg-accent" title="Arsipkan"><Archive className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => remove(p)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {(showAdd || edit) && canManage && (
        <Modal title={edit ? "Edit Pengumuman" : "Tambah Pengumuman"} onClose={() => { setShowAdd(false); setEdit(null); }}>
          <PengumumanForm initial={edit ?? undefined} onSubmit={upsert} />
        </Modal>
      )}
    </div>
  );
}

function StatPill({ label, value, tone, icon }: { label: string; value: number; tone: string; icon?: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {icon} {label}
      </div>
      <div className={`text-xl font-extrabold mt-0.5 bg-gradient-to-br ${tone} bg-clip-text text-transparent tabular-nums`}>{value}</div>
    </div>
  );
}

function PengumumanForm({ initial, onSubmit }: { initial?: Pengumuman; onSubmit: (d: Omit<Pengumuman, "id" | "petugas" | "createdAt" | "updatedAt" | "archived"> & { id?: string }) => void }) {
  const [judul, setJudul] = useState(initial?.judul ?? "");
  const [isi, setIsi] = useState(initial?.isi ?? "");
  const [prioritas, setPrio] = useState<Prioritas>(initial?.prioritas ?? "Normal");
  const [pub, setPub] = useState(initial?.publishedAt ?? new Date().toISOString().slice(0, 10));
  const [exp, setExp] = useState(initial?.expiresAt ?? "");
  const [foto, setFoto] = useState<string | undefined>(initial?.fotoDataUrl);
  const [pdf, setPdf] = useState<string | undefined>(initial?.pdfDataUrl);
  const [pdfName, setPdfName] = useState<string | undefined>(initial?.pdfName);
  const fotoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const readFile = (f: File, cb: (v: string) => void) => {
    if (f.size > 4 * 1024 * 1024) { alert("Ukuran file maksimum 4MB"); return; }
    const r = new FileReader();
    r.onload = () => cb(String(r.result));
    r.readAsDataURL(f);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!judul.trim() || !isi.trim()) return;
        onSubmit({
          id: initial?.id,
          judul: judul.trim(),
          isi: isi.trim(),
          prioritas,
          publishedAt: pub,
          expiresAt: exp || undefined,
          fotoDataUrl: foto,
          pdfDataUrl: pdf,
          pdfName: pdf ? pdfName : undefined,
        });
      }}
      className="space-y-3"
    >
      <Field label="Judul"><input required value={judul} onChange={(e) => setJudul(e.target.value)} className="form-inp" maxLength={120} /></Field>
      <Field label="Isi Pengumuman">
        <textarea required value={isi} onChange={(e) => setIsi(e.target.value)} rows={5} className="form-inp resize-none" maxLength={2000} />
      </Field>
      <Field label="Prioritas">
        <div className="grid grid-cols-2 gap-2">
          {(["Penting", "Normal"] as Prioritas[]).map((p) => (
            <button type="button" key={p} onClick={() => setPrio(p)} className={`py-2 rounded-xl text-sm font-semibold ${prioritas === p ? (p === "Penting" ? "bg-red-500 text-white" : "gradient-primary text-primary-foreground") : "glass"}`}>{p}</button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tanggal Publikasi"><input type="date" required value={pub} onChange={(e) => setPub(e.target.value)} className="form-inp" /></Field>
        <Field label="Tanggal Berakhir"><input type="date" value={exp} onChange={(e) => setExp(e.target.value)} className="form-inp" /></Field>
      </div>
      <Field label="Foto (opsional)">
        <div className="flex items-center gap-2">
          <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, setFoto); }} />
          <button type="button" onClick={() => fotoRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs font-semibold">
            <ImageIcon className="h-3.5 w-3.5" /> Pilih Foto
          </button>
          {foto && (
            <div className="relative">
              <img src={foto} alt="preview" className="h-12 w-12 rounded-lg object-cover" />
              <button type="button" onClick={() => setFoto(undefined)} className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground grid place-items-center"><X className="h-3 w-3" /></button>
            </div>
          )}
        </div>
      </Field>
      <Field label="Lampiran PDF (opsional)">
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPdfName(f.name); readFile(f, setPdf); } }} />
          <button type="button" onClick={() => pdfRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" /> Pilih PDF
          </button>
          {pdf && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              {pdfName} <button type="button" onClick={() => { setPdf(undefined); setPdfName(undefined); }} className="text-destructive"><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
      </Field>
      <SubmitBtn>{initial ? "Simpan Perubahan" : "Tambah Pengumuman"}</SubmitBtn>
    </form>
  );
}
