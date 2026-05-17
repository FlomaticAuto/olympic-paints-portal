import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await req.json();

  // Whitelist: only these fields may be patched via this endpoint.
  const patch: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.is_admin === "boolean") patch.is_admin = body.is_admin;
  if (typeof body.full_name === "string") patch.full_name = body.full_name.trim();
  if (typeof body.email === "string") patch.email = body.email.trim() || null;

  if (Object.keys(patch).length === 0) {
    return new NextResponse("Nothing to update.", { status: 400 });
  }

  const { error } = await supabase.from("users").update(patch).eq("id", id);
  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json({ ok: true });
}
