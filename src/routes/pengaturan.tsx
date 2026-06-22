import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — SiRT 06 Digital" },
      { name: "description", content: "Konfigurasi sistem dan preferensi tampilan." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Pengaturan"
      description="Konfigurasi sistem dan preferensi tampilan."
      icon={Settings}
      features={["Tema terang/gelap","Profil pengurus","Notifikasi","Backup data"]}
    />
  ),
});
