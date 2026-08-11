import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { logAccess } from "@/lib/log";

export const runtime = "nodejs";

const BRIDGE_SECRET = process.env.REP_VISIT_BRIDGE_SECRET;
if (!BRIDGE_SECRET) {
  throw new Error("REP_VISIT_BRIDGE_SECRET must be set in the environment.");
}

// Credential check for the Rep Visit PWA (a separate app/Vercel project) so reps
// can use their existing portal password there without a shared session cookie
// across two independently-deployed apps. Never sets a portal session; the
// caller mints its own. Gated on a shared secret so this can't be used as an
// open oracle for brute-forcing portal passwords.
export async function POST(req: Request) {
  const secret = req.headers.get("x-bridge-secret");
  if (secret !== BRIDGE_SECRET) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, username, password_hash, full_name, is_admin, is_active")
    .eq("username", username)
    .single();

  if (!user || !user.is_active) {
    await logAccess({ event: "login_failed", username });
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await logAccess({ event: "login_failed", userId: user.id, username });
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  await logAccess({ event: "login", userId: user.id, username });

  return NextResponse.json({
    valid: true,
    username: user.username,
    fullName: user.full_name,
  });
}
