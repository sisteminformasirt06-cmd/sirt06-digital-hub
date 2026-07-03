import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/kas-perkakas")({
  head: () => ({ meta: [{ title: "Kas Perkakas — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Kas Perkakas" description="Detail transaksi Kas Perkakas." />,
});
