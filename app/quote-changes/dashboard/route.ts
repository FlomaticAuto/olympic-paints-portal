import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { backendSupabase } from "@/lib/supabase";
import { buildQuoteChangeDashboard, type QuoteChangeRow } from "@/lib/quoteChangeDashboard";

export const dynamic = "force-dynamic";

// GET /quote-changes/dashboard — returns the rendered dashboard HTML.
// Admin-only; iframed by /quote-changes. Data stays server-side.
export async function GET() {
  await requireAdmin();

  const { data, error } = await backendSupabase()
    .from("quote_change_log")
    .select(
      "entry_ref,rep_code,rep_name,logged_by,event_date,event_type,account,reason_code,revision_no,note",
    )
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return new NextResponse(`Failed to load data: ${error.message}`, { status: 500 });
  }

  const html = buildQuoteChangeDashboard((data ?? []) as QuoteChangeRow[]);
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
