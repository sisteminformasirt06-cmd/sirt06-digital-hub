import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/kas-tossa")({
  head: () => ({ meta: [{ title: "Kas Motor Tossa — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Kas Motor Tossa" description="Detail transaksi Kas Motor Tossa." />,
});
