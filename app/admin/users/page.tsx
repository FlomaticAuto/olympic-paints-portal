import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";
import UsersAdmin from "./UsersAdmin";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; tmp?: string; reset?: string }>;
}) {
  const sp = await searchParams;

  const { data } = await supabase
    .from("users")
    .select("id, username, full_name, email, is_admin, must_change_pw, is_active, last_login_at, created_at")
    .order("is_admin", { ascending: false })
    .order("full_name");

  const users = (data ?? []) as User[];

  return (
    <>
      {sp.created && sp.tmp && (
        <div className="notice">
          User <strong>{sp.created}</strong> created. Temporary password:{" "}
          <code style={{ background: "var(--color-surface-sunken)", padding: "2px 6px", borderRadius: 4 }}>
            {sp.tmp}
          </code>{" "}
          — share it once; they'll be forced to change it on first login.
        </div>
      )}
      {sp.reset && sp.tmp && (
        <div className="notice">
          Password reset for <strong>{sp.reset}</strong>. New temporary password:{" "}
          <code style={{ background: "var(--color-surface-sunken)", padding: "2px 6px", borderRadius: 4 }}>
            {sp.tmp}
          </code>
        </div>
      )}
      <UsersAdmin users={users} />
    </>
  );
}
