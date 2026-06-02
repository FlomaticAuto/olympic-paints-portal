/**
 * One-shot: update the store-visit-booking dashboard row to point to the
 * new Supabase-backed form instead of JotForm.
 *
 * Usage:
 *   cp .env.example .env.local && fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   npx tsx scripts/update-store-visit-url.ts
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

const sb = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: "portal" },
});

async function main() {
  // Find any dashboard row whose upstream_url points to the old JotForm
  const { data: rows, error: fetchErr } = await sb
    .from("dashboards")
    .select("id, slug, name, upstream_url")
    .ilike("upstream_url", "%jotform.com%260431710573046%");

  if (fetchErr) { console.error("Fetch error:", fetchErr.message); process.exit(1); }

  if (!rows || rows.length === 0) {
    // Also try matching by slug or name
    const { data: byName } = await sb
      .from("dashboards")
      .select("id, slug, name, upstream_url")
      .or("slug.ilike.%store-visit%,name.ilike.%store visit%,name.ilike.%booking%");

    console.log("No JotForm store-visit row found by URL. Candidates by name/slug:");
    console.log(byName);
    process.exit(0);
  }

  for (const row of rows) {
    console.log(`Updating: [${row.id}] ${row.name} (${row.slug})`);
    console.log(`  old URL: ${row.upstream_url}`);
    const newUrl = "https://olympic-paints-forms-admin.vercel.app/store-visit-booking";
    const { error: updateErr } = await sb
      .from("dashboards")
      .update({ upstream_url: newUrl })
      .eq("id", row.id);
    if (updateErr) console.error("  Update FAILED:", updateErr.message);
    else console.log(`  new URL: ${newUrl}  ✓`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
