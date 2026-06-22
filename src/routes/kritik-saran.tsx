import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareWarning } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/kritik-saran")({
  head: () => ({
    meta: [
      { title: "Kritik & Saran — SiRT 06 Digital" },
      { name: "description", content: "Sampaikan masukan untuk perbaikan lingkungan." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Kritik & Saran"
      description="Sampaikan masukan untuk perbaikan lingkungan."
      icon={MessageSquareWarning}
      features={["Form anonim","Status tindak lanjut","Kategori masukan","Riwayat respons"]}
    />
  ),
});
