import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { tempPassword } from "@/lib/random";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await ctx.params;

  const { data: u } = await supabase
    .from("users").select("username").eq("id", id).single();
  if (!u) return new NextResponse("User not found.", { status: 404 });

  const tmp = tempPassword();
  const password_hash = await bcrypt.hash(tmp, 12);

  const { error } = await supabase
    .from("users")
    .update({ password_hash, must_change_pw: true })
    .eq("id", id);
  if (error) return new NextResponse(error.message, { status: 400 });

  const url = new URL("/admin/users", req.url);
  url.searchParams.set("reset", u.username);
  url.searchParams.set("tmp", tmp);
  return NextResponse.redirect(url, 303);
}
