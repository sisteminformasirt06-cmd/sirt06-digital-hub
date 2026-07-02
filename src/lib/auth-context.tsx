import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCurrentSession,
  loginWithPin,
  logoutSession,
  recordAudit,
} from "./auth.functions";
import {
  createPengurus,
  deletePengurus,
  listPengurus,
  updatePengurus,
} from "./pengurus.functions";
import { labelToJabatan, jabatanToLabel, type Jabatan } from "./role-map";

export type Role =
  | "Super Admin"
  | "Ketua RT"
  | "Sekretaris"
  | "Bendahara"
  | "Bendahara 1"
  | "Bendahara 2"
  | "Humas"
  | "Keamanan 1"
  | "Keamanan 2"
  | "Sie Kematian"
  | "Sie Umum"
  | "Sie Perlengkapan"
  | "Sie Keamanan"
  | "Sie Sosial"
  | "Sie Humas"
  | "Sie Pemuda"
  | "Sie Lingkungan"
  | "Admin"
  | "Warga";

export const ROLES: Role[] = [
  "Super Admin", "Ketua RT", "Sekretaris", "Bendahara 1", "Bendahara 2",
  "Humas", "Keamanan 1", "Keamanan 2", "Sie Perlengkapan", "Sie Kematian",
  "Sie Umum", "Warga",
];

export interface StaffUser {
  id: string;
  nama: string;
  role: Role;
  pin?: string; // legacy; never returned from server
  aktif: boolean;
  createdAt: string;
  jabatan?: Jabatan;
  harusGantiPin?: boolean;
  lastLoginAt?: string | null;
  lockedUntil?: string | null;
  gagalLogin?: number;
}

export interface AuditEntry {
  id: string;
  nama: string;
  role: Jabatan | string | null;
  aksi: string;
  modul: string;
  detail?: string | null;
  waktu: string;
}

export interface SessionUser {
  id: string;
  nama: string;
  jabatan: Jabatan;
  role: Role;
  harus_ganti_pin: boolean;
  aktif: boolean;
}

interface AuthCtx {
  user: StaffUser | null;
  sessionUser: SessionUser | null;
  loadingSession: boolean;
  users: StaffUser[];
  audit: AuditEntry[];
  login: (pin: string) => Promise<{ ok: boolean; message?: string; harusGantiPin?: boolean; locked?: boolean; until?: string }>;
  logout: () => Promise<void>;
  addUser: (u: Omit<StaffUser, "id" | "createdAt">) => Promise<void>;
  updateUser: (id: string, patch: Partial<StaffUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  logAction: (aksi: string, modul: string, detail?: string) => void;
  hasRole: (...roles: Role[]) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const getSession = useServerFn(getCurrentSession);
  const doLogin = useServerFn(loginWithPin);
  const doLogout = useServerFn(logoutSession);
  const doAudit = useServerFn(recordAudit);
  const fnList = useServerFn(listPengurus);
  const fnCreate = useServerFn(createPengurus);
  const fnUpdate = useServerFn(updatePengurus);
  const fnDelete = useServerFn(deletePengurus);

  const sessionQ = useQuery({
    queryKey: ["pengurus", "session"],
    queryFn: () => getSession(),
    staleTime: 30_000,
  });

  const sessionUser = (sessionQ.data ?? null) as SessionUser | null;

  const usersQ = useQuery({
    queryKey: ["pengurus", "list"],
    queryFn: () => fnList(),
    enabled: !!sessionUser,
  });

  const users: StaffUser[] = useMemo(() => {
    const arr = (usersQ.data ?? []) as Array<{
      id: string; nama: string; jabatan: Jabatan; aktif: boolean;
      harus_ganti_pin: boolean; gagal_login: number;
      locked_until: string | null; last_login_at: string | null; created_at: string;
    }>;
    return arr.map((u) => ({
      id: u.id,
      nama: u.nama,
      role: jabatanToLabel(u.jabatan),
      jabatan: u.jabatan,
      aktif: u.aktif,
      createdAt: u.created_at,
      harusGantiPin: u.harus_ganti_pin,
      gagalLogin: u.gagal_login,
      lockedUntil: u.locked_until,
      lastLoginAt: u.last_login_at,
    }));
  }, [usersQ.data]);

  const user: StaffUser | null = sessionUser
    ? {
        id: sessionUser.id,
        nama: sessionUser.nama,
        role: sessionUser.role,
        jabatan: sessionUser.jabatan,
        aktif: sessionUser.aktif,
        createdAt: "",
        harusGantiPin: sessionUser.harus_ganti_pin,
      }
    : null;

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["pengurus"] });
  }, [qc]);

  const login: AuthCtx["login"] = useCallback(async (pin) => {
    try {
      const r = await doLogin({ data: { pin } });
      if (!r.ok) {
        if (r.locked) {
          return { ok: false, locked: true, until: r.until, message: `Akun terkunci hingga ${new Date(r.until).toLocaleString("id-ID")}` };
        }
        return { ok: false, message: "PIN salah atau akun tidak ditemukan" };
      }
      await qc.invalidateQueries({ queryKey: ["pengurus"] });
      return { ok: true, harusGantiPin: r.harusGantiPin };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }, [doLogin, qc]);

  const logout: AuthCtx["logout"] = useCallback(async () => {
    await doLogout({ data: undefined });
    await qc.invalidateQueries({ queryKey: ["pengurus"] });
  }, [doLogout, qc]);

  const logAction = useCallback((aksi: string, modul: string, detail?: string) => {
    void doAudit({ data: { aksi, modul, detail } }).catch(() => {});
  }, [doAudit]);

  const addUser: AuthCtx["addUser"] = useCallback(async (u) => {
    await fnCreate({
      data: { nama: u.nama, jabatan: labelToJabatan(u.role), pin: u.pin },
    });
    await qc.invalidateQueries({ queryKey: ["pengurus", "list"] });
  }, [fnCreate, qc]);

  const updateUser: AuthCtx["updateUser"] = useCallback(async (id, patch) => {
    await fnUpdate({
      data: {
        id,
        nama: patch.nama,
        jabatan: patch.role ? labelToJabatan(patch.role) : undefined,
        aktif: patch.aktif,
      },
    });
    await qc.invalidateQueries({ queryKey: ["pengurus", "list"] });
  }, [fnUpdate, qc]);

  const removeUser: AuthCtx["removeUser"] = useCallback(async (id) => {
    await fnDelete({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["pengurus", "list"] });
  }, [fnDelete, qc]);

  const hasRole: AuthCtx["hasRole"] = (...roles) => !!user && roles.includes(user.role);

  const value = useMemo<AuthCtx>(() => ({
    user,
    sessionUser,
    loadingSession: sessionQ.isPending,
    users,
    audit: [],
    login, logout, addUser, updateUser, removeUser, logAction, hasRole, refresh,
  }), [user, sessionUser, sessionQ.isPending, users, login, logout, addUser, updateUser, removeUser, logAction, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}