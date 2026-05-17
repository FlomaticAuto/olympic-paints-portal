import { headers } from "next/headers";
import { supabase } from "./supabase";

type Event = "login" | "login_failed" | "logout" | "view" | "password_change";

export async function logAccess(opts: {
  event: Event;
  userId?: string | null;
  username?: string | null;
  dashboardSlug?: string | null;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = h.get("user-agent") ?? null;

  await supabase.from("access_log").insert({
    event: opts.event,
    user_id: opts.userId ?? null,
    username: opts.username ?? null,
    dashboard_slug: opts.dashboardSlug ?? null,
    ip,
    user_agent: ua,
  });
}
