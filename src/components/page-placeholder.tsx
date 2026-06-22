import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export function PagePlaceholder({
  title, description, icon: Icon, features,
}: {
  title: string; description: string; icon: LucideIcon; features?: string[];
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="glass-strong rounded-3xl p-5 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full gradient-primary opacity-20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl gradient-primary text-primary-foreground grid place-items-center shadow-glow shrink-0">
            <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold">Modul SiRT 06</div>
            <h1 className="text-xl sm:text-3xl font-extrabold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-5 sm:p-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Modul akan segera tersedia
        </div>
        <h2 className="mt-4 text-lg sm:text-xl font-bold">Sedang dalam pengembangan</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Modul <span className="font-semibold text-foreground">{title}</span> akan menyediakan fitur lengkap untuk warga RT 06.
        </p>

        {features && features.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {features.map((f) => (
              <div key={f} className="glass rounded-xl p-3 flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-lg gradient-primary text-primary-foreground grid place-items-center text-[10px] font-bold shrink-0">✓</div>
                <div className="text-sm">{f}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}