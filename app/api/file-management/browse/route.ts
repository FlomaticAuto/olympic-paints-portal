import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listChildren, AREAS } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get("prefix") ?? "";

  // Root view: the fixed area list, not a live R2 listing — keeps the
  // top-level folder set stable even if an area is temporarily empty.
  if (prefix === "") {
    return NextResponse.json({
      prefix: "",
      entries: AREAS.map((name) => ({
        name,
        key: `${name}/`,
        isFolder: true,
        size: null,
        lastModified: null,
      })),
    });
  }

  // Guard: only allow browsing inside a known area (or a sub-path of one).
  const withinKnownArea = AREAS.some(
    (area) => prefix === `${area}/` || prefix.startsWith(`${area}/`),
  );
  if (!withinKnownArea) {
    return new NextResponse("Unknown area", { status: 400 });
  }

  try {
    const entries = await listChildren(prefix);
    return NextResponse.json({ prefix, entries });
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : "Failed to list files", { status: 500 });
  }
}
