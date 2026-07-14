import { requireAdmin } from "@/lib/auth";
import Topbar from "@/app/_components/Topbar";
import FileManagementBrowser from "./FileManagementBrowser";

export const dynamic = "force-dynamic";

// Admin-only (Quintus, currently the sole admin) — browses the R2 bucket
// that also holds rep weekly/monthly KPI reports (olympic-paints-rep-reports),
// under top-level area-name prefixes (Sales/, Operations/, Colour Cafe/, etc).
export default async function FileManagementPage() {
  const s = await requireAdmin();
  return (
    <>
      <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />
      <FileManagementBrowser />
    </>
  );
}
