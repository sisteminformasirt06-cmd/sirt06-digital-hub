import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/administrasi")({
  head: () => ({
    meta: [
      { title: "Administrasi — SiRT 06 Digital" },
      { name: "description", content: "Pengajuan dan riwayat surat-menyurat warga." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Administrasi"
      description="Pengajuan dan riwayat surat-menyurat warga."
      icon={FileText}
      features={["Surat pengantar","Surat domisili","Riwayat pengajuan","Tanda tangan digital"]}
    />
  ),
});
