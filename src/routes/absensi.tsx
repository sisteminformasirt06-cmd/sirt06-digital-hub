import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/absensi")({
  head: () => ({
    meta: [
      { title: "Absensi — SiRT 06 Digital" },
      { name: "description", content: "Absensi rapat dan kegiatan warga." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Absensi"
      description="Absensi rapat dan kegiatan warga."
      icon={ClipboardCheck}
      features={["Absensi rapat","Kegiatan warga","QR check-in","Rekap kehadiran"]}
    />
  ),
});
