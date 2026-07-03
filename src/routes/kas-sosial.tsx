import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/kas-sosial")({
  head: () => ({ meta: [{ title: "Kas Sosial — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Kas Sosial" description="Detail transaksi Kas Sosial." />,
});
