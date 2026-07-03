import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Save, ArrowLeft } from "lucide-react";
import { useAuth, ROLES, type Role } from "@/lib/auth-context";

export const Route = createFileRoute("/manajemen-pin")({
  head: () => ({ meta: [{ title: "Manajemen PIN — SiRT 06 Digital" }] }),
  component: ManajemenPin,
});

function ManajemenPin() {
  const { user, pins, setPin, logAction } = useAuth();
  const [draft, setDraft] = useState<Record<Role, string>>(pins);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setDraft(pins), [pins]);

  if (!user || user.role !== "Super Admin") {
    return (
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 text-center space-y-3">
        <KeyRound className="h-10 w-10 mx-auto text-primary" />
        <div className="text-base font-bold">Akses Terbatas</div>
        <div className="text-xs text-muted-foreground">Hanya Super Admin yang dapat mengelola PIN.</div>
        <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold">Login</Link>
      </div>
    );
  }

  const save = (role: Role) => {
    const v = draft[role];
    if (!/^\d{6}$/.test(v)) { setMsg("PIN harus 6 digit angka."); return; }
    setPin(role, v);
    logAction("Ganti PIN", "Manajemen PIN", `Role: ${role}`);
    setMsg(`PIN ${role} berhasil diperbarui.`);
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow"><KeyRound className="h-6 w-6" /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold">Manajemen PIN</h1>
          <p className="text-xs text-muted-foreground">Ganti PIN 6 digit untuk setiap role (tersimpan lokal).</p>
        </div>
      </div>

      {ROLES.map((r) => (
        <div key={r} className="glass-strong rounded-2xl p-4 space-y-2">
          <div className="text-sm font-bold">{r}</div>
          <div className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={draft[r] ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, [r]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              className="flex-1 min-w-0 rounded-xl bg-input border border-border px-3 py-2 text-center tracking-[0.4em] font-bold"
              placeholder="••••••"
            />
            <button onClick={() => save(r)} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-xs font-semibold shadow-glow">
              <Save className="h-3.5 w-3.5" /> Simpan
            </button>
          </div>
        </div>
      ))}

      {msg && <div className="glass rounded-xl p-3 text-xs text-center">{msg}</div>}

      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Dashboard
      </Link>
    </div>
  );
}