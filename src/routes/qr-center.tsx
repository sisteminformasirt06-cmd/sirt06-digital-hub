import { createFileRoute } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/qr-center")({
  head: () => ({
    meta: [
      { title: "QR Center — SiRT 06 Digital" },
      { name: "description", content: "Pusat kode QR untuk berbagai keperluan RT." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="QR Center"
      description="Pusat kode QR untuk berbagai keperluan RT."
      icon={QrCode}
      features={["QR absensi","QR profil warga","QR pembayaran iuran","QR tamu Poskamling"]}
    />
  ),
});
