import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText, Plus, Printer, Trash2, Check, X, Clock, Loader2, Search,
  Filter, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import {
  listSurat, createSurat, updateSuratStatus, deleteSurat, JENIS_SURAT,
} from "@/lib/surat.functions";

export const Route = createFileRoute("/administrasi")({
  head: () => ({
    meta: [
      { title: "Administrasi — SiRT 06 Digital" },
      { name: "description", content: "Pengajuan dan riwayat surat-menyurat warga RT 06." },
    ],
  }),
  component: AdministrasiPage,
});

type Surat = {
  id: string;
  nomor_surat: string;
  jenis: string;
  pemohon_nama: string;
  pemohon_nik: string | null;
  pemohon_alamat: string | null;
  pemohon_telp: string | null;
  keperluan: string;
  catatan: string | null;
  status: "Menunggu" | "Diproses" | "Disetujui" | "Ditolak";
  alasan_tolak: string | null;
  approved_nama: string | null;
  approved_jabatan: string | null;
  approved_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<Surat["status"], string> = {
  Menunggu: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Diproses: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  Disetujui: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Ditolak: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

function AdministrasiPage() {
  const { user, logAction } = useAuth();
  const { identity, pengurus } = useSettings();
  const qc = useQueryClient();
  const fnList = useServerFn(listSurat);
  const fnCreate = useServerFn(createSurat);
  const fnStatus = useServerFn(updateSuratStatus);
  const fnDelete = useServerFn(deleteSurat);

  const q = useQuery({ queryKey: ["surat", "list"], queryFn: () => fnList() });
  const surat = (q.data ?? []) as Surat[];

  const [openForm, setOpenForm] = useState(false);
  const [printItem, setPrintItem] = useState<Surat | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Surat["status"]>("");

  const isPengurus = !!user;
  const isKetua = user?.role === "Ketua RT" || user?.role === "Super Admin";

  const stats = useMemo(() => {
    const s = { Menunggu: 0, Diproses: 0, Disetujui: 0, Ditolak: 0 };
    surat.forEach((x) => { s[x.status]++; });
    return s;
  }, [surat]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return surat.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (!term) return true;
      return (
        s.nomor_surat.toLowerCase().includes(term) ||
        s.pemohon_nama.toLowerCase().includes(term) ||
        s.jenis.toLowerCase().includes(term)
      );
    });
  }, [surat, search, statusFilter]);

  async function handleCreate(payload: Parameters<typeof fnCreate>[0]["data"]) {
    try {
      await fnCreate({ data: payload });
      await qc.invalidateQueries({ queryKey: ["surat"] });
      setOpenForm(false);
      toast.success("Pengajuan surat tersimpan");
      logAction("Ajukan surat", "Administrasi", `${payload.jenis} — ${payload.pemohon_nama}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function changeStatus(item: Surat, status: Surat["status"]) {
    let alasan = "";
    if (status === "Ditolak") {
      const a = prompt("Alasan penolakan:");
      if (a === null) return;
      alasan = a;
    }
    try {
      await fnStatus({ data: { id: item.id, status, alasan_tolak: alasan } });
      await qc.invalidateQueries({ queryKey: ["surat"] });
      toast.success(`Status diperbarui: ${status}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(item: Surat) {
    if (!confirm(`Hapus pengajuan ${item.nomor_surat}?`)) return;
    try {
      await fnDelete({ data: { id: item.id } });
      await qc.invalidateQueries({ queryKey: ["surat"] });
      toast.success("Pengajuan dihapus");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <header className="glass-strong rounded-3xl p-4 sm:p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold leading-tight">Administrasi Surat</h1>
          <p className="text-[11px] text-muted-foreground">Pengajuan & riwayat surat-menyurat RT 06</p>
        </div>
        <button
          onClick={() => setOpenForm(true)}
          className="inline-flex items-center gap-1.5 rounded-2xl gradient-primary text-primary-foreground px-3 py-2 text-xs font-semibold shadow-glow min-h-[40px]"
        >
          <Plus className="h-4 w-4" /> Ajukan
        </button>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([
          ["Menunggu", stats.Menunggu, Clock, "text-amber-500"],
          ["Diproses", stats.Diproses, Loader2, "text-blue-500"],
          ["Disetujui", stats.Disetujui, CheckCircle2, "text-emerald-500"],
          ["Ditolak", stats.Ditolak, XCircle, "text-rose-500"],
        ] as const).map(([label, n, Icon, color]) => (
          <div key={label} className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-xl font-bold mt-1">{n}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none py-2"
            placeholder="Cari nomor / nama / jenis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-transparent text-xs font-semibold px-2 py-2 rounded-xl border border-border"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | Surat["status"])}
        >
          <option value="">Semua</option>
          <option>Menunggu</option>
          <option>Diproses</option>
          <option>Disetujui</option>
          <option>Ditolak</option>
        </select>
      </div>

      {q.isLoading ? (
        <div className="glass-strong rounded-2xl p-6 text-center text-sm text-muted-foreground">Memuat…</div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong rounded-3xl p-8 text-center space-y-2">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <div className="text-sm font-semibold">Belum ada pengajuan surat</div>
          <div className="text-xs text-muted-foreground">Klik tombol "Ajukan" untuk membuat pengajuan pertama.</div>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li key={s.id} className="glass rounded-2xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{s.nomor_surat}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                  </div>
                  <div className="text-sm font-semibold truncate mt-1">{s.jenis}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.pemohon_nama} • {new Date(s.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  <div className="text-xs mt-1 line-clamp-2">{s.keperluan}</div>
                  {s.status === "Ditolak" && s.alasan_tolak && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex gap-1 items-start">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {s.alasan_tolak}
                    </div>
                  )}
                  {s.approved_nama && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      Disetujui oleh {s.approved_nama} ({s.approved_jabatan}){s.approved_at ? ` • ${new Date(s.approved_at).toLocaleDateString("id-ID")}` : ""}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
                <button onClick={() => setPrintItem(s)} className="inline-flex items-center gap-1 rounded-xl glass px-2.5 py-1.5 text-[11px] font-semibold min-h-[36px]">
                  <Printer className="h-3.5 w-3.5" /> Cetak / PDF
                </button>
                {isPengurus && s.status === "Menunggu" && (
                  <button onClick={() => changeStatus(s, "Diproses")} className="inline-flex items-center gap-1 rounded-xl bg-blue-500/15 text-blue-600 px-2.5 py-1.5 text-[11px] font-semibold min-h-[36px]">
                    <Loader2 className="h-3.5 w-3.5" /> Proses
                  </button>
                )}
                {isPengurus && (s.status === "Menunggu" || s.status === "Diproses") && (
                  <>
                    {isKetua && (
                      <button onClick={() => changeStatus(s, "Disetujui")} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 text-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold min-h-[36px]">
                        <Check className="h-3.5 w-3.5" /> Setujui
                      </button>
                    )}
                    <button onClick={() => changeStatus(s, "Ditolak")} className="inline-flex items-center gap-1 rounded-xl bg-rose-500/15 text-rose-600 px-2.5 py-1.5 text-[11px] font-semibold min-h-[36px]">
                      <X className="h-3.5 w-3.5" /> Tolak
                    </button>
                  </>
                )}
                {isPengurus && (
                  <button onClick={() => remove(s)} className="inline-flex items-center gap-1 rounded-xl bg-muted text-muted-foreground px-2.5 py-1.5 text-[11px] font-semibold min-h-[36px] ml-auto">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {openForm && <SuratForm onClose={() => setOpenForm(false)} onSubmit={handleCreate} />}
      {printItem && <SuratPrint item={printItem} identity={identity} ketuaRT={pengurus.ketuaRT} onClose={() => setPrintItem(null)} />}
    </div>
  );
}

function SuratForm({
  onClose, onSubmit,
}: {
  onClose: () => void;
  onSubmit: (d: {
    jenis: string; jenisKode: string; pemohon_nama: string;
    pemohon_nik?: string; pemohon_alamat?: string; pemohon_telp?: string;
    keperluan: string; catatan?: string;
  }) => Promise<void>;
}) {
  const [jenisKode, setJenisKode] = useState<string>(JENIS_SURAT[0].kode);
  const [jenisCustom, setJenisCustom] = useState("");
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [alamat, setAlamat] = useState("");
  const [telp, setTelp] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const jenisPreset = JENIS_SURAT.find((j) => j.kode === jenisKode);
  const jenisLabel = jenisKode === "LAIN" ? (jenisCustom.trim() || "Surat Lainnya") : (jenisPreset?.label ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !keperluan.trim()) {
      toast.error("Nama pemohon dan keperluan wajib diisi");
      return;
    }
    setSubmitting(true);
    await onSubmit({
      jenis: jenisLabel,
      jenisKode,
      pemohon_nama: nama.trim(),
      pemohon_nik: nik.trim() || undefined,
      pemohon_alamat: alamat.trim() || undefined,
      pemohon_telp: telp.trim() || undefined,
      keperluan: keperluan.trim(),
      catatan: catatan.trim() || undefined,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center p-2 sm:p-4">
      <form onSubmit={submit} className="w-full max-w-lg glass-strong rounded-3xl p-4 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">Ajukan Surat</div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl glass"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold">Jenis Surat</label>
          <select value={jenisKode} onChange={(e) => setJenisKode(e.target.value)} className="form-input w-full">
            {JENIS_SURAT.map((j) => <option key={j.kode} value={j.kode}>{j.label}</option>)}
          </select>
          {jenisKode === "LAIN" && (
            <input value={jenisCustom} onChange={(e) => setJenisCustom(e.target.value)} placeholder="Nama jenis surat" className="form-input w-full mt-1" />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold">Nama Pemohon *</span>
            <input value={nama} onChange={(e) => setNama(e.target.value)} className="form-input w-full" required />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold">NIK</span>
            <input value={nik} onChange={(e) => setNik(e.target.value)} className="form-input w-full" inputMode="numeric" />
          </label>
        </div>
        <label className="space-y-1 block">
          <span className="text-[11px] font-semibold">Alamat</span>
          <input value={alamat} onChange={(e) => setAlamat(e.target.value)} className="form-input w-full" />
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-semibold">No. WhatsApp / Telp</span>
          <input value={telp} onChange={(e) => setTelp(e.target.value)} className="form-input w-full" inputMode="tel" />
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-semibold">Keperluan *</span>
          <textarea value={keperluan} onChange={(e) => setKeperluan(e.target.value)} className="form-input w-full min-h-[80px]" required />
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-semibold">Catatan tambahan</span>
          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} className="form-input w-full min-h-[60px]" />
        </label>
        <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-glow min-h-[44px] disabled:opacity-60">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Kirim Pengajuan
        </button>
      </form>
    </div>
  );
}

function SuratPrint({
  item, identity, ketuaRT, onClose,
}: {
  item: Surat;
  identity: { namaLingkungan: string; nomorRT: string; nomorRW: string; kelurahan: string; kecamatan: string; kota: string; provinsi: string };
  ketuaRT: string;
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-2 sm:p-4">
      <div className="w-full max-w-2xl bg-white text-black rounded-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 print:hidden">
          <div className="text-sm font-semibold">Pratinjau Surat</div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
              <Printer className="h-4 w-4" /> Cetak / Simpan PDF
            </button>
            <button onClick={onClose} className="inline-flex items-center gap-1 rounded-xl bg-gray-100 text-black px-3 py-2 text-xs font-semibold">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div id="print-area" className="p-8 overflow-y-auto text-[13px] leading-relaxed">
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <div className="text-sm font-bold">PEMERINTAH KELURAHAN {identity.kelurahan?.toUpperCase() || "—"}</div>
            <div className="text-base font-bold">RUKUN TETANGGA {identity.nomorRT} / RUKUN WARGA {identity.nomorRW}</div>
            <div className="text-xs">{identity.namaLingkungan} • Kec. {identity.kecamatan || "—"} • {identity.kota || "—"}, {identity.provinsi || "—"}</div>
          </div>
          <div className="text-center font-bold underline uppercase">{item.jenis}</div>
          <div className="text-center text-xs mb-4">Nomor: {item.nomor_surat}</div>
          <p>Yang bertanda tangan di bawah ini, Ketua RT {identity.nomorRT} / RW {identity.nomorRW} {identity.namaLingkungan}, dengan ini menerangkan bahwa:</p>
          <table className="my-3 text-[13px]">
            <tbody>
              <tr><td className="pr-3 align-top">Nama</td><td>: <strong>{item.pemohon_nama}</strong></td></tr>
              {item.pemohon_nik && <tr><td className="pr-3 align-top">NIK</td><td>: {item.pemohon_nik}</td></tr>}
              {item.pemohon_alamat && <tr><td className="pr-3 align-top">Alamat</td><td>: {item.pemohon_alamat}</td></tr>}
              {item.pemohon_telp && <tr><td className="pr-3 align-top">No. Telp</td><td>: {item.pemohon_telp}</td></tr>}
            </tbody>
          </table>
          <p>adalah benar warga RT {identity.nomorRT} / RW {identity.nomorRW} {identity.namaLingkungan}.</p>
          <p className="mt-2">Surat keterangan ini dibuat untuk keperluan: <strong>{item.keperluan}</strong>.</p>
          {item.catatan && <p className="mt-2">Catatan: {item.catatan}</p>}
          <p className="mt-3">Demikian surat ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
          <div className="flex justify-end mt-8">
            <div className="text-center min-w-[220px]">
              <div>{identity.namaLingkungan}, {today}</div>
              <div className="mt-1">Ketua RT {identity.nomorRT} / RW {identity.nomorRW}</div>
              <div className="h-20" />
              <div className="font-bold underline">{item.approved_nama || ketuaRT || "(_______________)"}</div>
              {item.status !== "Disetujui" && (
                <div className="text-[10px] italic text-gray-500 mt-1">Status: {item.status} — belum ditandatangani</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute !important; inset: 0 !important; padding: 24px !important; }
        }
      `}</style>
    </div>
  );
}