import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This handler proxies sub-paths and assets under /d/<slug>/<...>
// Shares logic with the top-level route in ../route.ts but is a separate
// segment because Next routes top-level and catch-all separately.

function rewriteHtml(html: string, slug: string, upstreamBase: URL): string {
  const localBase = `/d/${slug}/`;
  return html.replace(
    /(\b(?:src|href|action)\s*=\s*)(["'])([^"']+)\2/gi,
    (_full, attr: string, q: string, url: string) => {
      if (/^(#|data:|javascript:|mailto:|tel:|blob:)/i.test(url)) {
        return `${attr}${q}${url}${q}`;
      }
      if (/^https?:\/\//i.test(url)) {
        try {
          const u = new URL(url);
          if (u.origin !== upstreamBase.origin) {
            return `${attr}${q}${url}${q}`;
          }
          const rel = u.pathname.replace(/^\//, "") + u.search + u.hash;
          return `${attr}${q}${localBase}${rel}${q}`;
        } catch {
          return `${attr}${q}${url}${q}`;
        }
      }
      if (url.startsWith("/")) {
        return `${attr}${q}${localBase}${url.slice(1)}${q}`;
      }
      return `${attr}${q}${localBase}${url}${q}`;
    },
  );
}

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
