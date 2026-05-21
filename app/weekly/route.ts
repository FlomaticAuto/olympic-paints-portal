import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s.userId) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent("/weekly")}`, req.url),
      303,
    );
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "weekly",
    "current",
    "index.html",
  );
  let html: string;
  try {
    html = await fs.readFile(filePath, "utf-8");
  } catch {
    return new NextResponse(
      "Weekly report has not been generated yet. Drop a note via Telegram or 0.Inbox/weekly/ and try again.",
      { status: 404 },
    );
  }
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
