import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, ShieldCheck, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { changeMyPin } from "@/lib/auth.functions";

export const Route = createFileRoute("/ganti-pin")({
  head: () => ({ meta: [{ title: "Ganti PIN — SiRT 06 Digital" }] }),
  component: GantiPinPage,
});

function GantiPinPage() {
  const { user, refresh, loadingSession } = useAuth();
  const fn = useServerFn(changeMyPin);
  const navigate = useNavigate();
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loadingSession) {
    return (
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 text-center">
        <div className="text-sm font-semibold text-muted-foreground">Memuat sesi…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 text-center">
        <div className="text-sm font-semibold">Silakan login terlebih dahulu.</div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(false);
    if (oldPin.length !== 6 || newPin.length !== 6) { setErr("PIN harus 6 digit"); return; }
    if (newPin !== confirmPin) { setErr("Konfirmasi PIN tidak cocok"); return; }
    if (oldPin === newPin) { setErr("PIN baru harus berbeda"); return; }
    if (/^(.)\1{5}$/.test(newPin)) { setErr("PIN terlalu mudah ditebak"); return; }
    setBusy(true);
    try {
      await fn({ data: { oldPin, newPin } });
      setOk(true);
      setOldPin(""); setNewPin(""); setConfirmPin("");
      await refresh();
      setTimeout(() => navigate({ to: "/" }), 800);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-2xl gradient-primary text-primary-foreground"><KeyRound className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-bold">Ganti PIN</h1>
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {user.nama} • {user.role}</div>
          </div>
        </div>
        {user.harusGantiPin && (
          <div className="mt-4 text-xs bg-warning/15 text-warning rounded-lg px-3 py-2">
            Anda wajib mengganti PIN default sebelum melanjutkan.
          </div>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <PinField label="PIN Lama" value={oldPin} onChange={setOldPin} />
          <PinField label="PIN Baru (6 digit)" value={newPin} onChange={setNewPin} />
          <PinField label="Konfirmasi PIN Baru" value={confirmPin} onChange={setConfirmPin} />
          {err && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{err}</div>}
          {ok && <div className="text-xs text-success bg-success/10 rounded-lg px-3 py-2">PIN berhasil diganti. Mengalihkan…</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold shadow-glow disabled:opacity-60"
          >
            {busy ? "Menyimpan…" : "Simpan PIN Baru"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function PinField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="mt-1.5 w-full rounded-xl bg-input border border-border px-4 py-3 text-center tracking-[0.5em] text-lg font-bold"
        placeholder="••••••"
      />
    </label>
  );
}