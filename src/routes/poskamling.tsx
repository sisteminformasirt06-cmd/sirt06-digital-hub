import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/poskamling")({
  head: () => ({
    meta: [
      { title: "Poskamling — SiRT 06 Digital" },
      { name: "description", content: "Jadwal dan laporan ronda malam." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Poskamling"
      description="Jadwal dan laporan ronda malam."
      icon={ShieldCheck}
      features={["Jadwal ronda","Laporan kejadian","Absensi petugas","Notifikasi tugas"]}
    />
  ),
});
