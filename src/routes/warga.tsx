import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/warga")({
  head: () => ({
    meta: [
      { title: "Data Warga — SiRT 06 Digital" },
      { name: "description", content: "Kelola data warga RT 06 secara digital dan terpusat." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Data Warga"
      description="Kelola data warga RT 06 secara digital dan terpusat."
      icon={Users}
      features={["Profil lengkap warga","Filter per RW/RT","Export data Excel","Statistik demografi"]}
    />
  ),
});
