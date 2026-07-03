import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowLeft } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-strong rounded-3xl p-6 sm:p-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" /> {title}
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold">Modul sedang dalam pengembangan</h1>
        <p className="text-sm text-muted-foreground">
          {description ?? "Fitur ini akan segera hadir. Terima kasih atas kesabarannya."}
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-glow"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
