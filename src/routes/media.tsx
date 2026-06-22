import { createFileRoute } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/media")({
  head: () => ({
    meta: [
      { title: "Media Center — SiRT 06 Digital" },
      { name: "description", content: "Galeri foto dan dokumentasi kegiatan RT." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Media Center"
      description="Galeri foto dan dokumentasi kegiatan RT."
      icon={Newspaper}
      features={["Galeri foto","Video kegiatan","Berita warga","Arsip dokumentasi"]}
    />
  ),
});
