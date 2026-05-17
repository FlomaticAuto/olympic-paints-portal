import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { tempPassword } from "@/lib/random";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireAdmin();
  const form = await req.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const full_name = String(form.get("full_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim() || null;
  const is_admin = form.get("is_admin") === "1";

  if (!username || !full_name) {
    return new NextResponse("Username and full name are required.", { status: 400 });
  }

  const tmp = tempPassword();
  const password_hash = await bcrypt.hash(tmp, 12);

  const { error } = await supabase.from("users").insert({
    username, full_name, email, is_admin, password_hash, must_change_pw: true,
  });
  if (error) return new NextResponse(error.message, { status: 400 });

  const url = new URL("/admin/users", req.url);
  url.searchParams.set("created", username);
  url.searchParams.set("tmp", tmp);
  return NextResponse.redirect(url, 303);
}
