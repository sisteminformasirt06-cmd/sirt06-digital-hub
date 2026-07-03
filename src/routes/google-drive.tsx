import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/google-drive")({
  head: () => ({ meta: [{ title: "Google Drive — SiRT 06 Digital" }] }),
  component: () => <ComingSoon title="Google Drive" description="Integrasi backup ke Google Drive." />,
});
