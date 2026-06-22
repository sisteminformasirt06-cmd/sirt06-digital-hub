import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp Center — SiRT 06 Digital" },
      { name: "description", content: "Integrasi pesan WhatsApp untuk pengumuman." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="WhatsApp Center"
      description="Integrasi pesan WhatsApp untuk pengumuman."
      icon={MessageCircle}
      features={["Broadcast pengumuman","Template pesan","Grup warga","Riwayat kirim"]}
    />
  ),
});
