import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/laporan")({
  head: () => ({ meta: [{ title: "Laporan Keuangan — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Laporan Keuangan" description="Laporan bulanan / tahunan kas RT dan sub-kas." />,
});
