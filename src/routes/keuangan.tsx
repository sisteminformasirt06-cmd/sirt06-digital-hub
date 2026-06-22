import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/keuangan")({
  head: () => ({
    meta: [
      { title: "Keuangan — SiRT 06 Digital" },
      { name: "description", content: "Transparansi kas RT dan laporan keuangan bulanan." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Keuangan"
      description="Transparansi kas RT dan laporan keuangan bulanan."
      icon={Wallet}
      features={["Catatan kas masuk/keluar","Laporan bulanan","Iuran warga","Grafik keuangan"]}
    />
  ),
});
