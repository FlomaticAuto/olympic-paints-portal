import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { logAccess } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s.userId) return NextResponse.redirect(new URL("/login", req.url), 303);

  const form = await req.formData();
  const current = String(form.get("current") ?? "");
  const next1 = String(form.get("next1") ?? "");
  const next2 = String(form.get("next2") ?? "");

  if (next1.length < 10) {
    return NextResponse.redirect(new URL("/change-password?error=short", req.url), 303);
  }
  if (next1 !== next2) {
    return NextResponse.redirect(new URL("/change-password?error=mismatch", req.url), 303);
  }

  // Skip current-password check on forced first-time change.
  if (!s.mustChangePw) {
    const { data: user } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", s.userId)
      .single();
    if (!user || !(await bcrypt.compare(current, user.password_hash))) {
      return NextResponse.redirect(new URL("/change-password?error=wrong", req.url), 303);
    }
  }

  const newHash = await bcrypt.hash(next1, 12);
  await supabase
    .from("users")
    .update({ password_hash: newHash, must_change_pw: false })
    .eq("id", s.userId);

  s.mustChangePw = false;
  await s.save();

  await logAccess({ event: "password_change", userId: s.userId, username: s.username });

  return NextResponse.redirect(new URL("/", req.url), 303);
}
