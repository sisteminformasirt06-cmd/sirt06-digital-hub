import {
  LayoutDashboard, Users, FileText, Wallet, Boxes, ShieldCheck,
  ClipboardCheck, QrCode, Store, MessageSquareWarning, Siren,
  Newspaper, MessageCircle, Settings, Crown,
} from "lucide-react";
import type { Role } from "@/lib/auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

export const navItems: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/warga", label: "Data Warga", icon: Users },
  { to: "/administrasi", label: "Administrasi", icon: FileText },
  { to: "/keuangan", label: "Keuangan", icon: Wallet },
  { to: "/inventaris", label: "Inventaris", icon: Boxes },
  { to: "/poskamling", label: "Poskamling", icon: ShieldCheck },
  { to: "/absensi", label: "Absensi", icon: ClipboardCheck },
  { to: "/qr-center", label: "QR Center", icon: QrCode },
  { to: "/umkm", label: "UMKM Warga", icon: Store },
  { to: "/kritik-saran", label: "Kritik & Saran", icon: MessageSquareWarning },
  { to: "/emergency", label: "Emergency Center", icon: Siren },
  { to: "/media", label: "Pengumuman", icon: Newspaper },
  { to: "/whatsapp", label: "WhatsApp Center", icon: MessageCircle },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
  { to: "/super-admin", label: "Super Admin", icon: Crown, roles: ["Super Admin"] },
];