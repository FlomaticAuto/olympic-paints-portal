import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { rewriteHtml } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; path: string[] }> },
) {
  const { slug, path } = await ctx.params;
  const subPath = path.join("/");

  const s = await getSession();
  if (!s.userId) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(`/d/${slug}/${subPath}`)}`, req.url),
      303,
    );
  }

  const { data: rows } = await supabase
    .from("dashboards")
    .select("id, slug, upstream_url, is_active, user_dashboards!inner(user_id)")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("user_dashboards.user_id", s.userId);

  const dash = rows?.[0];
  if (!dash) {
    return new NextResponse("Not found or access denied.", { status: 404 });
  }

  const upstreamBase = new URL(dash.upstream_url);
  if (!upstreamBase.pathname.endsWith("/")) upstreamBase.pathname += "/";
  const upstreamTarget = new URL(subPath, upstreamBase);

  const upstreamRes = await fetch(upstreamTarget.toString(), {
    headers: { "user-agent": "olympic-paints-portal/1.0" },
    redirect: "follow",
  });
  const ct = upstreamRes.headers.get("content-type") ?? "application/octet-stream";

  if (/text\/html/i.test(ct)) {
    const html = await upstreamRes.text();
    return new NextResponse(rewriteHtml(html, slug, upstreamBase), {
      status: upstreamRes.status,
      headers: {
        "content-type": ct,
        "x-frame-options": "SAMEORIGIN",
        "cache-control": "private, no-store",
      },
    });
  }

  const buf = await upstreamRes.arrayBuffer();
  return new NextResponse(buf, {
    status: upstreamRes.status,
    headers: {
      "content-type": ct,
      "cache-control": upstreamRes.headers.get("cache-control") ?? "private, max-age=300",
    },
  });
}
