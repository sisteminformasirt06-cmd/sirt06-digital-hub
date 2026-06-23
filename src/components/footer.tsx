import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-rt.png";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-border/60 bg-card/40 backdrop-blur-md">
      <div className="px-3 sm:px-5 py-6 max-w-7xl mx-auto grid gap-4 sm:grid-cols-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-3">
          <img src={logo} alt="Logo RT 06" className="h-10 w-10 rounded-full shrink-0" />
          <div>
            <div className="text-sm font-bold text-foreground">SiRT 06 Digital</div>
            <div>RT 06 / RW 07 Bogeman Wetan</div>
            <div className="mt-1">Digitalisasi & Transparansi Warga</div>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground mb-1.5">Modul Inti</div>
          <ul className="space-y-1">
            <li><Link to="/warga" className="hover:text-primary">Data Warga</Link></li>
            <li><Link to="/keuangan" className="hover:text-primary">Keuangan</Link></li>
            <li><Link to="/inventaris" className="hover:text-primary">Inventaris</Link></li>
            <li><Link to="/emergency" className="hover:text-primary">Emergency Center</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground mb-1.5">Sistem</div>
          <ul className="space-y-1">
            <li><Link to="/login" className="hover:text-primary">Login Pengurus</Link></li>
            <li><Link to="/pengaturan" className="hover:text-primary">Pengaturan</Link></li>
            <li>Versi 1.0.0 • Build 2026</li>
            <li>© {new Date().getFullYear()} RT 06 / RW 07</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}