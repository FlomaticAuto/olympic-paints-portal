import { requireFreshPassword } from "@/lib/auth";
import Topbar from "@/app/_components/Topbar";
import CustomerTrends from "./CustomerTrends";

export const dynamic = "force-dynamic";

export default async function CustomerTrendsPage() {
  const s = await requireFreshPassword();
  return (
    <>
      <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />
      <CustomerTrends />
    </>
  );
}
