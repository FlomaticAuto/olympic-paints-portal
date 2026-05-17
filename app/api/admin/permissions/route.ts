import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const grants: { user_id: string; dashboard_id: string }[] = body.grants ?? [];

  // Replace-all strategy: easier UX (just save the matrix), trivial at our scale.
  const del = await supabase.from("user_dashboards").delete().not("user_id", "is", null);
  if (del.error) return new NextResponse(del.error.message, { status: 500 });

  if (grants.length === 0) return NextResponse.json({ ok: true });

  const ins = await supabase.from("user_dashboards").insert(grants);
  if (ins.error) return new NextResponse(ins.error.message, { status: 500 });

  return NextResponse.json({ ok: true });
}
