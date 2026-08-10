import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, RotateCcw, ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { resetPin } from "@/lib/pengurus.functions";

export const Route = createFileRoute("/manajemen-pin")({
  head: () => ({
    meta: [
      { title: "Manajemen PIN — SiRT 06 Digital" },
      { name: "description", content: "Kelola PIN 6 digit akun pengurus RT 06: reset PIN ke default dan pantau status ganti PIN." },
    ],
  }),
  component: ManajemenPin,
});

function ManajemenPin() {
  const { user, users, refresh, logAction } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!user || user.role !== "Super Admin") {
    return (
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 text-center space-y-3">
        <KeyRound className="h-10 w-10 mx-auto text-primary" />
        <div className="text-base font-bold">Akses Terbatas</div>
        <div className="text-xs text-muted-foreground">Hanya Super Admin yang dapat mengelola PIN akun.</div>
        <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold">Login</Link>
      </div>
    );
  }

  const doReset = async (id: string, nama: string) => {
    if (!window.confirm(`Reset PIN "${nama}" ke 123456?`)) return;
    setBusy(id);
    try {
      await resetPin({ data: { id } });
      logAction("Reset PIN", "Manajemen PIN", nama);
      setMsg(`PIN ${nama} direset ke 123456 dan wajib diganti saat login.`);
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow"><KeyRound className="h-6 w-6" /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold">Manajemen PIN</h1>
          <p className="text-xs text-muted-foreground">PIN 6 digit tersimpan ter-enkripsi di database, per akun pengurus.</p>
        </div>
      </div>

      <Link to="/ganti-pin" className="glass rounded-2xl p-3 text-xs flex items-center gap-2 hover:bg-accent">
        <ShieldCheck className="h-4 w-4 text-primary" /> Ganti PIN akun Anda sendiri
      </Link>

      {users.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Belum ada data akun pengurus.</div>
      ) : (
        users.map((u) => (
          <div key={u.id} className="glass-strong rounded-2xl p-4 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{u.nama}</div>
              <div className="text-[11px] text-muted-foreground">
                {u.role}{u.harusGantiPin ? " • wajib ganti PIN" : ""}{u.aktif ? "" : " • nonaktif"}
              </div>
            </div>
            <button
              onClick={() => void doReset(u.id, u.nama)}
              disabled={busy === u.id}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-xs font-semibold shadow-glow disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {busy === u.id ? "Memproses…" : "Reset PIN"}
            </button>
          </div>
        ))
      )}

      {msg && <div className="glass rounded-xl p-3 text-xs text-center">{msg}</div>}

      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Dashboard
      </Link>
    </div>
  );
}
