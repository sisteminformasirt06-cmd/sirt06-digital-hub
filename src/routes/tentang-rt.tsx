import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";

export const Route = createFileRoute("/tentang-rt")({
  head: () => ({ meta: [{ title: "Tentang RT — SiRT 06 Digital" }] }),
  component: TentangRT,
});

function TentangRT() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl gradient-primary text-primary-foreground grid place-items-center shadow-glow">
            <Info className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold">Tentang RT 06 / RW 07</h1>
            <p className="text-xs text-muted-foreground">Bogeman Wetan</p>
          </div>
        </div>
        <div className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>SiRT 06 Digital adalah platform digitalisasi dan transparansi warga RT 06 / RW 07 Bogeman Wetan.</p>
          <p>Profil kepengurusan, wilayah, sejarah, dan visi-misi RT akan diisi oleh pengurus.</p>
        </div>
      </div>
      <div className="glass rounded-2xl p-4 text-sm text-muted-foreground text-center">Belum ada data.</div>
    </div>
  );
}