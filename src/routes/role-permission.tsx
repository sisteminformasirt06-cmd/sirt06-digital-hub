import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/role-permission")({
  head: () => ({ meta: [{ title: "Role & Permission — SiRT 06 Digital" }] }),
  component: RolePermission,
});

const MATRIX: { modul: string; roles: string[] }[] = [
  { modul: "Dashboard", roles: ["Warga", "Admin", "Bendahara", "Super Admin"] },
  { modul: "Data Warga", roles: ["Admin", "Super Admin"] },
  { modul: "Administrasi Surat", roles: ["Admin", "Super Admin"] },
  { modul: "Keuangan / Kas", roles: ["Bendahara", "Admin", "Super Admin"] },
  { modul: "Inventaris", roles: ["Admin", "Super Admin"] },
  { modul: "Poskamling / Absensi", roles: ["Admin", "Super Admin"] },
  { modul: "Pengumuman", roles: ["Admin", "Super Admin"] },
  { modul: "Kritik & Saran (Kelola)", roles: ["Admin", "Super Admin"] },
  { modul: "Emergency Center", roles: ["Warga", "Admin", "Super Admin"] },
  { modul: "UMKM Warga", roles: ["Warga", "Admin", "Super Admin"] },
  { modul: "WhatsApp Center", roles: ["Admin", "Super Admin"] },
  { modul: "Backup & Restore", roles: ["Super Admin"] },
  { modul: "Manajemen PIN", roles: ["Super Admin"] },
  { modul: "Audit Log", roles: ["Super Admin"] },
];

function RolePermission() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow"><ShieldCheck className="h-6 w-6" /></div>
        <div>
          <h1 className="text-lg font-extrabold">Role & Permission</h1>
          <p className="text-xs text-muted-foreground">Matriks akses modul berdasarkan role.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {MATRIX.map((m) => (
          <div key={m.modul} className="glass rounded-xl p-3">
            <div className="text-sm font-semibold">{m.modul}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {m.roles.map((r) => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{r}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}