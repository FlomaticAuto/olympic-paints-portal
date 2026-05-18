"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./CompetitorIntelligence.module.css";

type Row = {
  competitor: string;
  category: string;
  product: string;
  colour: string;
  size: string;
  size_bucket: string;
  channel: "wholesale" | "retail";
  price_excl: number | null;
  price_incl: number | null;
  vat_status: string;
  price_date: string;
  oly_product: string | null;
  oly_price_excl: number | null;
  diff_pct: number | null;
};

type Dataset = {
  generated: string;
  count: number;
  rows: Row[];
};

const SIZE_FILTERS = [
  { id: "all",   label: "All Sizes" },
  { id: "500ml", label: "500 ml" },
  { id: "750ml", label: "750 ml" },
  { id: "1L",    label: "1 L" },
  { id: "5L",    label: "5 L" },
  { id: "10L",   label: "10 L" },
  { id: "20L",   label: "20 L" },
  { id: "25L",   label: "25 L" },
  { id: "other", label: "Other" },
];

const COMP_COLOURS: Record<string, string> = {
  Anetic:          "#2D8C7A",
  Berger:          "#9B7DBF",
  Crest:           "#C97A3A",
  Dulux:           "#E87BAD",
  Fast:            "#5C6B7A",
  "Golden Choice": "#F5C400",
  Plascon:         "#1A3D6E",
};

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDiff(v: number | null | undefined): { text: string; cls: string } {
  if (v === null || v === undefined) return { text: "—", cls: styles.diffNull };
  const sign = v > 0 ? "+" : "";
  const text = `${sign}${v.toFixed(1)}%`;
  // Positive diff = competitor is MORE expensive than Olympic (good for us)
  const cls = v > 5 ? styles.diffGood : v < -5 ? styles.diffBad : styles.diffNeutral;
  return { text, cls };
}

type SortKey = "competitor" | "category" | "product" | "size" | "price_excl" | "diff_pct";

