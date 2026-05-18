import { requireAdmin } from "@/lib/auth";
import CompetitorIntelligenceDashboard from "./CompetitorIntelligenceDashboard";
import Topbar from "@/app/_components/Topbar";

export const dynamic = "force-dynamic";

export default async function CompetitorIntelligencePage() {
  const s = await requireAdmin();
  return (
    <>
      <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />
      <CompetitorIntelligenceDashboard />
    </>
  );
}
