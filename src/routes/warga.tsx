import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Plus, Trash2, Search, LogIn, LogOut as LogOutIcon, X, Home, UserPlus, Filter } from "lucide-react";
import { useLS, uid, nowISO, tanggal } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
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

type StatusWarga = "Tetap" | "Kontrak" | "Kos" | "Pindah" | "Meninggal";

interface KK {
  id: string;
  nomorKK: string;
  kepala: string;
  alamat: string;
  createdAt: string;
}

interface Warga {
  id: string;
  kkId: string;
  nik: string;
  nama: string;
  jk: "L" | "P";
  tanggalLahir: string;
  status: StatusWarga;
  pekerjaan?: string;
  noHp?: string;
  createdAt: string;
}

type MutasiTipe = "Masuk" | "Keluar";
interface Mutasi {
  id: string;
  tipe: MutasiTipe;
  nama: string;
  tanggal: string;
  keterangan?: string;
  petugas: string;
  waktu: string;
}

type Tab = "kk" | "warga" | "mutasi";

function WargaPage() {
  const { user, logAction } = useAuth();
  const [kks, setKks] = useLS<KK[]>("sirt06_kk_v1", []);
  const [warga, setWarga] = useLS<Warga[]>("sirt06_warga_v1", []);
  const [mutasi, setMutasi] = useLS<Mutasi[]>("sirt06_mutasi_v1", []);
  const [tab, setTab] = useState<Tab>("warga");
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusWarga | "Semua">("Semua");
  const [showKK, setShowKK] = useState(false);
  const [showWarga, setShowWarga] = useState(false);
  const [showMutasi, setShowMutasi] = useState<MutasiTipe | null>(null);

  const canManage = !!user && ["Ketua RT", "Sekretaris", "Admin"].includes(user.role);

  const wargaFiltered = useMemo(() => {
    return warga.filter((w) => {
      const matchQ = !q || [w.nama, w.nik, w.pekerjaan, w.noHp].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase());
      const matchS = filterStatus === "Semua" || w.status === filterStatus;
      return matchQ && matchS;
    });
  }, [warga, q, filterStatus]);

  const stats = useMemo(() => ({
    total: warga.length,
    kk: kks.length,
    tetap: warga.filter((w) => w.status === "Tetap").length,
    kontrak: warga.filter((w) => w.status === "Kontrak").length,
    kos: warga.filter((w) => w.status === "Kos").length,
    pindah: warga.filter((w) => w.status === "Pindah").length,
  }), [warga, kks]);

  if (!user) return <LoginRequired modul="Data Warga" />;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader title="Data Warga" desc="Kelola KK, anggota warga, dan mutasi RT 06" icon={Users} />

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          ["Total", stats.total], ["KK", stats.kk], ["Tetap", stats.tetap],
          ["Kontrak", stats.kontrak], ["Kos", stats.kos], ["Pindah", stats.pindah],
        ].map(([l, v]) => (
          <div key={String(l)} className="glass rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{l}</div>
            <div className="text-lg font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["warga", "kk", "mutasi"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${tab === t ? "gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
            {t === "warga" ? "Data Warga" : t === "kk" ? "Kartu Keluarga" : "Mutasi"}
          </button>
        ))}
      </div>

      {tab === "warga" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, NIK, HP…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-input border border-border text-sm" />
            </div>
            <div className="flex items-center gap-1.5 glass rounded-xl px-2 py-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as StatusWarga | "Semua")} className="bg-transparent outline-none">
                {(["Semua", "Tetap", "Kontrak", "Kos", "Pindah", "Meninggal"] as const).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {canManage && (
              <button onClick={() => setShowWarga(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <UserPlus className="h-4 w-4" /> Tambah Warga
              </button>
            )}
          </div>
          <DataTable
            headers={["Nama", "NIK", "JK", "Status", "KK", "HP", ""]}
            rows={wargaFiltered.map((w) => {
              const kk = kks.find((k) => k.id === w.kkId);
              return [w.nama, w.nik, w.jk, <StatusBadge key={w.id} status={w.status} />, kk?.nomorKK ?? "-", w.noHp ?? "-",
                canManage ? <button onClick={() => { setWarga((p) => p.filter((x) => x.id !== w.id)); logAction("Hapus warga", "Warga", w.nama); }} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button> : null,
              ];
            })}
            empty="Belum ada data warga"
          />
        </div>
      )}

      {tab === "kk" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{kks.length} Kartu Keluarga</div>
            {canManage && (
              <button onClick={() => setShowKK(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Tambah KK
              </button>
            )}
          </div>
          <DataTable
            headers={["No. KK", "Kepala Keluarga", "Alamat", "Anggota", ""]}
            rows={kks.map((k) => [
              k.nomorKK, k.kepala, k.alamat,
              warga.filter((w) => w.kkId === k.id).length,
              canManage ? <button onClick={() => { setKks((p) => p.filter((x) => x.id !== k.id)); logAction("Hapus KK", "Warga", k.nomorKK); }} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button> : null,
            ])}
            empty="Belum ada data KK"
          />
        </div>
      )}

      {tab === "mutasi" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold flex-1">{mutasi.length} Mutasi tercatat</div>
            {canManage && (
              <>
                <button onClick={() => setShowMutasi("Masuk")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success text-white text-xs font-semibold"><LogIn className="h-3.5 w-3.5" /> Masuk</button>
                <button onClick={() => setShowMutasi("Keluar")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-warning text-white text-xs font-semibold"><LogOutIcon className="h-3.5 w-3.5" /> Keluar</button>
              </>
            )}
          </div>
          <DataTable
            headers={["Tipe", "Nama", "Tanggal", "Keterangan", "Petugas"]}
            rows={mutasi.map((m) => [
              <span key={m.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.tipe === "Masuk" ? "bg-success/15 text-success" : "bg-warning/20 text-warning"}`}>{m.tipe}</span>,
              m.nama, tanggal(m.tanggal), m.keterangan ?? "-", m.petugas,
            ])}
            empty="Belum ada mutasi"
          />
        </div>
      )}

      {showKK && canManage && (
        <Modal title="Tambah KK" onClose={() => setShowKK(false)}>
          <KKForm onSubmit={(data) => { setKks((p) => [{ ...data, id: uid("kk"), createdAt: nowISO() }, ...p]); logAction("Tambah KK", "Warga", data.nomorKK); setShowKK(false); }} />
        </Modal>
      )}
      {showWarga && canManage && (
        <Modal title="Tambah Warga" onClose={() => setShowWarga(false)}>
          <WargaForm kks={kks} onSubmit={(data) => { setWarga((p) => [{ ...data, id: uid("w"), createdAt: nowISO() }, ...p]); logAction("Tambah warga", "Warga", data.nama); setShowWarga(false); }} />
        </Modal>
      )}
      {showMutasi && canManage && (
        <Modal title={`Mutasi ${showMutasi}`} onClose={() => setShowMutasi(null)}>
          <MutasiForm tipe={showMutasi} onSubmit={(data) => { setMutasi((p) => [{ ...data, id: uid("mt"), waktu: nowISO(), petugas: user.nama }, ...p]); logAction(`Mutasi ${showMutasi}`, "Warga", data.nama); setShowMutasi(null); }} />
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: StatusWarga }) {
  const map: Record<StatusWarga, string> = {
    Tetap: "bg-primary/15 text-primary",
    Kontrak: "bg-amber-500/15 text-amber-600",
    Kos: "bg-sky-500/15 text-sky-600",
    Pindah: "bg-muted text-muted-foreground",
    Meninggal: "bg-destructive/15 text-destructive",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[status]}`}>{status}</span>;
}

function KKForm({ onSubmit }: { onSubmit: (data: Omit<KK, "id" | "createdAt">) => void }) {
  const [nomorKK, setN] = useState("");
  const [kepala, setK] = useState("");
  const [alamat, setA] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!nomorKK || !kepala) return; onSubmit({ nomorKK, kepala, alamat }); }} className="space-y-3">
      <Field label="No. KK"><input required value={nomorKK} onChange={(e) => setN(e.target.value)} className="form-inp" /></Field>
      <Field label="Kepala Keluarga"><input required value={kepala} onChange={(e) => setK(e.target.value)} className="form-inp" /></Field>
      <Field label="Alamat"><input value={alamat} onChange={(e) => setA(e.target.value)} className="form-inp" /></Field>
      <SubmitBtn>Simpan KK</SubmitBtn>
    </form>
  );
}

function WargaForm({ kks, onSubmit }: { kks: KK[]; onSubmit: (data: Omit<Warga, "id" | "createdAt">) => void }) {
  const [f, setF] = useState<Omit<Warga, "id" | "createdAt">>({ kkId: kks[0]?.id ?? "", nik: "", nama: "", jk: "L", tanggalLahir: "", status: "Tetap", pekerjaan: "", noHp: "" });
  const set = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!f.nama || !f.nik) return; onSubmit(f); }} className="space-y-3">
      <Field label="NIK"><input required value={f.nik} onChange={(e) => set({ nik: e.target.value })} className="form-inp" /></Field>
      <Field label="Nama Lengkap"><input required value={f.nama} onChange={(e) => set({ nama: e.target.value })} className="form-inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="JK"><select value={f.jk} onChange={(e) => set({ jk: e.target.value as "L" | "P" })} className="form-inp"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></Field>
        <Field label="Tanggal Lahir"><input type="date" value={f.tanggalLahir} onChange={(e) => set({ tanggalLahir: e.target.value })} className="form-inp" /></Field>
      </div>
      <Field label="Status">
        <select value={f.status} onChange={(e) => set({ status: e.target.value as StatusWarga })} className="form-inp">
          {(["Tetap", "Kontrak", "Kos", "Pindah", "Meninggal"] as const).map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="KK">
        <select value={f.kkId} onChange={(e) => set({ kkId: e.target.value })} className="form-inp">
          <option value="">— pilih KK —</option>
          {kks.map((k) => <option key={k.id} value={k.id}>{k.nomorKK} · {k.kepala}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Pekerjaan"><input value={f.pekerjaan} onChange={(e) => set({ pekerjaan: e.target.value })} className="form-inp" /></Field>
        <Field label="No. HP"><input value={f.noHp} onChange={(e) => set({ noHp: e.target.value })} className="form-inp" /></Field>
      </div>
      <SubmitBtn>Simpan Warga</SubmitBtn>
    </form>
  );
}

function MutasiForm({ tipe, onSubmit }: { tipe: MutasiTipe; onSubmit: (d: Omit<Mutasi, "id" | "waktu" | "petugas">) => void }) {
  const [nama, setN] = useState("");
  const [tgl, setT] = useState(new Date().toISOString().slice(0, 10));
  const [ket, setK] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!nama) return; onSubmit({ tipe, nama, tanggal: tgl, keterangan: ket }); }} className="space-y-3">
      <Field label="Nama Warga"><input required value={nama} onChange={(e) => setN(e.target.value)} className="form-inp" /></Field>
      <Field label="Tanggal"><input type="date" value={tgl} onChange={(e) => setT(e.target.value)} className="form-inp" /></Field>
      <Field label="Keterangan"><textarea value={ket} onChange={(e) => setK(e.target.value)} className="form-inp" rows={2} /></Field>
      <SubmitBtn>Catat Mutasi {tipe}</SubmitBtn>
    </form>
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
