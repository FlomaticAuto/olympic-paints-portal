// Shared HTML rewrite + back-banner injection for the dashboard proxy.

const BANNER = `<div id="__oly_portal_banner__" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#0D2040;color:#fff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #F5C400;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><a href="/" style="color:#F5C400;text-decoration:none;font-weight:600;display:flex;align-items:center;gap:6px;">&larr; Back to Portal</a><span style="opacity:0.7;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">Olympic Paints Staff Portal</span></div><style>html{padding-top:36px !important;}</style>`;

export function rewriteHtml(html: string, slug: string, upstreamBase: URL): string {
  const localBase = `/d/${slug}/`;

  // Rewrite src/href/action attributes (anything that fetches another URL)
  let out = html.replace(
    /(\b(?:src|href|action)\s*=\s*)(["'])([^"']+)\2/gi,
    (_full, attr: string, q: string, url: string) => {
      if (/^(#|data:|javascript:|mailto:|tel:|blob:)/i.test(url)) {
        return `${attr}${q}${url}${q}`;
      }
      if (/^https?:\/\//i.test(url)) {
        try {
          const u = new URL(url);
          if (u.origin !== upstreamBase.origin) return `${attr}${q}${url}${q}`;
          const rel = u.pathname.replace(/^\//, "") + u.search + u.hash;
          return `${attr}${q}${localBase}${rel}${q}`;
        } catch {
          return `${attr}${q}${url}${q}`;
        }
      }
      if (url.startsWith("/")) return `${attr}${q}${localBase}${url.slice(1)}${q}`;
      return `${attr}${q}${localBase}${url}${q}`;
    },
  );

  // Rewrite CSS url(...) references too — inline <style> blocks fetch via url()
  out = out.replace(
    /url\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi,
    (_full, q: string, url: string) => {
      if (/^(data:|#)/i.test(url)) return `url(${q}${url}${q})`;
      if (/^https?:\/\//i.test(url)) {
        try {
          const u = new URL(url);
          if (u.origin !== upstreamBase.origin) return `url(${q}${url}${q})`;
          const rel = u.pathname.replace(/^\//, "") + u.search + u.hash;
          return `url(${q}${localBase}${rel}${q})`;
        } catch {
          return `url(${q}${url}${q})`;
        }
      }
      if (url.startsWith("/")) return `url(${q}${localBase}${url.slice(1)}${q})`;
      return `url(${q}${localBase}${url}${q})`;
    },
  );

  // Inject the floating back-to-portal banner right after <body ...>
  if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/(<body[^>]*>)/i, `$1${BANNER}`);
  } else {
    // No body tag — prepend at the start
    out = BANNER + out;
  }
  return out;
}
