import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, CheckCircle2, XCircle, Clock, Loader2, Archive, ShieldCheck, ShieldAlert } from "lucide-react";
import { getSuratById, type SuratStatus } from "@/lib/surat.functions";

export const Route = createFileRoute("/verifikasi-surat/$id")({
  head: () => ({
    meta: [
      { title: "Verifikasi Surat — SiRT 06 Digital" },
      { name: "description", content: "Verifikasi keaslian surat RT 06." },
    ],
  }),
  component: VerifikasiPage,
});

const STATUS_ICON: Record<SuratStatus, { icon: typeof CheckCircle2; color: string }> = {
  Draft: { icon: FileText, color: "text-slate-500" },
  Menunggu: { icon: Clock, color: "text-amber-500" },
  Diproses: { icon: Loader2, color: "text-blue-500" },
  Disetujui: { icon: CheckCircle2, color: "text-emerald-500" },
  Ditolak: { icon: XCircle, color: "text-rose-500" },
  Selesai: { icon: Archive, color: "text-violet-500" },
};

function VerifikasiPage() {
  const { id } = Route.useParams();
  const fnGet = useServerFn(getSuratById);
  const q = useQuery({ queryKey: ["surat", "verify", id], queryFn: () => fnGet({ data: { id } }) });

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-border/60 last:border-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 font-medium break-words">{value || "—"}</div>
    </div>
  );

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-lg glass-strong rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Verifikasi Surat</h1>
            <p className="text-xs text-muted-foreground">SiRT 06 Digital</p>
          </div>
        </div>
        {q.isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">Memuat…</div>
        ) : !q.data ? (
          <div className="glass rounded-2xl p-6 text-center space-y-2">
            <ShieldAlert className="h-10 w-10 mx-auto text-rose-500" />
            <div className="text-sm font-semibold">Surat tidak ditemukan</div>
            <div className="text-xs text-muted-foreground">Nomor / tautan verifikasi tidak valid.</div>
          </div>
        ) : (() => {
          const s = q.data as {
            id: string; nomor_surat: string; jenis: string; pemohon_nama: string;
            status: SuratStatus; created_at: string; approved_nama: string | null;
            approved_jabatan: string | null; approved_at: string | null;
          };
          const S = STATUS_ICON[s.status];
          return (
            <>
              <div className="glass rounded-2xl p-3 flex items-center gap-3">
                <S.icon className={`h-8 w-8 ${S.color}`} />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Status</div>
                  <div className="text-lg font-bold">{s.status}</div>
                </div>
              </div>
              <div>
                {row("Nomor Surat", <span className="font-mono">{s.nomor_surat}</span>)}
                {row("Jenis Surat", s.jenis)}
                {row("Nama Pemohon", s.pemohon_nama)}
                {row("Tanggal Terbit", new Date(s.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }))}
                {s.approved_nama && row("Ditandatangani", `${s.approved_nama}${s.approved_jabatan ? " (" + s.approved_jabatan + ")" : ""}`)}
              </div>
              <div className="text-[11px] text-muted-foreground text-center">
                Halaman ini menampilkan status keaslian surat resmi RT 06.
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}