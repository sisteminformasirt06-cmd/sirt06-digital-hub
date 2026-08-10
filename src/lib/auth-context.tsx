import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

import { getCurrentSession, loginWithPin, logoutSession, recordAudit } from "./auth.functions";
import { listPengurus, createPengurus, updatePengurus, deletePengurus } from "./pengurus.functions";
import { listAudit } from "./pengurus.functions";
import type { Jabatan } from "./role-map";

// Simplified 4-role system. Legacy role labels kept in the union so existing
// permission checks (e.g. "Ketua RT", "Sekretaris") still typecheck; only the
// four canonical roles below are ever assigned at runtime.
export type Role =
  | "Warga"
  | "Admin"
  | "Bendahara"
  | "Super Admin"
  // legacy labels retained for type-compat with pre-existing gate checks
  | "Ketua RT" | "Sekretaris" | "Bendahara 1" | "Bendahara 2"
  | "Humas" | "Keamanan 1" | "Keamanan 2" | "Sie Kematian"
  | "Sie Umum" | "Sie Perlengkapan" | "Sie Keamanan"
  | "Sie Sosial" | "Sie Humas" | "Sie Pemuda" | "Sie Lingkungan";

export const ROLES: Role[] = ["Warga", "Admin", "Bendahara", "Super Admin"];

/** Map jabatan (database) -> salah satu dari 4 role aplikasi. */
export function jabatanToRole(j: Jabatan | string): Role {
  if (j === "super_admin") return "Super Admin";
  if (j === "bendahara_1" || j === "bendahara_2") return "Bendahara";
  if (j === "warga") return "Warga";
  return "Admin";
}

/** Map role aplikasi -> jabatan default di database. */
export function roleToJabatan(r: Role): Jabatan {
  if (r === "Super Admin") return "super_admin";
  if (r === "Bendahara") return "bendahara_1";
  if (r === "Warga") return "warga";
  return "sekretaris";
}

export interface StaffUser {
  id: string;
  nama: string;
  role: Role;
  jabatan?: Jabatan;
  pin?: string;
  aktif: boolean;
  createdAt: string;
  harusGantiPin?: boolean;
  lastLoginAt?: string | null;
  lockedUntil?: string | null;
  gagalLogin?: number;
}

export interface AuditEntry {
  id: string;
  nama: string;
  role: string | null;
  aksi: string;
  modul: string;
  detail?: string | null;
  waktu: string;
}

interface AuthCtx {
  user: StaffUser | null;
  sessionUser: StaffUser | null;
  loadingSession: boolean;
  users: StaffUser[];
  audit: AuditEntry[];
  pins: Record<Role, string>;
  login: (pin: string) => Promise<{ ok: boolean; message?: string; harusGantiPin?: boolean }>;
  logout: () => Promise<void>;
  setPin: (role: Role, pin: string) => void;
  addUser: (u: Omit<StaffUser, "id" | "createdAt">) => Promise<void>;
  updateUser: (id: string, patch: Partial<StaffUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  logAction: (aksi: string, modul: string, detail?: string) => void;
  hasRole: (...roles: Role[]) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

// PIN default hanya sebagai informasi; PIN sebenarnya tersimpan ter-hash di database.
const DEFAULT_PINS: Record<Role, string> = {
  "Warga": "-",
  "Admin": "-",
  "Bendahara": "-",
  "Super Admin": "123456",
} as Record<Role, string>;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getCurrentSession();
      if (!s) {
        setUser(null);
        setUsers([]);
        setAudit([]);
        return;
      }
      setUser({
        id: s.id,
        nama: s.nama,
        role: jabatanToRole(s.jabatan),
        jabatan: s.jabatan,
        aktif: s.aktif,
        createdAt: new Date().toISOString(),
        harusGantiPin: s.harus_ganti_pin,
      });
      const [rowsU, rowsA] = await Promise.all([
        listPengurus().catch(() => []),
        listAudit().catch(() => []),
      ]);
      setUsers(
        (rowsU as any[]).map((p) => ({
          id: p.id,
          nama: p.nama,
          role: jabatanToRole(p.jabatan),
          jabatan: p.jabatan as Jabatan,
          aktif: p.aktif,
          createdAt: p.created_at,
          harusGantiPin: p.harus_ganti_pin,
          lastLoginAt: p.last_login_at,
          lockedUntil: p.locked_until,
          gagalLogin: p.gagal_login,
        })),
      );
      setAudit(
        (rowsA as any[]).map((a) => ({
          id: a.id,
          nama: a.nama,
          role: a.role ? jabatanToRole(a.role) : null,
          aksi: a.aksi,
          modul: a.modul,
          detail: a.detail,
          waktu: a.waktu,
        })),
      );
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login: AuthCtx["login"] = useCallback(async (pin) => {
    try {
      const r = await loginWithPin({ data: { pin } });
      if (!r.ok) {
        if ("locked" in r && r.locked) {
          return { ok: false, message: "Akun terkunci sementara. Coba lagi nanti." };
        }
        return { ok: false, message: "PIN salah atau tidak dikenali" };
      }
      await refresh();
      return { ok: true, harusGantiPin: r.harusGantiPin };
    } catch (e) {
      return { ok: false, message: (e as Error).message || "Gagal login" };
    }
  }, [refresh]);

  const logout: AuthCtx["logout"] = useCallback(async () => {
    try { await logoutSession(); } finally {
      setUser(null);
      setUsers([]);
      setAudit([]);
    }
  }, []);

  const setPin = useCallback((_role: Role, _pin: string) => {
    /* PIN dikelola per akun di database (Super Admin > Reset PIN, atau Ganti PIN). */
  }, []);

  const logAction = useCallback((aksi: string, modul: string, detail?: string) => {
    setAudit((prev) => [
      {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nama: user?.nama ?? "Anonim",
        role: user?.role ?? null,
        aksi, modul, detail: detail ?? null,
        waktu: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 500));
    void recordAudit({ data: { aksi, modul, detail } }).catch(() => {});
  }, [user]);

  const addUser: AuthCtx["addUser"] = useCallback(async (u) => {
    await createPengurus({
      data: {
        nama: u.nama,
        jabatan: u.jabatan ?? roleToJabatan(u.role),
        ...(u.pin && /^\d{6}$/.test(u.pin) ? { pin: u.pin } : {}),
      },
    });
    await refresh();
  }, [refresh]);

  const updateUser: AuthCtx["updateUser"] = useCallback(async (id, patch) => {
    await updatePengurus({
      data: {
        id,
        ...(patch.nama !== undefined ? { nama: patch.nama } : {}),
        ...(patch.jabatan !== undefined
          ? { jabatan: patch.jabatan }
          : patch.role !== undefined
            ? { jabatan: roleToJabatan(patch.role) }
            : {}),
        ...(patch.aktif !== undefined ? { aktif: patch.aktif } : {}),
      },
    });
    await refresh();
  }, [refresh]);

  const removeUser: AuthCtx["removeUser"] = useCallback(async (id) => {
    await deletePengurus({ data: { id } });
    await refresh();
  }, [refresh]);

  const hasRole: AuthCtx["hasRole"] = (...roles) => !!user && roles.includes(user.role);

  const value = useMemo<AuthCtx>(() => ({
    user, sessionUser: user, loadingSession,
    users, audit, pins: DEFAULT_PINS,
    login, logout, setPin, addUser, updateUser, removeUser, logAction, hasRole, refresh,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loadingSession, users, audit, login, logout, setPin, addUser, updateUser, removeUser, logAction, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
