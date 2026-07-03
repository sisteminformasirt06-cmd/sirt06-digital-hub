import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/kas-rt")({
  head: () => ({ meta: [{ title: "Kas RT — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Kas RT" description="Detail transaksi Kas RT." />,
});
