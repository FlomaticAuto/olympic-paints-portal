import { requireFreshPassword } from "@/lib/auth";
import Topbar from "@/app/_components/Topbar";
import RepStoreVisit from "./RepStoreVisit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rep Store Visit — Olympic Paints",
};

export default async function RepStoreVisitPage() {
  const s = await requireFreshPassword();

  return (
    <>
      <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />
      <RepStoreVisit defaultRep={s.fullName ?? ""} />
    </>
  );
}
