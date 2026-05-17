"use client";

import { useMemo, useState } from "react";
import type { Dashboard } from "@/lib/types";

type Group = { category: string; items: Dashboard[] };

const STOPWORDS = new Set([
  "a","an","and","the","of","for","to","in","on","by","with","at","is","are",
  "or","as","from","into","via","that","this","its","be","per","over","under",
  "every","each","all","new","old","its","across","plus","also","not","but",
  "if","then","than","so","just","very","more","most","less","least","up","down",
]);

function buildTags(name: string, description: string | null): string[] {
  // Pull capitalised phrases and key nouns from name + description.
  const text = `${name} ${description ?? ""}`;
  const candidates = new Map<string, number>();

  // 1) Capitalised words (proper-noun-ish) from name + description
  const capRe = /\b[A-Z][A-Za-z0-9]+(?:[- ][A-Z][A-Za-z0-9]+)?\b/g;
  let m: RegExpExecArray | null;
  while ((m = capRe.exec(text))) {
    const w = m[0].trim();
    if (w.length < 3) continue;
    if (STOPWORDS.has(w.toLowerCase())) continue;
    if (/^(Olympic|Paints|Dashboard|Report|Tracker|Score|KPI|YoY|Per|Rep)$/i.test(w) && candidates.size > 0) continue;
    candidates.set(w, (candidates.get(w) ?? 0) + 2);
  }

  // 2) Hyphenated phrases (e.g. "year-on-year", "rock-bottom")
  const hypRe = /\b[a-z]+(?:-[a-z]+){1,}\b/gi;
  while ((m = hypRe.exec(text))) {
    const w = m[0].trim();
    if (w.length < 5) continue;
    candidates.set(toTitle(w), (candidates.get(toTitle(w)) ?? 0) + 1);
  }

  const ranked = Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  // de-dup case-insensitively
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of ranked) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length >= 4) break;
  }
  return out;
}

function toTitle(s: string): string {
  return s
    .split(/[\s-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("-");
}

const CATEGORY_BADGE: Record<string, string> = {
  "Sales Reports": "Sales",
  "Sales Rep KPIs": "Rep KPI",
  PULSE: "PULSE",
  "Merchandising & Product": "Merch",
  "E-Commerce": "E-Commerce",
  "HR & Operations": "HR · Ops",
  "Strategic Intelligence": "CSO",
  Forms: "Form",
};

export default function ReportCatalog({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState<string>("all");

  const tabs = useMemo(() => {
    const total = groups.reduce((acc, g) => acc + g.items.length, 0);
    return [
      { id: "all", label: "All Reports", count: total },
      ...groups.map((g) => ({ id: g.category, label: g.category, count: g.items.length })),
    ];
  }, [groups]);

  const visibleGroups = active === "all" ? groups : groups.filter((g) => g.category === active);

  return (
    <>
      <nav className="report-tabs" role="tablist" aria-label="Report categories">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={`report-tab ${active === t.id ? "active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
            <span className="report-tab-count">{t.count}</span>
          </button>
        ))}
      </nav>

      <div className="catalog">
        {visibleGroups.map((g) => (
          <section key={g.category} className="category-section">
            <h2 className="category-heading">
              <span className="category-label">{g.category}</span>
            </h2>
            <div className="report-grid">
              {g.items.map((d) => {
                const tags = buildTags(d.name, d.description);
                const badge = CATEGORY_BADGE[d.category ?? ""] ?? g.category;
                const isExternal = d.open_in_new_tab;
                const href = isExternal ? d.upstream_url : `/d/${d.slug}`;
                const linkProps = isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <a
                    key={d.id}
                    href={href}
                    {...linkProps}
                    className={`report-card${isExternal ? " is-form" : ""}`}
                  >
                    <div className="report-card-meta">
                      <span className="report-card-badge">{badge}</span>
                      <span className="report-card-status">
                        <span
                          className={`dot${isExternal ? " dot-form" : ""}`}
                          aria-hidden="true"
                        />
                        {isExternal ? (d.upstream_url?.includes("jotform.com") ? "JotForm" : "Form") : "Live"}
                      </span>
                    </div>
                    <h3 className="report-card-title">{d.name}</h3>
                    <p className="report-card-desc">{d.description}</p>
                    {tags.length > 0 && (
                      <div className="report-card-tags">
                        {tags.map((t) => (
                          <span key={t} className="report-tag">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="report-card-foot">
                      <span className="report-card-cta">
                        {isExternal ? "Open Form ↗" : "Open ↗"}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
