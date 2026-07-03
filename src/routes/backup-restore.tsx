import { createFileRoute } from "@tanstack/react-router";
import { Database, Download, Upload } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/backup-restore")({
  head: () => ({ meta: [{ title: "Backup & Restore — SiRT 06 Digital" }] }),
  component: BackupRestore,
});

const KEYS = [
  "sirt06.pins.v1", "sirt06.users.v1", "sirt06.audit.v1",
  "sirt06.settings.v1", "sirt06.warga", "sirt06.kk", "sirt06.mutasi",
  "sirt06.transaksi", "sirt06.barang", "sirt06.pinjaman",
  "sirt06.kegiatan", "sirt06.absensi", "sirt06.laporan",
  "sirt06.pengumuman", "sirt06.umkm",
];

function BackupRestore() {
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const data: Record<string, unknown> = {};
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v != null) {
        try { data[k] = JSON.parse(v); } catch { data[k] = v; }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sirt06-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const txt = await file.text();
    const obj = JSON.parse(txt) as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      localStorage.setItem(k, JSON.stringify(v));
    }
    alert("Restore selesai. Muat ulang halaman untuk melihat perubahan.");
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow"><Database className="h-6 w-6" /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold">Backup & Restore</h1>
          <p className="text-xs text-muted-foreground">Ekspor / impor seluruh data lokal SiRT 06 dalam bentuk JSON.</p>
        </div>
      </div>
      <div className="glass-strong rounded-2xl p-4 space-y-3">
        <button onClick={doExport} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold shadow-glow">
          <Download className="h-4 w-4" /> Export Backup (.json)
        </button>
        <button onClick={() => fileRef.current?.click()} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl glass py-3 font-semibold">
          <Upload className="h-4 w-4" /> Restore dari file
        </button>
        <input
          ref={fileRef} type="file" accept="application/json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}