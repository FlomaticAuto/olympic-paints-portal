import { requireFreshPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Dashboard } from "@/lib/types";
import Topbar from "./_components/Topbar";
import ReportCatalog from "./_components/ReportCatalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await requireFreshPassword();

  const { data, error } = await supabase
    .from("dashboards")
    .select(
      `id, slug, name, description, icon, sort_order, is_active, category, category_order,
       user_dashboards!inner(user_id)`,
    )
    .eq("is_active", true)
    .eq("user_dashboards.user_id", s.userId!)
    .order("category_order", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <>
        <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />
        <div className="empty">
          <h2>Something went wrong loading your dashboards.</h2>
          <p>{error.message}</p>
        </div>
      </>
    );
  }

  const dashboards = (data ?? []) as unknown as Dashboard[];

  const groups: { category: string; items: Dashboard[] }[] = [];
  const seen = new Map<string, number>();
  for (const d of dashboards) {
    const cat = d.category ?? "Other";
    if (!seen.has(cat)) {
      seen.set(cat, groups.length);
      groups.push({ category: cat, items: [] });
    }
    groups[seen.get(cat)!].items.push(d);
  }

  return (
    <>
      <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />

      <section className="report-hero">
        <div className="report-hero-inner">
          <div className="report-hero-brand">
            <div className="report-hero-logo">
              <img src="/logo.jpg" alt="Olympic Paints" width={56} height={56} />
            </div>
            <div className="report-hero-text">
              <h1>Reports Portal</h1>
              <p>All live dashboards and reports</p>
            </div>
          </div>
          <div className="report-hero-meta">
            <div>Olympic Paints · Limpopo, SA</div>
            <div className="muted">Powered by FlomaticAuto</div>
          </div>
        </div>
      </section>

      {dashboards.length === 0 ? (
        <div className="empty">
          <h2>No dashboards assigned yet</h2>
          <p>
            You're signed in, but no reports have been shared with you yet. Ask
            Quintus to grant you access.
          </p>
        </div>
      ) : (
        <ReportCatalog groups={groups} />
      )}
    </>
  );
}
