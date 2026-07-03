import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/supabase-panel")({
  head: () => ({ meta: [{ title: "Panel Cloud — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Panel Cloud" description="Panel monitoring backend Cloud." />,
});
