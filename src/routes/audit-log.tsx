import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/audit-log")({
  head: () => ({ meta: [{ title: "Audit Log — SiRT 06 Digital" }] }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const { audit } = useAuth();
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow"><History className="h-6 w-6" /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold">Audit Log</h1>
          <p className="text-xs text-muted-foreground">Aktivitas terbaru (tersimpan lokal, maks 500 entri).</p>
        </div>
      </div>
      {audit.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Belum ada data.</div>
      ) : (
        <div className="space-y-1.5">
          {audit.map((a) => (
            <div key={a.id} className="glass rounded-xl p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{a.aksi} <span className="text-muted-foreground font-normal">• {a.modul}</span></div>
                <div className="text-[10px] text-muted-foreground shrink-0">{new Date(a.waktu).toLocaleString("id-ID")}</div>
              </div>
              <div className="text-[10px] text-muted-foreground">{a.nama}{a.role ? ` (${a.role})` : ""}{a.detail ? ` — ${a.detail}` : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}