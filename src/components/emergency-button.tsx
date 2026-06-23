import { useState } from "react";
import { Phone, Siren, X, Shield, Flame, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const contacts = [
  { label: "Ketua RT", num: "081234567890", icon: Shield, tone: "from-blue-500 to-indigo-500" },
  { label: "Poskamling", num: "081234567891", icon: Siren, tone: "from-amber-500 to-orange-500" },
  { label: "Pemadam", num: "113", icon: Flame, tone: "from-red-500 to-rose-600" },
  { label: "Ambulans", num: "118", icon: Heart, tone: "from-pink-500 to-rose-500" },
  { label: "Polisi", num: "110", icon: Shield, tone: "from-sky-500 to-blue-600" },
];

export function FloatingEmergencyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-strong rounded-3xl p-5 border border-red-500/30 shadow-2xl"
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
            <div className="space-y-2">
              {contacts.map((c) => {
                const Icon = c.icon;
                return (
                  <a
                    key={c.label}
                    href={`tel:${c.num}`}
                    className="flex items-center gap-3 p-3 rounded-2xl glass hover:bg-accent transition"
                  >
                    <div className={cn("h-10 w-10 rounded-xl grid place-items-center text-white bg-gradient-to-br", c.tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{c.label}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">{c.num}</div>
                    </div>
                    <Phone className="h-4 w-4 text-primary" />
                  </a>
                );
              })}
            </div>
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