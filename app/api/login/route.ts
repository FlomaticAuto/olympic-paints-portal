import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { logAccess } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");

  if (!username || !password) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url), 303);
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, username, password_hash, full_name, is_admin, must_change_pw, is_active")
    .eq("username", username)
    .single();

  if (!user) {
    await logAccess({ event: "login_failed", username });
    return NextResponse.redirect(new URL("/login?error=invalid", req.url), 303);
  }

  if (!user.is_active) {
    await logAccess({ event: "login_failed", userId: user.id, username });
    return NextResponse.redirect(new URL("/login?error=inactive", req.url), 303);
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await logAccess({ event: "login_failed", userId: user.id, username });
    return NextResponse.redirect(new URL("/login?error=invalid", req.url), 303);
  }

  await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  const s = await getSession();
  s.userId = user.id;
  s.username = user.username;
  s.fullName = user.full_name;
  s.isAdmin = user.is_admin;
  s.mustChangePw = user.must_change_pw;
  await s.save();

  await logAccess({ event: "login", userId: user.id, username });

  const dest = user.must_change_pw ? "/change-password" : next;
  return NextResponse.redirect(new URL(dest, req.url), 303);
}
