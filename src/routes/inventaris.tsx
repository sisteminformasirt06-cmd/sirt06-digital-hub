import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/inventaris")({
  head: () => ({
    meta: [
      { title: "Inventaris — SiRT 06 Digital" },
      { name: "description", content: "Daftar dan peminjaman aset RT." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Inventaris"
      description="Daftar dan peminjaman aset RT."
      icon={Boxes}
      features={["Daftar barang","Peminjaman aset","Riwayat perawatan","Stok kondisi"]}
    />
  ),
});
