/**
 * One-off: register the File Management dashboard and grant it to Quintus only.
 * Idempotent — safe to re-run.
 *
 * Usage: npx tsx scripts/register-file-management.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false }, db: { schema: "portal" } });

async function main() {
  const dashboard = {
    slug: "file-management",
    name: "File Management",
    description: "Browse company files stored in Cloudflare R2, by area",
    upstream_url: "/file-management",
    icon: "F",
    sort_order: 1,
    category: "Other",
    category_order: 999,
    open_in_new_tab: false,
  };

  const { data: existing } = await sb.from("dashboards").select("id").eq("slug", dashboard.slug).maybeSingle();
  let dashboardId: string;
  if (existing) {
    console.log(`dashboard '${dashboard.slug}' already exists — updating`);
    const { error } = await sb.from("dashboards").update(dashboard).eq("id", existing.id);
    if (error) throw error;
    dashboardId = existing.id;
  } else {
    const { data, error } = await sb.from("dashboards").insert(dashboard).select("id").single();
    if (error) throw error;
    dashboardId = data.id;
    console.log(`dashboard '${dashboard.slug}' created`);
  }

  const { data: quintus, error: qErr } = await sb.from("users").select("id").eq("username", "quintus").single();
  if (qErr || !quintus) throw qErr ?? new Error("quintus user not found");

  const { error: grantErr } = await sb
    .from("user_dashboards")
    .upsert({ user_id: quintus.id, dashboard_id: dashboardId }, { onConflict: "user_id,dashboard_id" });
  if (grantErr) throw grantErr;

  console.log(`granted 'file-management' to quintus (user_id=${quintus.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
