import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// One-shot: migrate store-visit-booking from JotForm → Supabase form.
// Admin-only. Delete this route after running once.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find by old JotForm URL
  const { data: byUrl } = await supabase
    .from("dashboards")
    .select("id, slug, name, upstream_url")
    .ilike("upstream_url", "%260431710573046%");

  // Also find by slug/name in case URL already changed
  const { data: bySlug } = await supabase
    .from("dashboards")
    .select("id, slug, name, upstream_url")
    .or("slug.ilike.%store-visit%,name.ilike.%store visit%,name.ilike.%booking%");

  const rows = [...(byUrl ?? []), ...(bySlug ?? [])].filter(
    (r, i, arr) => arr.findIndex(x => x.id === r.id) === i
  );

  if (!rows.length) {
    return NextResponse.json({ ok: true, message: "No matching rows found", candidates: [] });
  }

  const newUrl = "https://olympic-paints-forms-admin.vercel.app/store-visit-booking";
  const results = [];

  for (const row of rows) {
    if (row.upstream_url === newUrl) {
      results.push({ id: row.id, slug: row.slug, status: "already correct" });
      continue;
    }
    const { error } = await supabase
      .from("dashboards")
      .update({ upstream_url: newUrl })
      .eq("id", row.id);
    results.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      old_url: row.upstream_url,
      new_url: newUrl,
      status: error ? `ERROR: ${error.message}` : "updated",
    });
  }

  return NextResponse.json({ ok: true, results });
}
