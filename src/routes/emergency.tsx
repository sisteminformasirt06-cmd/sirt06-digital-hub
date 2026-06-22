import { createFileRoute } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Center — SiRT 06 Digital" },
      { name: "description", content: "Pusat informasi darurat dan kontak penting." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Emergency Center"
      description="Pusat informasi darurat dan kontak penting."
      icon={Siren}
      features={["Tombol darurat","Kontak Damkar/Polisi","Lokasi siaga","Notifikasi cepat"]}
    />
  ),
});
