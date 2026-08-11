import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { backendSupabase } from "@/lib/supabase";

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

  if (q.length < 2) return NextResponse.json([]);

  let query = backendSupabase()
    .from("stores")
    .select("id,name,code,dlref,curef,town,area")
    .or(`name.ilike.%${q}%,dlref.ilike.%${q}%,curef.ilike.%${q}%,code.ilike.%${q}%,town.ilike.%${q}%`)
    .order("name")
    .limit(20);

  if (rep) query = query.eq("rep", rep);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Store lookup unavailable" }, { status: 502 });
  }
  return NextResponse.json((data ?? []) as StoreHit[]);
}
