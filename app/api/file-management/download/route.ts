import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { presignedDownloadUrl, AREAS } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") ?? "";

  const withinKnownArea = AREAS.some((area) => key.startsWith(`${area}/`));
  if (!key || !withinKnownArea) {
    return new NextResponse("Unknown file", { status: 400 });
  }

  try {
    const url = await presignedDownloadUrl(key);
    return NextResponse.json({ url });
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : "Failed to generate link", { status: 500 });
  }
}
