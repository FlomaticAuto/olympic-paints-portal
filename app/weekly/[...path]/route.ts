import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const s = await getSession();
  if (!s.userId) {
    const { path: segs } = await ctx.params;
    const fullPath = `/weekly/${segs.join("/")}`;
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(fullPath)}`, req.url),
      303,
    );
  }

  const { path: segs } = await ctx.params;
  // Defense in depth: reject any segment containing a traversal token
  for (const seg of segs) {
    if (seg.includes("..") || seg.includes("\0") || seg.startsWith("/")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }
  const filePath = path.join(
    process.cwd(),
    "public",
    "weekly",
    ...segs,
  );
  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = path.extname(filePath).toLowerCase();
  // `Buffer` isn't a valid BodyInit in Next.js's strict TS types — wrap in
  // Uint8Array (which shares the same memory) so we can return raw bytes.
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
  });
}
