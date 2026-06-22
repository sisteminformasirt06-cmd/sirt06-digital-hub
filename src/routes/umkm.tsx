import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/umkm")({
  head: () => ({
    meta: [
      { title: "UMKM Warga — SiRT 06 Digital" },
      { name: "description", content: "Direktori usaha mikro warga RT 06." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="UMKM Warga"
      description="Direktori usaha mikro warga RT 06."
      icon={Store}
      features={["Direktori UMKM","Kontak & lokasi","Promosi produk","Rating warga"]}
    />
  ),
});
