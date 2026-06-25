import {
  LayoutDashboard, Users, FileText, Wallet, Boxes, ShieldCheck,
  ClipboardCheck, QrCode, Store, MessageSquareWarning, Siren,
  Newspaper, MessageCircle, Settings,
} from "lucide-react";

export const navItems = [
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
] as const;