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
      `id, slug, name, description, icon, sort_order, is_active,
       user_dashboards!inner(user_id)`,
    )
    .eq("is_active", true)
    .eq("user_dashboards.user_id", s.userId!)
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
        <div className="tiles">
          {dashboards.map((d) => (
            <a key={d.id} href={`/d/${d.slug}`} className="tile">
              <div className="icon">{d.icon ?? d.name.charAt(0)}</div>
              <h2>{d.name}</h2>
              <p>{d.description}</p>
              <div className="cta">Open →</div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
