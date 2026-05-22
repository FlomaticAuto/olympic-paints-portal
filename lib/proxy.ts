// Shared HTML rewrite for the dashboard proxy.

export function rewriteHtml(html: string, slug: string, upstreamBase: URL): string {
  const localBase = `/d/${slug}/`;

  // Inject <base href> so JS-initiated asset loads (Next.js 15 CSS chunks, etc.)
  // resolve against the upstream origin rather than the portal domain.
  // Must go before any other <head> content to take effect.
  let out = html.replace(
    /(<head[^>]*>)/i,
    `$1<base href="${upstreamBase.origin}/">`,
  );
  // If there's no <head> tag, fall back to prepending the base tag.
  if (!/<head[^>]*>/i.test(html)) {
    out = `<base href="${upstreamBase.origin}/">` + out;
  }

  // Rewrite src/href/action attributes (anything that fetches another URL)
  out = out.replace(
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
  // Case-sensitive: CSS url() is always lowercase; uppercase URL() is a JS global — never rewrite it.
  out = out.replace(
    /url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g,
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

  // Strip Next.js client-side JS bundles. The server already rendered the full
  // page; allowing the client router to hydrate causes it to re-evaluate the
  // current route against the upstream origin (via <base href>) and render the
  // wrong page (e.g. leaderboard root instead of /daily/latest/AC).
  // CSS chunks from /_next/static/css/ are NOT scripts — they load fine via
  // <link> tags and are unaffected by this strip.
  out = out.replace(/<script\b[^>]*\/_next\/[^>]*><\/script>/gi, "");
  out = out.replace(/<script\b[^>]*id="__NEXT_DATA__"[^>]*>[\s\S]*?<\/script>/gi, "");

  return out;
}
