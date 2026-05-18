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
  price_excl: number | null;
  price_incl: number | null;
  vat_status: string;
  price_date: string;
  source: string;
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

function fmt(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SortKey = "competitor" | "category" | "product" | "size" | "price_excl" | "price_incl";

export default function CompetitorIntelligenceDashboard() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState("all");
  const [compFilter, setCompFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("competitor");
  const [sortAsc, setSortAsc] = useState(true);
  const [vatMode, setVatMode] = useState<"excl" | "incl">("excl");

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
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.competitor.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.product.toLowerCase().includes(q) ||
          r.colour.toLowerCase().includes(q) ||
          r.size.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let av: string | number | null = a[sortKey];
        let bv: string | number | null = b[sortKey];
        if (av === null) av = sortAsc ? Infinity : -Infinity;
        if (bv === null) bv = sortAsc ? Infinity : -Infinity;
        if (typeof av === "string" && typeof bv === "string")
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [data, sizeFilter, compFilter, search, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const withPrice = filtered.filter((r) => r.price_excl !== null);
    const avg =
      withPrice.length === 0
        ? null
        : withPrice.reduce((s, r) => s + r.price_excl!, 0) / withPrice.length;
    const min = withPrice.length === 0 ? null : Math.min(...withPrice.map((r) => r.price_excl!));
    const max = withPrice.length === 0 ? null : Math.max(...withPrice.map((r) => r.price_excl!));
    return { avg, min, max, count: filtered.length };
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
        <div className={styles.headerRight}>
          <div className={styles.vatToggle}>
            <button
              className={vatMode === "excl" ? styles.vatActive : styles.vatBtn}
              onClick={() => setVatMode("excl")}
            >
              Excl VAT
            </button>
            <button
              className={vatMode === "incl" ? styles.vatActive : styles.vatBtn}
              onClick={() => setVatMode("incl")}
            >
              Incl VAT
            </button>
          </div>
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
          <span className={styles.statLbl}>AVG PRICE EXCL</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{fmt(stats.min)}</span>
          <span className={styles.statLbl}>MIN PRICE EXCL</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{fmt(stats.max)}</span>
          <span className={styles.statLbl}>MAX PRICE EXCL</span>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className={styles.filterBar}>
        {/* Size pills */}
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

        {/* Competitor chips */}
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
            placeholder="Product, category, colour…"
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
              <th
                onClick={() => toggleSort(vatMode === "excl" ? "price_excl" : "price_incl")}
                className={`${styles.thBtn} ${styles.priceCol}`}
              >
                Price ({vatMode === "excl" ? "Excl VAT" : "Incl VAT"}){" "}
                <SortIcon k={vatMode === "excl" ? "price_excl" : "price_incl"} />
              </th>
              <th>VAT Status</th>
              <th>Date</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.empty}>
                  No results match your filters.
                </td>
              </tr>
            )}
            {filtered.map((r, i) => (
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
                <td className={styles.priceCell}>
                  {fmt(vatMode === "excl" ? r.price_excl : r.price_incl)}
                </td>
                <td className={styles.vatCell}>{r.vat_status}</td>
                <td className={styles.dateCell}>{r.price_date}</td>
                <td className={styles.sourceCell} title={r.source}>
                  {r.source.length > 32 ? r.source.slice(0, 32) + "…" : r.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        Showing {filtered.length} of {data.count} price points ·{" "}
        <a href="/" className={styles.backLink}>← Back to Portal</a>
      </div>
    </div>
  );
}
