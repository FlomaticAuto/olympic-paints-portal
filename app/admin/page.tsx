import { supabase } from "@/lib/supabase";
import type { Dashboard, User } from "@/lib/types";
import PermissionsMatrix from "./PermissionsMatrix";

export const dynamic = "force-dynamic";

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;

  const [usersRes, dashRes, gridRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, full_name, is_admin, is_active")
      .order("is_admin", { ascending: false })
      .order("full_name"),
    supabase
      .from("dashboards")
      .select("id, slug, name, sort_order, is_active")
      .order("sort_order"),
    supabase.from("user_dashboards").select("user_id, dashboard_id"),
  ]);

  const users = (usersRes.data ?? []) as Pick<
    User,
    "id" | "username" | "full_name" | "is_admin" | "is_active"
  >[];
  const dashboards = (dashRes.data ?? []) as Pick<
    Dashboard,
    "id" | "slug" | "name" | "sort_order" | "is_active"
  >[];

  const initialGrants = new Set<string>(
    (gridRes.data ?? []).map((r) => `${r.user_id}|${r.dashboard_id}`),
  );

  return (
    <>
      {sp.saved && <div className="notice">Permissions saved.</div>}
      <PermissionsMatrix
        users={users}
        dashboards={dashboards}
        initialGrants={Array.from(initialGrants)}
      />
    </>
  );
}
