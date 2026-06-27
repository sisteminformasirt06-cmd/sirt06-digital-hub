import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, LogIn, ShieldCheck, LogOut, KeyRound } from "lucide-react";
import logo from "@/assets/logo-rt.png";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login Pengurus — SiRT 06 Digital" },
      { name: "description", content: "Halaman login pengurus RT 06 menggunakan PIN 6 digit." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setErr("PIN harus 6 digit");
      return;
    }
    setBusy(true);
    try {
      const r = await login(pin);
      if (!r.ok) {
        setErr(r.message ?? "PIN salah");
        setPin("");
        return;
      }
      setErr(null);
      if (r.harusGantiPin) {
        navigate({ to: "/ganti-pin" });
      } else {
        navigate({ to: "/" });
      }
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="glass-strong rounded-3xl p-6 text-center">
          <img src={logo} alt="Logo RT 06" className="h-20 w-20 rounded-full mx-auto shadow-glow" />
          <div className="mt-4 text-base font-bold">Anda sedang login sebagai</div>
          <div className="text-xl font-bold text-gradient-primary mt-1">{user.nama}</div>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" /> {user.role}
          </div>
          {user.harusGantiPin && (
            <button
              onClick={() => navigate({ to: "/ganti-pin" })}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-warning/90 text-warning-foreground py-3 font-semibold"
            >
              <KeyRound className="h-4 w-4" /> Ganti PIN Sekarang
            </button>
          )}
          <button
            onClick={async () => { await logout(); navigate({ to: "/login" }); }}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-destructive text-destructive-foreground py-3 font-semibold"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-6">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="Logo RT 06" className="h-20 w-20 rounded-full shadow-glow" />
          <h1 className="mt-3 text-xl font-bold">Login Pengurus</h1>
          <p className="text-xs text-muted-foreground">SiRT 06 Digital — RT 06 / RW 07 Bogeman Wetan</p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> PIN 6 Digit</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1.5 w-full rounded-xl bg-input border border-border px-4 py-3 text-center tracking-[0.5em] text-lg font-bold"
              placeholder="••••••"
              autoFocus
            />
          </label>
          {err && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{err}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold shadow-glow disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" /> {busy ? "Memverifikasi…" : "Masuk"}
          </button>
        </form>
        <div className="mt-5 text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" /> Sesi aman (cookie httpOnly). PIN default akun baru: <b>123456</b>
        </div>
      </div>
      <div className="glass rounded-2xl p-3 text-[11px] text-muted-foreground text-center">
        Salah PIN 5x berturut-turut akan mengunci akun selama 15 menit.
      </div>
    </div>
  );
}