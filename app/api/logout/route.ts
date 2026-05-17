import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logAccess } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await getSession();
  if (s.userId) {
    await logAccess({ event: "logout", userId: s.userId, username: s.username });
  }
  s.destroy();
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
