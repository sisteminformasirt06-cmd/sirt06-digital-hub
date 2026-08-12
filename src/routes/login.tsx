import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, LogIn, ShieldCheck, LogOut, KeyRound, Eye, EyeOff, ArrowLeft, LayoutDashboard } from "lucide-react";
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
  const [showPin, setShowPin] = useState(false);
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
        setErr(r.message ?? "PIN tidak benar.");
        setPin("");
        return;
      }
      setErr(null);
      navigate({ to: r.harusGantiPin ? "/ganti-pin" : "/super-admin" });
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
          {!user.harusGantiPin && (
            <button
              onClick={() => navigate({ to: user.role === "Super Admin" ? "/super-admin" : "/" })}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold shadow-glow"
            >
              <LayoutDashboard className="h-4 w-4" /> Buka Dashboard
            </button>
          )}
          {user.harusGantiPin && (
            <button
              onClick={() => navigate({ to: "/ganti-pin" })}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-warning/90 text-white py-3 font-semibold"
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
          <p className="text-xs text-muted-foreground">Masukkan PIN 6 digit</p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> PIN 6 Digit</span>
            <div className="relative mt-1.5">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl bg-input border border-border pl-12 pr-12 py-3 text-center tracking-[0.5em] text-lg font-bold"
                placeholder="••••••"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-xl hover:bg-accent text-muted-foreground"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
        <Link
          to="/"
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl glass py-3 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Link>
        <div className="mt-5 text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" /> PIN tersimpan ter-enkripsi di database. Super Admin awal: <b>123456</b> (wajib diganti saat login pertama).
        </div>
      </div>
      <div className="glass rounded-2xl p-3 text-[11px] text-muted-foreground text-center">
        Sesi login aman (cookie server) dan tetap aktif setelah refresh hingga Anda menekan Logout.
      </div>
    </div>
  );
}