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
  const { user, login, logout, users } = useAuth();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) {
      setErr("Akun terkunci sementara. Coba lagi nanti.");
      return;
    }
    if (pin.length !== 6) {
      setErr("PIN harus 6 digit");
      return;
    }
    const r = login(pin);
    if (!r.ok) {
      const a = attempts + 1;
      setAttempts(a);
      if (a >= 5) {
        setLockedUntil(Date.now() + 5 * 60 * 1000);
        setErr("Gagal 5x. Terkunci 5 menit.");
      } else {
        setErr(`${r.message} (${a}/5)`);
      }
      setPin("");
    } else {
      setErr(null);
      setAttempts(0);
      navigate({ to: "/" });
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
          <button
            onClick={() => { logout(); navigate({ to: "/login" }); }}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-destructive text-destructive-foreground py-3 font-semibold"
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold shadow-glow"
          >
            <LogIn className="h-4 w-4" /> Masuk
          </button>
        </form>
        <div className="mt-5 text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" /> Sesi disimpan di perangkat. PIN awal Ketua RT: <b>060707</b>
        </div>
      </div>
      <details className="glass rounded-2xl p-3 text-xs">
        <summary className="cursor-pointer font-semibold">Daftar akun demo ({users.length})</summary>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between"><span>{u.nama} · {u.role}</span><span className="tabular-nums">PIN {u.pin}</span></li>
          ))}
        </ul>
      </details>
    </div>
  );
}