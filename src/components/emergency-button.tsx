import { useState } from "react";
import { Phone, Siren, X, Shield, Flame, Heart, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("damkar") || l.includes("pemadam")) return Flame;
  if (l.includes("pmi") || l.includes("psc") || l.includes("ambulan")) return Heart;
  if (l.includes("pol")) return Shield;
  if (l.includes("keamanan") || l.includes("linmas")) return Siren;
  if (l.includes("ketua") || l.includes("sek") || l.includes("bend") || l.includes("humas")) return Shield;
  return Building2;
}

export function FloatingEmergencyButton() {
  const [open, setOpen] = useState(false);
  const { emergency } = useSettings();
  const contacts = emergency.filter((e) => e.nomor.trim());
  const internal = contacts.filter((e) => e.kategori === "Internal");
  const instansi = contacts.filter((e) => e.kategori === "Instansi");

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-strong rounded-3xl p-5 border border-red-500/30 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 grid place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-glow">
                  <Siren className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-bold">Emergency Center</div>
                  <div className="text-[11px] text-muted-foreground">Hubungi kontak darurat</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="h-9 w-9 grid place-items-center rounded-xl hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
                <div className="text-sm font-semibold">Belum ada nomor darurat</div>
                <p className="text-[11px] text-muted-foreground mt-1">Tambahkan kontak di menu Pengaturan → Emergency.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {internal.length > 0 && <Group title="Pengurus RT" tone="from-blue-500 to-indigo-500" items={internal} />}
                {instansi.length > 0 && <Group title="Instansi" tone="from-red-500 to-rose-600" items={instansi} />}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        aria-label="Emergency Center"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 z-40 h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_10px_30px_-5px_rgba(244,63,94,0.6)] grid place-items-center animate-pulse-ring"
      >
        <Siren className="h-6 w-6" />
        <span className="sr-only">Emergency</span>
      </button>
    </>
  );
}

function Group({ title, tone, items }: { title: string; tone: string; items: { id: string; label: string; nomor: string }[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">{title}</div>
      <div className="space-y-2">
        {items.map((c) => {
          const Icon = iconFor(c.label);
          return (
            <a
              key={c.id}
              href={`tel:${c.nomor}`}
              className="flex items-center gap-3 p-3 rounded-2xl glass hover:bg-accent transition"
            >
              <div className={cn("h-10 w-10 rounded-xl grid place-items-center text-white bg-gradient-to-br", tone)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.label}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">{c.nomor}</div>
              </div>
              <Phone className="h-4 w-4 text-primary" />
            </a>
          );
        })}
      </div>
    </div>
  );
}