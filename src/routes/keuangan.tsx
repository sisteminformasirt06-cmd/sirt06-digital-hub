import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Trash2, BarChart3,
  Pencil, Eye, History as HistoryIcon, Paperclip, Loader2, Filter,
} from "lucide-react";
import { rupiah, tanggal, tanggalWaktu } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, DataTable, Modal, Field, SubmitBtn } from "./warga";
import { useSettings } from "@/lib/settings-context";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

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
  lampiran_url: string | null;
  petugas_nama: string;
  petugas_role: string | null;
  created_at: string;
  updated_at: string;
}

interface HistoryRow {
  id: string;
  transaksi_id: string;
  aksi: string;
  before_data: Partial<Transaksi> | null;
  after_data: Partial<Transaksi> | null;
  diubah_oleh_nama: string;
  diubah_oleh_role: string | null;
  created_at: string;
}

type TabView = "transaksi" | "riwayat";

function toJson(v: unknown): Json {
  return JSON.parse(JSON.stringify(v)) as Json;
}

function KeuanganPage() {
  const { user, logAction } = useAuth();
  const { kasSaldoAwal } = useSettings();
  const [trx, setTrx] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKas, setActiveKas] = useState<KasJenis>("Kas RT");
  const [tab, setTab] = useState<TabView>("transaksi");

  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<Transaksi | null>(null);
  const [detailRow, setDetailRow] = useState<Transaksi | null>(null);
  const [historyRow, setHistoryRow] = useState<Transaksi | null>(null);
  const [confirmDel, setConfirmDel] = useState<Transaksi | null>(null);

  const role = user?.role;
  const canAdd = role === "Bendahara" || role === "Super Admin";
  const canEdit = role === "Bendahara" || role === "Super Admin";
  const canDelete = role === "Super Admin";

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transaksi_kas")
      .select("*")
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error("Gagal memuat transaksi: " + error.message);
    else setTrx((data ?? []) as unknown as Transaksi[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saldoPerKas = useMemo(() => {
    const map: Record<string, number> = {};
    KAS_LIST.forEach((k) => (map[k] = Number(kasSaldoAwal[k]) || 0));
    trx.forEach((t) => { map[t.kas] += t.tipe === "Masuk" ? Number(t.jumlah) : -Number(t.jumlah); });
    return map;
  }, [trx, kasSaldoAwal]);

  const trxKas = useMemo(() => trx.filter((t) => t.kas === activeKas), [trx, activeKas]);

  const rekap = useMemo(() => {
    const m: Record<string, { masuk: number; keluar: number }> = {};
    trxKas.forEach((t) => {
      const k = t.tanggal.slice(0, 7);
      m[k] ??= { masuk: 0, keluar: 0 };
      if (t.tipe === "Masuk") m[k].masuk += Number(t.jumlah); else m[k].keluar += Number(t.jumlah);
    });
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a));
  }, [trxKas]);

  async function uploadLampiran(file: File): Promise<string | null> {
    const path = `${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("keuangan-lampiran").upload(path, file, { upsert: false });
    if (error) { toast.error("Upload lampiran gagal: " + error.message); return null; }
    return path;
  }

  async function handleAdd(payload: TrxFormValues) {
    if (!user) return;
    let lampiran_url: string | null = null;
    if (payload.file) {
      lampiran_url = await uploadLampiran(payload.file);
      if (payload.file && !lampiran_url) return;
    }
    const row = {
      kas: payload.kas,
      tipe: payload.tipe,
      jumlah: payload.jumlah,
      keterangan: payload.keterangan,
      tanggal: payload.tanggal,
      lampiran_url,
      petugas_nama: user.nama,
      petugas_role: user.role,
    };
    const { data, error } = await supabase.from("transaksi_kas").insert(row).select("*").single();
    if (error) { toast.error("Gagal menambah: " + error.message); return; }
    await supabase.from("transaksi_kas_history").insert({
      transaksi_id: data.id,
      aksi: "create",
      before_data: null,
      after_data: toJson(data),
      diubah_oleh_nama: user.nama,
      diubah_oleh_role: user.role,
    });
    logAction(`Tambah ${row.tipe} ${row.kas}`, "Keuangan", `${rupiah(row.jumlah)} · ${row.keterangan}`);
    toast.success("Transaksi tersimpan");
    setShowAdd(false);
    await load();
  }

  async function handleEdit(before: Transaksi, payload: TrxFormValues) {
    if (!user) return;
    let lampiran_url = before.lampiran_url;
    if (payload.file) {
      const up = await uploadLampiran(payload.file);
      if (!up) return;
      lampiran_url = up;
    }
    const patch = {
      kas: payload.kas,
      tipe: payload.tipe,
      jumlah: payload.jumlah,
      keterangan: payload.keterangan,
      tanggal: payload.tanggal,
      lampiran_url,
    };
    const { data, error } = await supabase.from("transaksi_kas").update(patch).eq("id", before.id).select("*").single();
    if (error) { toast.error("Gagal mengubah: " + error.message); return; }
    await supabase.from("transaksi_kas_history").insert({
      transaksi_id: before.id,
      aksi: "update",
      before_data: toJson(before),
      after_data: toJson(data),
      diubah_oleh_nama: user.nama,
      diubah_oleh_role: user.role,
    });
    logAction(`Edit transaksi ${before.kas}`, "Keuangan", `${rupiah(before.jumlah)} → ${rupiah(patch.jumlah)}`);
    toast.success("Perubahan disimpan");
    setEditRow(null);
    await load();
  }

  async function handleDelete(row: Transaksi) {
    if (!user) return;
    await supabase.from("transaksi_kas_history").insert({
      transaksi_id: row.id,
      aksi: "delete",
      before_data: toJson(row),
      after_data: null,
      diubah_oleh_nama: user.nama,
      diubah_oleh_role: user.role,
    });
    const { error } = await supabase.from("transaksi_kas").delete().eq("id", row.id);
    if (error) { toast.error("Gagal menghapus: " + error.message); return; }
    logAction(`Hapus transaksi ${row.kas}`, "Keuangan", `${rupiah(row.jumlah)} · ${row.keterangan}`);
    toast.success("Transaksi dihapus");
    setConfirmDel(null);
    await load();
  }

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="glass rounded-2xl p-1 flex gap-1 text-xs font-semibold">
          <button onClick={() => setTab("transaksi")} className={`px-3 py-1.5 rounded-xl ${tab === "transaksi" ? "gradient-primary text-primary-foreground shadow-glow" : ""}`}>Transaksi</button>
          <button onClick={() => setTab("riwayat")} className={`px-3 py-1.5 rounded-xl ${tab === "riwayat" ? "gradient-primary text-primary-foreground shadow-glow" : ""}`}>Riwayat Perubahan</button>
        </div>
        {tab === "transaksi" && canAdd && (
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
            <Plus className="h-4 w-4" /> Tambah Transaksi
          </button>
        )}
      </div>

      {tab === "transaksi" ? (
        <>
          <div className="text-xs text-muted-foreground">{activeKas} · {loading ? "memuat..." : `${trxKas.length} transaksi`}</div>
          <DataTable
            headers={["Tgl", "Tipe", "Jumlah", "Keterangan", "Petugas", "Aksi"]}
            rows={trxKas.map((t) => [
              tanggal(t.tanggal),
              <span key={t.id + "t"} className={`inline-flex items-center gap-1 text-[10px] font-bold ${t.tipe === "Masuk" ? "text-success" : "text-destructive"}`}>
                {t.tipe === "Masuk" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />} {t.tipe}
              </span>,
              <span key={t.id + "j"} className={t.tipe === "Masuk" ? "text-success font-semibold" : "text-destructive font-semibold"}>{rupiah(Number(t.jumlah))}</span>,
              <span key={t.id + "k"} className="max-w-[180px] inline-block truncate align-middle">{t.keterangan}{t.lampiran_url ? <Paperclip className="inline h-3 w-3 ml-1 text-muted-foreground" /> : null}</span>,
              t.petugas_nama,
              <div key={t.id + "a"} className="flex items-center gap-1">
                <button onClick={() => setDetailRow(t)} title="Detail" className="p-1 rounded hover:bg-accent"><Eye className="h-3.5 w-3.5" /></button>
                <button onClick={() => setHistoryRow(t)} title="Riwayat" className="p-1 rounded hover:bg-accent"><HistoryIcon className="h-3.5 w-3.5" /></button>
                {canEdit && <button onClick={() => setEditRow(t)} title="Edit" className="p-1 rounded hover:bg-accent text-primary"><Pencil className="h-3.5 w-3.5" /></button>}
                {canDelete && <button onClick={() => setConfirmDel(t)} title="Hapus" className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>,
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
        </>
      ) : (
        <RiwayatPanel />
      )}

      {showAdd && canAdd && (
        <Modal title={`Tambah Transaksi — ${activeKas}`} onClose={() => setShowAdd(false)}>
          <TrxForm initialKas={activeKas} onSubmit={handleAdd} submitLabel="Simpan Transaksi" />
        </Modal>
      )}

      {editRow && canEdit && (
        <Modal title="Edit Transaksi" onClose={() => setEditRow(null)}>
          <TrxForm
            initialKas={editRow.kas}
            initial={{
              kas: editRow.kas, tipe: editRow.tipe, jumlah: Number(editRow.jumlah),
              keterangan: editRow.keterangan, tanggal: editRow.tanggal, file: null,
            }}
            existingLampiran={editRow.lampiran_url}
            onSubmit={(v) => handleEdit(editRow, v)}
            submitLabel="Simpan Perubahan"
          />
        </Modal>
      )}

      {detailRow && (
        <Modal title="Detail Transaksi" onClose={() => setDetailRow(null)}>
          <DetailView row={detailRow} />
        </Modal>
      )}

      {historyRow && (
        <Modal title="Riwayat Perubahan" onClose={() => setHistoryRow(null)}>
          <HistoryView transaksiId={historyRow.id} />
        </Modal>
      )}

      {confirmDel && canDelete && (
        <Modal title="Hapus Transaksi?" onClose={() => setConfirmDel(null)}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Tindakan ini menghapus transaksi <span className="font-semibold text-foreground">{confirmDel.keterangan}</span> ({rupiah(Number(confirmDel.jumlah))}) dari {confirmDel.kas}. Saldo akan diperbarui otomatis dan aksi tercatat di Audit Log.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDel(null)} className="rounded-xl glass py-2 text-xs font-semibold">Batal</button>
              <button onClick={() => handleDelete(confirmDel)} className="rounded-xl bg-destructive text-destructive-foreground py-2 text-xs font-semibold">Hapus</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface TrxFormValues {
  kas: KasJenis;
  tipe: "Masuk" | "Keluar";
  jumlah: number;
  keterangan: string;
  tanggal: string;
  file: File | null;
}

function TrxForm({
  initialKas, initial, existingLampiran, onSubmit, submitLabel,
}: {
  initialKas: KasJenis;
  initial?: TrxFormValues;
  existingLampiran?: string | null;
  onSubmit: (v: TrxFormValues) => void | Promise<void>;
  submitLabel: string;
}) {
  const [kas, setKas] = useState<KasJenis>(initial?.kas ?? initialKas);
  const [tipe, setTipe] = useState<"Masuk" | "Keluar">(initial?.tipe ?? "Masuk");
  const [jumlah, setJumlah] = useState(initial ? String(initial.jumlah) : "");
  const [keterangan, setKet] = useState(initial?.keterangan ?? "");
  const [tgl, setTgl] = useState(initial?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const j = Number(jumlah);
      if (!j || !keterangan.trim()) return;
      setBusy(true);
      try { await onSubmit({ kas, tipe, jumlah: j, keterangan: keterangan.trim(), tanggal: tgl, file }); }
      finally { setBusy(false); }
    }} className="space-y-3">
      <Field label="Jenis Kas">
        <select value={kas} onChange={(e) => setKas(e.target.value as KasJenis)} className="form-inp">
          {KAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>
      <Field label="Jenis Transaksi">
        <div className="grid grid-cols-2 gap-2">
          {(["Masuk", "Keluar"] as const).map((t) => (
            <button type="button" key={t} onClick={() => setTipe(t)} className={`py-2 rounded-xl text-sm font-semibold ${tipe === t ? (t === "Masuk" ? "bg-success text-white" : "bg-destructive text-destructive-foreground") : "glass"}`}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Nominal (Rp)"><input required type="number" min={0} value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="form-inp" /></Field>
      <Field label="Keterangan"><input required value={keterangan} onChange={(e) => setKet(e.target.value)} className="form-inp" /></Field>
      <Field label="Tanggal"><input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="form-inp" /></Field>
      <Field label="Lampiran (opsional)">
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="form-inp" />
        {existingLampiran && !file && (
          <div className="text-[10px] text-muted-foreground mt-1 truncate">Terlampir: {existingLampiran}</div>
        )}
      </Field>
      <button type="submit" disabled={busy} className="w-full rounded-2xl gradient-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}
      </button>
    </form>
  );
}

function DetailView({ row }: { row: Transaksi }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (row.lampiran_url) {
      supabase.storage.from("keuangan-lampiran").createSignedUrl(row.lampiran_url, 600)
        .then(({ data }) => { if (alive && data) setSignedUrl(data.signedUrl); });
    }
    return () => { alive = false; };
  }, [row.lampiran_url]);
  return (
    <div className="space-y-2 text-xs">
      <Row k="Kas" v={row.kas} />
      <Row k="Jenis" v={row.tipe} />
      <Row k="Nominal" v={rupiah(Number(row.jumlah))} />
      <Row k="Tanggal" v={tanggal(row.tanggal)} />
      <Row k="Keterangan" v={row.keterangan} />
      <Row k="Petugas" v={`${row.petugas_nama}${row.petugas_role ? ` (${row.petugas_role})` : ""}`} />
      <Row k="Dibuat" v={tanggalWaktu(row.created_at)} />
      <Row k="Diperbarui" v={tanggalWaktu(row.updated_at)} />
      {row.lampiran_url && (
        <div className="pt-1">
          <div className="text-muted-foreground mb-1">Lampiran</div>
          {signedUrl
            ? <a href={signedUrl} target="_blank" rel="noreferrer" className="text-primary underline">Buka lampiran</a>
            : <span className="text-muted-foreground">Memuat…</span>}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-muted-foreground">{k}</div>
      <div className="col-span-2 font-medium break-words">{v}</div>
    </div>
  );
}

function HistoryView({ transaksiId }: { transaksiId: string }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    supabase.from("transaksi_kas_history").select("*").eq("transaksi_id", transaksiId).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) toast.error(error.message);
        else setRows((data ?? []) as unknown as HistoryRow[]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [transaksiId]);
  if (loading) return <div className="text-xs text-muted-foreground text-center py-4">Memuat…</div>;
  if (rows.length === 0) return <div className="text-xs text-muted-foreground text-center py-4">Belum ada riwayat perubahan.</div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="glass rounded-xl p-2.5 text-[11px] space-y-1">
          <div className="flex items-center justify-between">
            <div className="font-semibold uppercase text-primary">{r.aksi}</div>
            <div className="text-[10px] text-muted-foreground">{tanggalWaktu(r.created_at)}</div>
          </div>
          <div className="text-muted-foreground">Oleh: {r.diubah_oleh_nama}{r.diubah_oleh_role ? ` (${r.diubah_oleh_role})` : ""}</div>
          <DiffView before={r.before_data} after={r.after_data} />
        </div>
      ))}
    </div>
  );
}

function DiffView({ before, after }: { before: Partial<Transaksi> | null; after: Partial<Transaksi> | null }) {
  const fields: (keyof Transaksi)[] = ["kas", "tipe", "jumlah", "keterangan", "tanggal", "lampiran_url"];
  const changed = fields.filter((f) => String(before?.[f] ?? "") !== String(after?.[f] ?? ""));
  if (changed.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {changed.map((f) => (
        <div key={f} className="grid grid-cols-5 gap-1">
          <div className="text-muted-foreground col-span-1">{f}</div>
          <div className="col-span-2 line-through opacity-70 break-words">{fmt(f, before?.[f])}</div>
          <div className="col-span-2 font-semibold break-words">{fmt(f, after?.[f])}</div>
        </div>
      ))}
    </div>
  );
}

function fmt(k: keyof Transaksi, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (k === "jumlah") return rupiah(Number(v));
  if (k === "tanggal") return tanggal(String(v));
  return String(v);
}

function RiwayatPanel() {
  const [rows, setRows] = useState<(HistoryRow & { trx?: Transaksi | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fKas, setFKas] = useState<"" | KasJenis>("");
  const [fTipe, setFTipe] = useState<"" | "Masuk" | "Keluar">("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fUser, setFUser] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("transaksi_kas_history")
        .select("*, trx:transaksi_kas(*)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!alive) return;
      if (error) toast.error(error.message);
      else setRows((data ?? []) as unknown as (HistoryRow & { trx?: Transaksi | null })[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    const snapshot = (r.after_data ?? r.before_data ?? {}) as Partial<Transaksi>;
    const kas = (r.trx?.kas ?? snapshot.kas) as KasJenis | undefined;
    const tipe = (r.trx?.tipe ?? snapshot.tipe) as "Masuk" | "Keluar" | undefined;
    const tgl = r.trx?.tanggal ?? snapshot.tanggal ?? r.created_at.slice(0, 10);
    if (fKas && kas !== fKas) return false;
    if (fTipe && tipe !== fTipe) return false;
    if (fFrom && tgl < fFrom) return false;
    if (fTo && tgl > fTo) return false;
    if (fUser && !r.diubah_oleh_nama.toLowerCase().includes(fUser.toLowerCase())) return false;
    return true;
  }), [rows, fKas, fTipe, fFrom, fTo, fUser]);

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="col-span-2 sm:col-span-5 flex items-center gap-1 text-muted-foreground text-[11px]"><Filter className="h-3 w-3" /> Filter</div>
        <select value={fKas} onChange={(e) => setFKas(e.target.value as KasJenis | "")} className="form-inp">
          <option value="">Semua Kas</option>
          {KAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={fTipe} onChange={(e) => setFTipe(e.target.value as "" | "Masuk" | "Keluar")} className="form-inp">
          <option value="">Semua Jenis</option>
          <option value="Masuk">Masuk</option>
          <option value="Keluar">Keluar</option>
        </select>
        <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="form-inp" />
        <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="form-inp" />
        <input placeholder="Pengguna…" value={fUser} onChange={(e) => setFUser(e.target.value)} className="form-inp" />
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground text-center py-6">Memuat riwayat…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Belum ada riwayat perubahan.</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((r) => {
            const snap = (r.after_data ?? r.before_data ?? {}) as Partial<Transaksi>;
            const kas = r.trx?.kas ?? snap.kas ?? "—";
            const tipe = r.trx?.tipe ?? snap.tipe;
            const jumlah = Number(r.trx?.jumlah ?? snap.jumlah ?? 0);
            return (
              <div key={r.id} className="glass rounded-xl p-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold truncate">
                    <span className="uppercase text-primary mr-1">{r.aksi}</span>
                    {kas} · {tipe ?? "—"} · {rupiah(jumlah)}
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">{tanggalWaktu(r.created_at)}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">Oleh {r.diubah_oleh_nama}{r.diubah_oleh_role ? ` (${r.diubah_oleh_role})` : ""}{snap.keterangan ? ` — ${snap.keterangan}` : ""}</div>
                <DiffView before={r.before_data} after={r.after_data} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
