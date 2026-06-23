import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Boxes, Plus, Trash2, Check, X as XIcon, CornerDownLeft } from "lucide-react";
import { useLS, uid, nowISO, tanggal, rupiah } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, DataTable, Modal, Field, SubmitBtn, LoginRequired } from "./warga";

export const Route = createFileRoute("/inventaris")({
  head: () => ({
    meta: [
      { title: "Inventaris — SiRT 06 Digital" },
      { name: "description", content: "Daftar dan peminjaman aset RT." },
    ],
  }),
  component: InventarisPage,
});

type Kondisi = "Baik" | "Rusak Ringan" | "Rusak Berat";
interface Barang { id: string; nama: string; jumlah: number; kondisi: Kondisi; lokasi?: string; createdAt: string; }

type StatusPinjam = "Menunggu" | "Disetujui" | "Ditolak" | "Dikembalikan";
interface Pinjaman {
  id: string;
  barangId: string;
  peminjam: string;
  jumlah: number;
  tglPinjam: string;
  tglKembaliRencana: string;
  tglKembaliAktual?: string;
  status: StatusPinjam;
  denda?: number;
  catatan?: string;
  diajukanOleh: string;
  diprosesOleh?: string;
  waktu: string;
}

function InventarisPage() {
  const { user, logAction } = useAuth();
  const [barang, setBarang] = useLS<Barang[]>("sirt06_barang_v1", []);
  const [pinjaman, setPinjaman] = useLS<Pinjaman[]>("sirt06_pinjaman_v1", []);
  const [tab, setTab] = useState<"barang" | "pinjaman">("barang");
  const [showBarang, setShowBarang] = useState(false);
  const [showPinjam, setShowPinjam] = useState(false);

  const canManageBarang = !!user && ["Sie Perlengkapan", "Ketua RT", "Admin"].includes(user.role);
  const canApprove = !!user && ["Sie Perlengkapan", "Ketua RT", "Admin"].includes(user.role);
  const canPinjam = !!user;

  const stats = useMemo(() => ({
    total: barang.reduce((a, b) => a + b.jumlah, 0),
    jenis: barang.length,
    rusak: barang.filter((b) => b.kondisi !== "Baik").length,
    menunggu: pinjaman.filter((p) => p.status === "Menunggu").length,
    aktif: pinjaman.filter((p) => p.status === "Disetujui").length,
  }), [barang, pinjaman]);

  if (!user) return <LoginRequired modul="Inventaris" />;

  const hitungDenda = (rencana: string, aktual: string) => {
    const a = new Date(rencana).getTime();
    const b = new Date(aktual).getTime();
    const days = Math.max(0, Math.ceil((b - a) / 86400000));
    return days * 5000; // Rp 5.000 / hari
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader title="Inventaris RT" desc="Daftar barang, peminjaman, pengembalian, dan denda" icon={Boxes} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[["Jenis", stats.jenis], ["Total Unit", stats.total], ["Rusak", stats.rusak], ["Menunggu", stats.menunggu], ["Aktif", stats.aktif]].map(([l, v]) => (
          <div key={String(l)} className="glass rounded-2xl p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
            <div className="text-lg font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(["barang", "pinjaman"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${tab === t ? "gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
            {t === "barang" ? "Data Barang" : "Peminjaman"}
          </button>
        ))}
      </div>

      {tab === "barang" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{barang.length} jenis barang</div>
            {canManageBarang && (
              <button onClick={() => setShowBarang(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Tambah Barang
              </button>
            )}
          </div>
          <DataTable
            headers={["Nama", "Jumlah", "Kondisi", "Lokasi", ""]}
            rows={barang.map((b) => [
              b.nama, b.jumlah,
              <span key={b.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.kondisi === "Baik" ? "bg-success/15 text-success" : b.kondisi === "Rusak Ringan" ? "bg-warning/20 text-warning" : "bg-destructive/15 text-destructive"}`}>{b.kondisi}</span>,
              b.lokasi ?? "-",
              canManageBarang ? <button onClick={() => { setBarang((p) => p.filter((x) => x.id !== b.id)); logAction("Hapus barang", "Inventaris", b.nama); }} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button> : null,
            ])}
            empty="Belum ada barang"
          />
        </div>
      )}

      {tab === "pinjaman" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{pinjaman.length} pengajuan</div>
            {canPinjam && (
              <button onClick={() => setShowPinjam(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <Plus className="h-4 w-4" /> Ajukan Peminjaman
              </button>
            )}
          </div>
          <DataTable
            headers={["Barang", "Peminjam", "Jml", "Pinjam", "Kembali", "Status", "Denda", "Aksi"]}
            rows={pinjaman.map((p) => {
              const b = barang.find((x) => x.id === p.barangId);
              return [
                b?.nama ?? "?",
                p.peminjam,
                p.jumlah,
                tanggal(p.tglPinjam),
                p.tglKembaliAktual ? tanggal(p.tglKembaliAktual) : `→ ${tanggal(p.tglKembaliRencana)}`,
                <StatusP key={p.id} s={p.status} />,
                p.denda ? <span className="text-destructive font-semibold">{rupiah(p.denda)}</span> : "-",
                <div key={p.id + "a"} className="flex gap-1">
                  {p.status === "Menunggu" && canApprove && (
                    <>
                      <button onClick={() => { setPinjaman((arr) => arr.map((x) => x.id === p.id ? { ...x, status: "Disetujui", diprosesOleh: user.nama } : x)); logAction("Setujui peminjaman", "Inventaris", `${b?.nama} oleh ${p.peminjam}`); }} className="p-1 rounded bg-success/20 text-success hover:bg-success/30"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { setPinjaman((arr) => arr.map((x) => x.id === p.id ? { ...x, status: "Ditolak", diprosesOleh: user.nama } : x)); logAction("Tolak peminjaman", "Inventaris", `${b?.nama} oleh ${p.peminjam}`); }} className="p-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30"><XIcon className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                  {p.status === "Disetujui" && (
                    <button onClick={() => {
                      const aktual = new Date().toISOString().slice(0, 10);
                      const denda = hitungDenda(p.tglKembaliRencana, aktual);
                      setPinjaman((arr) => arr.map((x) => x.id === p.id ? { ...x, status: "Dikembalikan", tglKembaliAktual: aktual, denda } : x));
                      logAction("Pengembalian", "Inventaris", `${b?.nama} · denda ${rupiah(denda)}`);
                    }} className="p-1 rounded bg-primary/15 text-primary hover:bg-primary/25" title="Catat pengembalian"><CornerDownLeft className="h-3.5 w-3.5" /></button>
                  )}
                </div>,
              ];
            })}
            empty="Belum ada pengajuan peminjaman"
          />
          <div className="text-[11px] text-muted-foreground">Denda keterlambatan: Rp 5.000 / hari. Persetujuan oleh Sie Perlengkapan / Ketua RT.</div>
        </div>
      )}

      {showBarang && canManageBarang && (
        <Modal title="Tambah Barang" onClose={() => setShowBarang(false)}>
          <BarangForm onSubmit={(d) => { setBarang((p) => [{ ...d, id: uid("br"), createdAt: nowISO() }, ...p]); logAction("Tambah barang", "Inventaris", d.nama); setShowBarang(false); }} />
        </Modal>
      )}
      {showPinjam && canPinjam && (
        <Modal title="Ajukan Peminjaman" onClose={() => setShowPinjam(false)}>
          <PinjamForm barang={barang} defaultNama={user.nama} onSubmit={(d) => {
            setPinjaman((p) => [{ ...d, id: uid("pj"), status: "Menunggu", diajukanOleh: user.nama, waktu: nowISO() }, ...p]);
            logAction("Ajukan peminjaman", "Inventaris", `${barang.find((b) => b.id === d.barangId)?.nama} oleh ${d.peminjam}`);
            setShowPinjam(false);
          }} />
        </Modal>
      )}
    </div>
  );
}

function StatusP({ s }: { s: StatusPinjam }) {
  const map: Record<StatusPinjam, string> = {
    Menunggu: "bg-warning/20 text-warning",
    Disetujui: "bg-success/15 text-success",
    Ditolak: "bg-destructive/15 text-destructive",
    Dikembalikan: "bg-primary/15 text-primary",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[s]}`}>{s}</span>;
}

function BarangForm({ onSubmit }: { onSubmit: (d: Omit<Barang, "id" | "createdAt">) => void }) {
  const [nama, setN] = useState("");
  const [jumlah, setJ] = useState("1");
  const [kondisi, setK] = useState<Kondisi>("Baik");
  const [lokasi, setL] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!nama) return; onSubmit({ nama, jumlah: Number(jumlah) || 1, kondisi, lokasi }); }} className="space-y-3">
      <Field label="Nama Barang"><input required value={nama} onChange={(e) => setN(e.target.value)} className="form-inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Jumlah"><input required type="number" min={1} value={jumlah} onChange={(e) => setJ(e.target.value)} className="form-inp" /></Field>
        <Field label="Kondisi"><select value={kondisi} onChange={(e) => setK(e.target.value as Kondisi)} className="form-inp"><option>Baik</option><option>Rusak Ringan</option><option>Rusak Berat</option></select></Field>
      </div>
      <Field label="Lokasi"><input value={lokasi} onChange={(e) => setL(e.target.value)} className="form-inp" /></Field>
      <SubmitBtn>Simpan Barang</SubmitBtn>
    </form>
  );
}

function PinjamForm({ barang, defaultNama, onSubmit }: { barang: Barang[]; defaultNama: string; onSubmit: (d: Omit<Pinjaman, "id" | "status" | "diajukanOleh" | "waktu">) => void }) {
  const [barangId, setBId] = useState(barang[0]?.id ?? "");
  const [peminjam, setP] = useState(defaultNama);
  const [jumlah, setJ] = useState("1");
  const [tglPinjam, setTP] = useState(new Date().toISOString().slice(0, 10));
  const [tglKembali, setTK] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [catatan, setC] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!barangId || !peminjam) return; onSubmit({ barangId, peminjam, jumlah: Number(jumlah) || 1, tglPinjam, tglKembaliRencana: tglKembali, catatan }); }} className="space-y-3">
      <Field label="Barang">
        <select required value={barangId} onChange={(e) => setBId(e.target.value)} className="form-inp">
          <option value="">— pilih barang —</option>
          {barang.map((b) => <option key={b.id} value={b.id}>{b.nama} ({b.jumlah})</option>)}
        </select>
      </Field>
      <Field label="Peminjam"><input required value={peminjam} onChange={(e) => setP(e.target.value)} className="form-inp" /></Field>
      <Field label="Jumlah"><input required type="number" min={1} value={jumlah} onChange={(e) => setJ(e.target.value)} className="form-inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tgl Pinjam"><input type="date" value={tglPinjam} onChange={(e) => setTP(e.target.value)} className="form-inp" /></Field>
        <Field label="Rencana Kembali"><input type="date" value={tglKembali} onChange={(e) => setTK(e.target.value)} className="form-inp" /></Field>
      </div>
      <Field label="Catatan"><textarea value={catatan} onChange={(e) => setC(e.target.value)} className="form-inp" rows={2} /></Field>
      <SubmitBtn>Ajukan Peminjaman</SubmitBtn>
    </form>
  );
}
