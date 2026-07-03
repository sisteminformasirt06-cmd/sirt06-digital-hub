import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

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

export interface StaffUser {
  id: string;
  nama: string;
  role: Role;
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

const LS_PINS = "sirt06.pins.v1";
const LS_SESSION = "sirt06.session.v1";
const LS_USERS = "sirt06.users.v1";
const LS_AUDIT = "sirt06.audit.v1";

const DEFAULT_PINS: Record<Role, string> = {
  "Warga": "111111",
  "Admin": "222222",
  "Bendahara": "333333",
  "Super Admin": "000000",
} as Record<Role, string>;

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeLS(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pins, setPins] = useState<Record<Role, string>>(DEFAULT_PINS);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    setPins({ ...DEFAULT_PINS, ...readLS<Record<Role, string>>(LS_PINS, {} as Record<Role, string>) });
    setUser(readLS<StaffUser | null>(LS_SESSION, null));
    setUsers(readLS<StaffUser[]>(LS_USERS, []));
    setAudit(readLS<AuditEntry[]>(LS_AUDIT, []));
    setLoadingSession(false);
  }, []);

  const roleNameMap: Record<Role, string> = {
    "Warga": "Warga",
    "Admin": "Admin RT",
    "Bendahara": "Bendahara RT",
    "Super Admin": "Super Admin",
  } as Record<Role, string>;

  const login: AuthCtx["login"] = useCallback(async (pin) => {
    const entry = (Object.entries(pins) as [Role, string][]).find(([, v]) => v === pin);
    if (!entry) return { ok: false, message: "PIN salah atau tidak dikenali" };
    const [role] = entry;
    const su: StaffUser = {
      id: role.toLowerCase().replace(/\s+/g, "-"),
      nama: roleNameMap[role] ?? role,
      role,
      aktif: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    setUser(su);
    writeLS(LS_SESSION, su);
    return { ok: true };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  const logout: AuthCtx["logout"] = useCallback(async () => {
    setUser(null);
    writeLS(LS_SESSION, null);
  }, []);

  const setPin = useCallback((role: Role, pin: string) => {
    setPins((prev) => {
      const next = { ...prev, [role]: pin };
      writeLS(LS_PINS, next);
      return next;
    });
  }, []);

  const logAction = useCallback((aksi: string, modul: string, detail?: string) => {
    setAudit((prev) => {
      const entry: AuditEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nama: user?.nama ?? "Anonim",
        role: user?.role ?? null,
        aksi, modul, detail: detail ?? null,
        waktu: new Date().toISOString(),
      };
      const next = [entry, ...prev].slice(0, 500);
      writeLS(LS_AUDIT, next);
      return next;
    });
  }, [user]);

  const addUser: AuthCtx["addUser"] = useCallback(async (u) => {
    setUsers((prev) => {
      const next: StaffUser[] = [
        ...prev,
        { ...u, id: `${Date.now()}`, createdAt: new Date().toISOString() },
      ];
      writeLS(LS_USERS, next);
      return next;
    });
  }, []);
  const updateUser: AuthCtx["updateUser"] = useCallback(async (id, patch) => {
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === id ? { ...u, ...patch } : u));
      writeLS(LS_USERS, next);
      return next;
    });
  }, []);
  const removeUser: AuthCtx["removeUser"] = useCallback(async (id) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      writeLS(LS_USERS, next);
      return next;
    });
  }, []);

  const hasRole: AuthCtx["hasRole"] = (...roles) => !!user && roles.includes(user.role);
  const refresh = useCallback(async () => {}, []);

  const value = useMemo<AuthCtx>(() => ({
    user, sessionUser: user, loadingSession,
    users, audit, pins,
    login, logout, setPin, addUser, updateUser, removeUser, logAction, hasRole, refresh,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loadingSession, users, audit, pins, login, logout, setPin, addUser, updateUser, removeUser, logAction, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}