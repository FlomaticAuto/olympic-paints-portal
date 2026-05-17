import { requireFreshPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Dashboard } from "@/lib/types";
import Topbar from "./_components/Topbar";

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

  // Group by category, preserving the order returned by the query.
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
      {dashboards.length === 0 ? (
        <div className="empty">
          <h2>No dashboards assigned yet</h2>
          <p>
            You're signed in, but no reports have been shared with you yet. Ask
            Quintus to grant you access.
          </p>
        </div>
      ) : (
        <div className="catalog">
          {groups.map((g) => (
            <section key={g.category} className="category-section">
              <h2 className="category-heading">
                <span className="category-rule" aria-hidden="true" />
                <span className="category-label">{g.category}</span>
                <span className="category-count">{g.items.length}</span>
              </h2>
              <div className="tiles">
                {g.items.map((d) => (
                  <a key={d.id} href={`/d/${d.slug}`} className="tile">
                    <div className="icon">{d.icon ?? d.name.charAt(0)}</div>
                    <h3>{d.name}</h3>
                    <p>{d.description}</p>
                    <div className="cta">Open →</div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
