import { requireFreshPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Dashboard } from "@/lib/types";
import Topbar from "./_components/Topbar";

export const dynamic = "force-dynamic";

const CATEGORY_ICON: Record<string, string> = {
  "Sales Reports": "📊",
  "Sales Rep KPIs": "🎯",
  PULSE: "⚡",
  "Merchandising & Product": "🛒",
  "E-Commerce": "🛍️",
  "HR & Operations": "👥",
  "Strategic Intelligence": "🧠",
};

const SLUG_ICON: Record<string, string> = {
  sales: "📊",
  "store-health": "❤️",
  velocity: "🚀",
  "fallen-off": "📉",
  "geo-map": "🗺️",
  "kpi-ac": "🅰️",
  "kpi-ap": "🅰️",
  "kpi-bv": "🅱️",
  "kpi-np": "🅽",
  "kpi-bm": "🅱️",
  "pulse-leaderboard": "🏆",
  "pulse-scorecard": "📋",
  merchandising: "🛒",
  "product-dev": "🧪",
  ecommerce: "🛍️",
  clocking: "⏰",
  "health-safety": "🦺",
  vehicles: "🚚",
  "workspace-health": "💚",
  "cso-insights": "🧠",
};

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

  const firstName = s.fullName?.split(" ")[0] ?? "there";

  return (
    <>
      <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />

      <section className="portal-hero">
        <div className="hero-logo">
          <img src="/logo.jpg" alt="Olympic Paints" width={72} height={72} />
        </div>
        <div className="eyebrow">Olympic Paints</div>
        <h1>Staff Portal</h1>
        <p className="welcome">
          Welcome, {firstName}. Pick a report below — your dashboards are grouped
          by topic.
        </p>
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
        <div className="catalog">
          {groups.map((g) => (
            <section key={g.category} className="category-section">
              <h2 className="category-heading">
                <span className="category-rule" aria-hidden="true" />
                <span className="category-icon" aria-hidden="true">
                  {CATEGORY_ICON[g.category] ?? "📁"}
                </span>
                <span className="category-label">{g.category}</span>
                <span className="category-count">{g.items.length}</span>
              </h2>
              <div className="portal-tiles">
                {g.items.map((d) => {
                  const icon = SLUG_ICON[d.slug] ?? d.icon ?? d.name.charAt(0);
                  return (
                    <a key={d.id} href={`/d/${d.slug}`} className="portal-tile">
                      <div className="portal-tile-icon">{icon}</div>
                      <h3>{d.name}</h3>
                      <p>{d.description}</p>
                      <span className="portal-tile-cta">Open</span>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
