import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — SiRT 06 Digital" },
      { name: "description", content: "Agenda kegiatan RT 06." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Agenda"
      description="Modul sedang dikembangkan."
      icon={CalendarDays}
      features={["Belum ada data."]}
    />
  ),
});