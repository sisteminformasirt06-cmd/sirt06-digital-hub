import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Trash2, BarChart3 } from "lucide-react";
import { useLS, uid, nowISO, rupiah, tanggal } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, DataTable, Modal, Field, SubmitBtn, LoginRequired } from "./warga";

export const Route = createFileRoute("/keuangan")({
  head: () => ({
    meta: [
      { title: "Keuangan — SiRT 06 Digital" },
      { name: "description", content: "Transparansi kas RT dan laporan keuangan bulanan." },
    ],
  }),
  component: KeuanganPage,
});

export type KasJenis = "Kas RT" | "Kas Sosial" | "Kas HUT RI" | "Kas Perkakas" | "Kas Motor Tossa";
export const KAS_LIST: KasJenis[] = ["Kas RT", "Kas Sosial", "Kas HUT RI", "Kas Perkakas", "Kas Motor Tossa"];

interface Transaksi {
  id: string;
  kas: KasJenis;
  tipe: "Masuk" | "Keluar";
  jumlah: number;
  keterangan: string;
  tanggal: string;
  petugas: string;
  waktu: string;
}

function KeuanganPage() {
  const { user, logAction } = useAuth();
  const [trx, setTrx] = useLS<Transaksi[]>("sirt06_trx_v1", []);
  const [activeKas, setActiveKas] = useState<KasJenis>("Kas RT");
  const [showAdd, setShowAdd] = useState(false);

  const canManage = !!user && ["Bendahara", "Ketua RT", "Admin"].includes(user.role);

  const saldoPerKas = useMemo(() => {
    const map: Record<string, number> = {};
    KAS_LIST.forEach((k) => (map[k] = 0));
    trx.forEach((t) => { map[t.kas] += t.tipe === "Masuk" ? t.jumlah : -t.jumlah; });
    return map;
  }, [trx]);

  const trxKas = useMemo(() => trx.filter((t) => t.kas === activeKas), [trx, activeKas]);

  const rekap = useMemo(() => {
    const m: Record<string, { masuk: number; keluar: number }> = {};
    trxKas.forEach((t) => {
      const k = t.tanggal.slice(0, 7);
      m[k] ??= { masuk: 0, keluar: 0 };
      if (t.tipe === "Masuk") m[k].masuk += t.jumlah; else m[k].keluar += t.jumlah;
    });
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a));
  }, [trxKas]);

  if (!user) return <LoginRequired modul="Keuangan" />;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader title="Keuangan RT" desc="Lima kas RT: transparan dan terlacak per transaksi" icon={Wallet} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {KAS_LIST.map((k) => (
          <button key={k} onClick={() => setActiveKas(k)} className={`text-left rounded-2xl p-3 transition ${activeKas === k ? "gradient-primary text-primary-foreground shadow-glow" : "glass hover:bg-accent"}`}>
            <div className="text-[10px] uppercase tracking-wide opacity-80">{k}</div>
            <div className="text-base font-bold tabular-nums mt-0.5">{rupiah(saldoPerKas[k])}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{activeKas} · {trxKas.length} transaksi</div>
        {canManage && (
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
            <Plus className="h-4 w-4" /> Tambah Transaksi
          </button>
        )}
      </div>

      <DataTable
        headers={["Tgl", "Tipe", "Jumlah", "Keterangan", "Petugas", ""]}
        rows={trxKas.map((t) => [
          tanggal(t.tanggal),
          <span key={t.id} className={`inline-flex items-center gap-1 text-[10px] font-bold ${t.tipe === "Masuk" ? "text-success" : "text-destructive"}`}>
            {t.tipe === "Masuk" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />} {t.tipe}
          </span>,
          <span key={t.id + "j"} className={t.tipe === "Masuk" ? "text-success font-semibold" : "text-destructive font-semibold"}>{rupiah(t.jumlah)}</span>,
          t.keterangan, t.petugas,
          canManage ? <button onClick={() => { setTrx((p) => p.filter((x) => x.id !== t.id)); logAction("Hapus transaksi", "Keuangan", `${t.kas} ${rupiah(t.jumlah)}`); }} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button> : null,
        ])}
        empty="Belum ada transaksi pada kas ini"
      />

      <div className="glass-strong rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <div className="text-sm font-bold">Rekap Bulanan — {activeKas}</div>
        </div>
        {rekap.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">Belum ada data</div>
        ) : (
          <div className="space-y-1.5">
            {rekap.map(([bulan, v]) => {
              const saldo = v.masuk - v.keluar;
              return (
                <div key={bulan} className="grid grid-cols-4 gap-2 text-xs items-center bg-card/50 rounded-xl p-2">
                  <div className="font-semibold">{bulan}</div>
                  <div className="text-success text-right tabular-nums">+{rupiah(v.masuk)}</div>
                  <div className="text-destructive text-right tabular-nums">-{rupiah(v.keluar)}</div>
                  <div className={`text-right font-bold tabular-nums ${saldo >= 0 ? "text-foreground" : "text-destructive"}`}>{rupiah(saldo)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && canManage && (
        <Modal title={`Tambah Transaksi — ${activeKas}`} onClose={() => setShowAdd(false)}>
          <TrxForm kas={activeKas} onSubmit={(data) => {
            setTrx((p) => [{ ...data, id: uid("tx"), petugas: user.nama, waktu: nowISO() }, ...p]);
            logAction(`${data.tipe} ${data.kas}`, "Keuangan", `${rupiah(data.jumlah)} · ${data.keterangan}`);
            setShowAdd(false);
          }} />
        </Modal>
      )}
    </div>
  );
}

function TrxForm({ kas, onSubmit }: { kas: KasJenis; onSubmit: (d: Omit<Transaksi, "id" | "petugas" | "waktu">) => void }) {
  const [tipe, setTipe] = useState<"Masuk" | "Keluar">("Masuk");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKet] = useState("");
  const [tgl, setTgl] = useState(new Date().toISOString().slice(0, 10));
  return (
    <form onSubmit={(e) => { e.preventDefault(); const j = Number(jumlah); if (!j || !keterangan) return; onSubmit({ kas, tipe, jumlah: j, keterangan, tanggal: tgl }); }} className="space-y-3">
      <Field label="Tipe">
        <div className="grid grid-cols-2 gap-2">
          {(["Masuk", "Keluar"] as const).map((t) => (
            <button type="button" key={t} onClick={() => setTipe(t)} className={`py-2 rounded-xl text-sm font-semibold ${tipe === t ? (t === "Masuk" ? "bg-success text-white" : "bg-destructive text-destructive-foreground") : "glass"}`}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Jumlah (Rp)"><input required type="number" min={0} value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="form-inp" /></Field>
      <Field label="Keterangan"><input required value={keterangan} onChange={(e) => setKet(e.target.value)} className="form-inp" /></Field>
      <Field label="Tanggal"><input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="form-inp" /></Field>
      <SubmitBtn>Simpan Transaksi</SubmitBtn>
    </form>
  );
}
