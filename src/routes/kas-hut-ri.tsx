import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/kas-hut-ri")({
  head: () => ({ meta: [{ title: "Kas HUT RI — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Kas HUT RI" description="Detail transaksi Kas HUT RI." />,
});
