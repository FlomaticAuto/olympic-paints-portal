import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { logAccess } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rewrite relative URLs in an upstream HTML body so assets and links
// stay on the same domain when proxied through /d/<slug>/...
function rewriteHtml(html: string, slug: string, upstreamBase: URL): string {
  const localBase = `/d/${slug}/`;

  // src="x", href="x", action="x" (single OR double quoted)
  return html.replace(
    /(\b(?:src|href|action)\s*=\s*)(["'])([^"']+)\2/gi,
    (_full, attr: string, q: string, url: string) => {
      // Leave anchors and data:/javascript:/mailto:/tel: alone
      if (/^(#|data:|javascript:|mailto:|tel:|blob:)/i.test(url)) {
        return `${attr}${q}${url}${q}`;
      }
      // Already absolute on a DIFFERENT origin → leave it
      if (/^https?:\/\//i.test(url)) {
        try {
          const u = new URL(url);
          if (u.origin !== upstreamBase.origin) {
            return `${attr}${q}${url}${q}`;
          }
          // Same origin → rewrite to local path under /d/<slug>/
          const rel = u.pathname.replace(/^\//, "") + u.search + u.hash;
          return `${attr}${q}${localBase}${rel}${q}`;
        } catch {
          return `${attr}${q}${url}${q}`;
        }
      }
      // Absolute path on upstream (starts with /)
      if (url.startsWith("/")) {
        return `${attr}${q}${localBase}${url.slice(1)}${q}`;
      }
      // Relative path → also goes under /d/<slug>/
      return `${attr}${q}${localBase}${url}${q}`;
    },
  );
}

async function proxy(req: Request, slug: string, subPath: string) {
  const s = await getSession();
  if (!s.userId) {
    const next = `/d/${slug}${subPath ? "/" + subPath : ""}`;
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, req.url),
      303,
    );
  }

  // Confirm dashboard exists, is active, and this user has access.
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

  // Resolve upstream URL
  const upstreamBase = new URL(dash.upstream_url);
  // Ensure upstreamBase ends with /
  if (!upstreamBase.pathname.endsWith("/")) {
    upstreamBase.pathname += "/";
  }
  const upstreamTarget = new URL(subPath, upstreamBase);

  // Forward only safe headers
  const upstreamRes = await fetch(upstreamTarget.toString(), {
    headers: { "user-agent": "olympic-paints-portal/1.0" },
    redirect: "follow",
  });

  const ct = upstreamRes.headers.get("content-type") ?? "application/octet-stream";

  // Log views only for the top-level HTML hit, not every asset
  if (!subPath && /text\/html/i.test(ct)) {
    await logAccess({
      event: "view",
      userId: s.userId,
      username: s.username,
      dashboardSlug: slug,
    });
  }

  // If HTML, rewrite URLs so assets/links route back through us.
  if (/text\/html/i.test(ct)) {
    const html = await upstreamRes.text();
    const rewritten = rewriteHtml(html, slug, upstreamBase);
    return new NextResponse(rewritten, {
      status: upstreamRes.status,
      headers: {
        "content-type": ct,
        "x-frame-options": "SAMEORIGIN",
        "cache-control": "private, no-store",
      },
    });
  }

  // Otherwise stream the body through (images, css, js, fonts...)
  const buf = await upstreamRes.arrayBuffer();
  return new NextResponse(buf, {
    status: upstreamRes.status,
    headers: {
      "content-type": ct,
      "cache-control": upstreamRes.headers.get("cache-control") ?? "private, max-age=300",
    },
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  return proxy(req, slug, "");
}
