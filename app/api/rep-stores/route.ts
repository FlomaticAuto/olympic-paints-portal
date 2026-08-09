import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Store list lives in the forms-admin Supabase project, which the portal has no
// credentials for. Rather than provision a second service-role key (and never in
// this repo — it is public), proxy the existing search endpoint server-side.
// Gated on a portal session so the portal itself adds no public surface.
const UPSTREAM =
  process.env.STORES_SEARCH_URL ??
  "https://olympic-paints-forms-admin.vercel.app/api/stores/search";

export type StoreHit = {
  id: string;
  name: string;
  code: string | null;
  dlref: string | null;
  curef: string | null;
  town: string | null;
  area: string | null;
};

export async function GET(req: NextRequest) {
  // 401 rather than requireUser()'s redirect — a client fetch would follow a
  // 307 to /login and choke on HTML where it expects JSON.
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const rep = req.nextUrl.searchParams.get("rep")?.trim() ?? "";

  // Upstream ignores anything shorter; save it the round trip.
  if (q.length < 2) return NextResponse.json([]);

  const url = new URL(UPSTREAM);
  url.searchParams.set("q", q);
  if (rep) url.searchParams.set("rep", rep);

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // Store list is slow-moving; a short cache keeps repeated keystrokes cheap.
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Store lookup unavailable" }, { status: 502 });
    }
    const data = (await res.json()) as StoreHit[];
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json({ error: "Store lookup unavailable" }, { status: 502 });
  }
}
