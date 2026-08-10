import {
  LayoutDashboard, Users, FileText, Wallet, Boxes, ShieldCheck,
  ClipboardCheck, QrCode, Store, MessageSquareWarning, Siren,
  Newspaper, MessageCircle, Settings, CalendarDays, Info,
  KeyRound, Database, HardDrive, History, Cloud, ScrollText,
  PiggyBank, Banknote, Wrench, Bike, Flag,
} from "lucide-react";
import type { Role } from "@/lib/auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const WARGA: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/media", label: "Pengumuman", icon: Newspaper },
  { to: "/umkm", label: "UMKM Warga", icon: Store },
  { to: "/emergency", label: "Emergency Center", icon: Siren },
  { to: "/qr-center", label: "QR Center", icon: QrCode },
  { to: "/kritik-saran", label: "Kritik & Saran", icon: MessageSquareWarning },
  { to: "/tentang-rt", label: "Tentang RT", icon: Info },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
];

const ADMIN: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/warga", label: "Data Warga", icon: Users },
  { to: "/administrasi", label: "Administrasi", icon: FileText },
  { to: "/keuangan", label: "Keuangan", icon: Wallet },
  { to: "/inventaris", label: "Inventaris", icon: Boxes },
  { to: "/poskamling", label: "Poskamling", icon: ShieldCheck },
  { to: "/absensi", label: "Absensi", icon: ClipboardCheck },
  { to: "/qr-center", label: "QR Center", icon: QrCode },
  { to: "/emergency", label: "Emergency Center", icon: Siren },
  { to: "/umkm", label: "UMKM", icon: Store },
  { to: "/whatsapp", label: "WhatsApp Center", icon: MessageCircle },
  { to: "/media", label: "Pengumuman", icon: Newspaper },
  { to: "/kritik-saran", label: "Kritik & Saran", icon: MessageSquareWarning },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
];

const BENDAHARA: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/keuangan", label: "Keuangan", icon: Wallet },
  { to: "/kas-rt", label: "Kas RT", icon: PiggyBank },
  { to: "/kas-sosial", label: "Kas Sosial", icon: Banknote },
  { to: "/kas-perkakas", label: "Kas Perkakas", icon: Wrench },
  { to: "/kas-tossa", label: "Kas Motor Tossa", icon: Bike },
  { to: "/kas-hut-ri", label: "Kas HUT RI", icon: Flag },
  { to: "/laporan", label: "Laporan", icon: ScrollText },
  { to: "/qr-center", label: "QR Center", icon: QrCode },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
];

const SUPER: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/warga", label: "Data Warga", icon: Users },
  { to: "/administrasi", label: "Administrasi", icon: FileText },
  { to: "/keuangan", label: "Keuangan", icon: Wallet },
  { to: "/inventaris", label: "Inventaris", icon: Boxes },
  { to: "/poskamling", label: "Poskamling", icon: ShieldCheck },
  { to: "/absensi", label: "Absensi", icon: ClipboardCheck },
  { to: "/qr-center", label: "QR Center", icon: QrCode },
  { to: "/emergency", label: "Emergency Center", icon: Siren },
  { to: "/umkm", label: "UMKM", icon: Store },
  { to: "/whatsapp", label: "WhatsApp Center", icon: MessageCircle },
  { to: "/media", label: "Pengumuman", icon: Newspaper },
  { to: "/kritik-saran", label: "Kritik & Saran", icon: MessageSquareWarning },
  { to: "/google-drive", label: "Google Drive", icon: HardDrive },
  { to: "/supabase-panel", label: "Supabase", icon: Cloud },
  { to: "/manajemen-pin", label: "Manajemen PIN", icon: KeyRound },
  { to: "/role-permission", label: "Role & Permission", icon: ShieldCheck },
  { to: "/audit-log", label: "Audit Log", icon: History },
  { to: "/backup-restore", label: "Backup & Restore", icon: Database },
  { to: "/pengaturan", label: "Pengaturan Sistem", icon: Settings },
];

export function navFor(role?: Role | null): NavItem[] {
  switch (role) {
    case "Super Admin": return SUPER;
    case "Admin": return ADMIN;
    case "Bendahara": return BENDAHARA;
    case "Warga": return WARGA;
    default: return WARGA;
  }
}

// Backwards-compat: some code imports navItems directly.
export const navItems: readonly NavItem[] = WARGA;
// ---- Kontrol akses per rute (guard di AppShell) ----
export type Access = "public" | "pengurus" | "super";

const SUPER_ONLY = [
  "/super-admin", "/manajemen-pin", "/role-permission", "/audit-log",
  "/backup-restore", "/supabase-panel", "/google-drive",
];

const PENGURUS_ONLY = [
  "/warga", "/administrasi", "/keuangan", "/kas-rt", "/kas-sosial",
  "/kas-perkakas", "/kas-tossa", "/kas-hut-ri", "/laporan",
  "/inventaris", "/poskamling", "/absensi", "/whatsapp",
];

export function accessFor(pathname: string): Access {
  if (SUPER_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "super";
  if (PENGURUS_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "pengurus";
  return "public";
}

export function canAccess(access: Access, role?: Role | null): boolean {
  if (access === "public") return true;
  if (!role) return false;
  if (access === "super") return role === "Super Admin";
  return role !== "Warga";
}
