import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadLS, saveLS, uid, nowISO } from "./storage";

export type Role =
  | "Ketua RT"
  | "Sekretaris"
  | "Bendahara"
  | "Sie Perlengkapan"
  | "Sie Keamanan"
  | "Sie Sosial"
  | "Sie Humas"
  | "Sie Pemuda"
  | "Sie Lingkungan"
  | "Admin"
  | "Warga";

export const ROLES: Role[] = [
  "Ketua RT", "Sekretaris", "Bendahara", "Sie Perlengkapan", "Sie Keamanan",
  "Sie Sosial", "Sie Humas", "Sie Pemuda", "Sie Lingkungan", "Admin", "Warga",
];

export interface StaffUser {
  id: string;
  nama: string;
  role: Role;
  pin: string; // 6-digit
  aktif: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  nama: string;
  role: Role | "Anonim";
  aksi: string;
  modul: string;
  detail?: string;
  waktu: string;
}

const USERS_KEY = "sirt06_staff_users_v1";
const SESSION_KEY = "sirt06_session_v1";
const AUDIT_KEY = "sirt06_audit_v1";

const DEFAULT_USERS: StaffUser[] = [
  { id: "u_ketua", nama: "Ketua RT", role: "Ketua RT", pin: "060707", aktif: true, createdAt: nowISO() },
  { id: "u_sek", nama: "Sekretaris RT", role: "Sekretaris", pin: "111111", aktif: true, createdAt: nowISO() },
  { id: "u_bend", nama: "Bendahara RT", role: "Bendahara", pin: "222222", aktif: true, createdAt: nowISO() },
  { id: "u_perl", nama: "Sie Perlengkapan", role: "Sie Perlengkapan", pin: "333333", aktif: true, createdAt: nowISO() },
];

interface AuthCtx {
  user: StaffUser | null;
  users: StaffUser[];
  audit: AuditEntry[];
  login: (pin: string) => { ok: boolean; message?: string };
  logout: () => void;
  addUser: (u: Omit<StaffUser, "id" | "createdAt">) => void;
  updateUser: (id: string, patch: Partial<StaffUser>) => void;
  removeUser: (id: string) => void;
  logAction: (aksi: string, modul: string, detail?: string) => void;
  hasRole: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StaffUser[]>(() => loadLS(USERS_KEY, DEFAULT_USERS));
  const [user, setUser] = useState<StaffUser | null>(() => loadLS<StaffUser | null>(SESSION_KEY, null));
  const [audit, setAudit] = useState<AuditEntry[]>(() => loadLS(AUDIT_KEY, []));

  useEffect(() => saveLS(USERS_KEY, users), [users]);
  useEffect(() => saveLS(SESSION_KEY, user), [user]);
  useEffect(() => saveLS(AUDIT_KEY, audit), [audit]);

  const logAction = useCallback((aksi: string, modul: string, detail?: string) => {
    setAudit((prev) => [
      {
        id: uid("aud"),
        userId: user?.id ?? null,
        nama: user?.nama ?? "Anonim",
        role: user?.role ?? "Anonim",
        aksi, modul, detail,
        waktu: nowISO(),
      },
      ...prev,
    ].slice(0, 500));
  }, [user]);

  const login = useCallback((pin: string) => {
    const found = users.find((u) => u.pin === pin && u.aktif);
    if (!found) return { ok: false, message: "PIN salah atau akun nonaktif" };
    setUser(found);
    setAudit((prev) => [
      { id: uid("aud"), userId: found.id, nama: found.nama, role: found.role, aksi: "Login", modul: "Auth", waktu: nowISO() },
      ...prev,
    ].slice(0, 500));
    return { ok: true };
  }, [users]);

  const logout = useCallback(() => {
    if (user) {
      setAudit((prev) => [
        { id: uid("aud"), userId: user.id, nama: user.nama, role: user.role, aksi: "Logout", modul: "Auth", waktu: nowISO() },
        ...prev,
      ].slice(0, 500));
    }
    setUser(null);
  }, [user]);

  const addUser: AuthCtx["addUser"] = (u) => {
    setUsers((p) => [...p, { ...u, id: uid("u"), createdAt: nowISO() }]);
  };
  const updateUser: AuthCtx["updateUser"] = (id, patch) => {
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };
  const removeUser: AuthCtx["removeUser"] = (id) => {
    setUsers((p) => p.filter((u) => u.id !== id));
  };

  const hasRole: AuthCtx["hasRole"] = (...roles) => !!user && roles.includes(user.role);

  const value = useMemo<AuthCtx>(() => ({
    user, users, audit, login, logout, addUser, updateUser, removeUser, logAction, hasRole,
  }), [user, users, audit, login, logout, logAction]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}