export default function CompetitorIntelligenceDashboard() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState("all");
  const [compFilter, setCompFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState<"all" | "wholesale" | "retail">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("competitor");
  const [sortAsc, setSortAsc] = useState(true);
  const [matchedOnly, setMatchedOnly] = useState(false);

  useEffect(() => {
    fetch("/competitor-data.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const competitors = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.rows.map((r) => r.competitor))).sort();
  }, [data]);

  const activeSizeBuckets = useMemo(() => {
    if (!data) return new Set<string>();
    const rows =
      compFilter === "all" ? data.rows : data.rows.filter((r) => r.competitor === compFilter);
    return new Set(rows.map((r) => r.size_bucket));
  }, [data, compFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.rows
      .filter((r) => sizeFilter === "all" || r.size_bucket === sizeFilter)
      .filter((r) => compFilter === "all" || r.competitor === compFilter)
      .filter((r) => channelFilter === "all" || r.channel === channelFilter)
      .filter((r) => !matchedOnly || r.oly_product !== null)
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.competitor.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.product.toLowerCase().includes(q) ||
          r.colour.toLowerCase().includes(q) ||
          r.size.toLowerCase().includes(q) ||
          (r.oly_product ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let av: string | number | null = a[sortKey];
        let bv: string | number | null = b[sortKey];
        if (av === null || av === undefined) av = sortAsc ? "￿" : "";
        if (bv === null || bv === undefined) bv = sortAsc ? "￿" : "";
        if (typeof av === "string" && typeof bv === "string")
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc
          ? (av as number) - (bv as number)
          : (bv as number) - (av as number);
      });
  }, [data, sizeFilter, compFilter, channelFilter, matchedOnly, search, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const withPrice = filtered.filter((r) => r.price_excl !== null);
    const avg =
      withPrice.length === 0
        ? null
        : withPrice.reduce((s, r) => s + r.price_excl!, 0) / withPrice.length;
    const min = withPrice.length === 0 ? null : Math.min(...withPrice.map((r) => r.price_excl!));
    const max = withPrice.length === 0 ? null : Math.max(...withPrice.map((r) => r.price_excl!));
    const withDiff = filtered.filter((r) => r.diff_pct !== null);
    const avgDiff =
      withDiff.length === 0
        ? null
        : withDiff.reduce((s, r) => s + r.diff_pct!, 0) / withDiff.length;
    return { avg, min, max, count: filtered.length, avgDiff, diffCount: withDiff.length };
  }, [filtered]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className={styles.sortIcon}>⇅</span>;
    return <span className={styles.sortIcon}>{sortAsc ? "↑" : "↓"}</span>;
  }

  if (error) return <div className={styles.error}>Failed to load data: {error}</div>;
  if (!data) return <div className={styles.loading}>Loading competitor intelligence…</div>;

  // Retail rows always show incl VAT; wholesale rows show excl VAT
  function displayPrice(r: Row): number | null {
    if (r.channel === "retail") return r.price_incl;
    return r.price_excl;
  }
  function priceLabel(r: Row): string {
    return r.channel === "retail" ? "Incl VAT" : "Excl VAT";
  }

  const avgDiffFmt = fmtDiff(stats.avgDiff);

  return (
    <div className={styles.root}>
      {/* ── Page header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Competitor Intelligence</h1>
          <p className={styles.subtitle}>
            {data.count} price points · {competitors.length} competitors · Generated {data.generated}
          </p>
        </div>
      </header>

      {/* ── Stat strip ── */}
      <div className={styles.statStrip}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{stats.count}</span>
          <span className={styles.statLbl}>ROWS SHOWN</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{fmt(stats.avg)}</span>
          <span className={styles.statLbl}>AVG COMP PRICE EXCL</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{fmt(stats.min)}</span>
          <span className={styles.statLbl}>MIN COMP PRICE EXCL</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{fmt(stats.max)}</span>
          <span className={styles.statLbl}>MAX COMP PRICE EXCL</span>
        </div>
        {stats.diffCount > 0 && (
          <div className={styles.stat}>
            <span className={`${styles.statVal} ${avgDiffFmt.cls}`}>{avgDiffFmt.text}</span>
            <span className={styles.statLbl}>AVG PRICE DIFF ({stats.diffCount} matched)</span>
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className={styles.filterBar}>
        {/* Channel */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>CHANNEL</span>
          <div className={styles.pills}>
            {(["all", "wholesale", "retail"] as const).map((ch) => (
              <button
                key={ch}
                className={channelFilter === ch ? styles.pillActive : styles.pill}
                onClick={() => setChannelFilter(ch)}
              >
                {ch === "all" ? "All Channels" : ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Matched */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>MATCH</span>
          <div className={styles.pills}>
            <button
              className={!matchedOnly ? styles.pillActive : styles.pill}
              onClick={() => setMatchedOnly(false)}
            >
              All
            </button>
            <button
              className={matchedOnly ? styles.pillActive : styles.pill}
              onClick={() => setMatchedOnly(true)}
            >
              Matched
            </button>
          </div>
        </div>

        {/* Size */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>SIZE</span>
          <div className={styles.pills}>
            {SIZE_FILTERS.filter(
              (f) => f.id === "all" || activeSizeBuckets.has(f.id)
            ).map((f) => (
              <button
                key={f.id}
                className={sizeFilter === f.id ? styles.pillActive : styles.pill}
                onClick={() => setSizeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Competitor */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>BRAND</span>
          <div className={styles.pills}>
            <button
              className={compFilter === "all" ? styles.pillActive : styles.pill}
              onClick={() => setCompFilter("all")}
            >
              All Brands
            </button>
            {competitors.map((c) => (
              <button
                key={c}
                className={compFilter === c ? styles.pillActive : styles.pill}
                style={
                  compFilter === c
                    ? { background: COMP_COLOURS[c] ?? "#F5C400", color: "#0D0D0B", borderColor: "transparent" }
                    : { borderColor: COMP_COLOURS[c] ?? "#5C5B58", color: COMP_COLOURS[c] ?? "#C8C7C0" }
                }
                onClick={() => setCompFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>SEARCH</span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Product, category, colour, Olympic product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => toggleSort("competitor")} className={styles.thBtn}>
                Brand <SortIcon k="competitor" />
              </th>
              <th onClick={() => toggleSort("category")} className={styles.thBtn}>
                Category <SortIcon k="category" />
              </th>
              <th onClick={() => toggleSort("product")} className={styles.thBtn}>
                Product <SortIcon k="product" />
              </th>
              <th>Colour</th>
              <th onClick={() => toggleSort("size")} className={styles.thBtn}>
                Size <SortIcon k="size" />
              </th>
              <th className={styles.chCol}>Channel</th>
              <th onClick={() => toggleSort("price_excl")} className={`${styles.thBtn} ${styles.priceCol}`}>
                Comp Price <SortIcon k="price_excl" />
              </th>
              <th className={styles.priceCol}>Olympic Price</th>
              <th onClick={() => toggleSort("diff_pct")} className={`${styles.thBtn} ${styles.priceCol}`}>
                Diff % <SortIcon k="diff_pct" />
              </th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className={styles.empty}>
                  No results match your filters.
                </td>
              </tr>
            )}
            {filtered.map((r, i) => {
              const diff = fmtDiff(r.diff_pct);
              return (
                <tr key={i} className={i % 2 === 1 ? styles.rowAlt : ""}>
                  <td>
                    <span
                      className={styles.compBadge}
                      style={{ background: COMP_COLOURS[r.competitor] ?? "#5C6B7A" }}
                    >
                      {r.competitor}
                    </span>
                  </td>
                  <td className={styles.catCell}>{r.category}</td>
                  <td className={styles.productCell}>{r.product}</td>
                  <td>{r.colour || "—"}</td>
                  <td className={styles.sizeCell}>
                    <span className={styles.sizeTag}>{r.size || "—"}</span>
                  </td>
                  <td>
                    <span className={r.channel === "retail" ? styles.badgeRetail : styles.badgeWholesale}>
                      {r.channel === "retail" ? "Retail" : "Wholesale"}
                    </span>
                  </td>
                  <td className={styles.priceCell}>
                    <span>{fmt(displayPrice(r))}</span>
                    <span className={styles.vatLabel}>{priceLabel(r)}</span>
                  </td>
                  <td className={styles.priceCell}>
                    {r.oly_product ? (
                      <>
                        <span>{fmt(r.oly_price_excl)}</span>
                        <span className={styles.vatLabel}>
                          {r.oly_price_excl ? "Excl VAT" : ""}
                        </span>
                        <div className={styles.olyProduct}>{r.oly_product}</div>
                      </>
                    ) : (
                      <span className={styles.noMatch}>No match</span>
                    )}
                  </td>
                  <td className={`${styles.priceCell} ${diff.cls}`}>
                    {diff.text}
                  </td>
                  <td className={styles.dateCell}>{r.price_date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        Showing {filtered.length} of {data.count} price points ·{" "}
        <span className={styles.footNote}>
          Diff % = (comp excl VAT − Olympic list price excl VAT) ÷ Olympic list price.
          Positive = competitor more expensive.
        </span>{" "}
        · <a href="/" className={styles.backLink}>← Back to Portal</a>
      </div>
    </div>
  );
}
