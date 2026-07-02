import {
  LayoutDashboard, Users, FileText, Wallet, Boxes, ShieldCheck,
  ClipboardCheck, QrCode, Store, MessageSquareWarning, Siren,
  Newspaper, MessageCircle, Settings, Crown, Home, HeartHandshake,
  Hammer, Flag, Bike, CalendarCheck, BarChart3, FolderArchive,
} from "lucide-react";
import type { Role } from "@/lib/auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

const ALL: Role[] = [
  "Super Admin","Ketua RT","Sekretaris","Bendahara","Bendahara 1","Bendahara 2",
  "Humas","Keamanan 1","Keamanan 2","Sie Kematian","Sie Umum","Sie Perlengkapan",
  "Sie Keamanan","Sie Sosial","Sie Humas","Sie Pemuda","Sie Lingkungan","Admin","Warga",
];
const STAFF: Role[] = [
  "Humas","Keamanan 1","Keamanan 2","Sie Kematian","Sie Umum","Sie Perlengkapan",
  "Sie Keamanan","Sie Sosial","Sie Humas","Sie Pemuda","Sie Lingkungan","Admin",
];
const BENDAHARA: Role[] = ["Bendahara","Bendahara 1","Bendahara 2"];
const SEKRETARIS: Role[] = ["Sekretaris"];
const KETUA: Role[] = ["Ketua RT"];
const SUPER: Role[] = ["Super Admin"];

// Undefined roles = public (semua termasuk yang belum login).
// Roles yang diisi = whitelist role yang boleh melihat menu.
export const navItems: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/warga", label: "Data Warga", icon: Users,
    roles: [...SUPER, ...KETUA, ...SEKRETARIS, ...STAFF] },
  { to: "/warga", label: "Data KK", icon: Home,
    roles: [...SUPER, ...KETUA, ...SEKRETARIS] },
  { to: "/keuangan", label: "Kas RT", icon: Wallet,
    roles: [...SUPER, ...KETUA, ...BENDAHARA] },
  { to: "/keuangan", label: "Kas Sosial", icon: HeartHandshake,
    roles: [...SUPER, ...KETUA, ...BENDAHARA] },
  { to: "/keuangan", label: "Kas Perkakas", icon: Hammer,
    roles: [...SUPER, ...KETUA, ...BENDAHARA] },
  { to: "/keuangan", label: "Kas HUT RI", icon: Flag,
    roles: [...SUPER, ...KETUA, ...BENDAHARA] },
  { to: "/keuangan", label: "Kas Motor Tossa", icon: Bike,
    roles: [...SUPER, ...KETUA, ...BENDAHARA] },
  { to: "/administrasi", label: "Administrasi Surat", icon: FileText,
    roles: [...SUPER, ...KETUA, ...SEKRETARIS] },
  { to: "/absensi", label: "Agenda", icon: CalendarCheck,
    roles: [...SUPER, ...KETUA, ...SEKRETARIS] },
  { to: "/media", label: "Pengumuman", icon: Newspaper },
  { to: "/inventaris", label: "Inventaris", icon: Boxes,
    roles: [...SUPER, ...KETUA, ...STAFF] },
  { to: "/poskamling", label: "Poskamling", icon: ShieldCheck,
    roles: [...SUPER, ...KETUA, ...STAFF] },
  { to: "/qr-center", label: "QR Center", icon: QrCode,
    roles: [...SUPER, ...KETUA] },
  { to: "/emergency", label: "Emergency Center", icon: Siren },
  { to: "/keuangan", label: "Laporan", icon: BarChart3,
    roles: [...SUPER, ...KETUA, ...BENDAHARA] },
  { to: "/administrasi", label: "Dokumen", icon: FolderArchive,
    roles: [...SUPER, ...KETUA, ...SEKRETARIS] },
  { to: "/whatsapp", label: "WhatsApp Center", icon: MessageCircle,
    roles: [...SUPER, ...KETUA] },
  { to: "/umkm", label: "UMKM Warga", icon: Store },
  { to: "/kritik-saran", label: "Kritik & Saran", icon: MessageSquareWarning },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings, roles: SUPER },
  { to: "/super-admin", label: "Super Admin", icon: Crown, roles: SUPER },
];

void ALL;