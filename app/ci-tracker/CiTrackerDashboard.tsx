"use client";

import type { CiMatrix, CellState } from "./page";
import styles from "./CiTracker.module.css";

const CATEGORY_LABELS: Record<string, string> = {
  enamel: "Enamel",
  pva: "PVA",
  waterproofing: "Waterproofing",
};

function CellIcon({ state }: { state: CellState }) {
  switch (state) {
    case "submitted": return <span className={styles.cellSubmitted}>✓</span>;
    case "overdue":   return <span className={styles.cellOverdue}>!</span>;
    case "sent":      return <span className={styles.cellSent}>📧</span>;
    case "pending":   return <span className={styles.cellPending}>—</span>;
  }
}

function DoneCounter({ done, total }: { done: number; total: number }) {
  const cls =
    done === total ? styles.doneCounter + " " + styles.full :
    done >= total * 0.6 ? styles.doneCounter + " " + styles.mid :
    styles.doneCounter + " " + styles.low;
  return (
    <span className={cls}>
      {done}/{total}{done === total ? " ✓" : ""}
    </span>
  );
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CiTrackerDashboard({
  matrix,
  reps,
}: {
  matrix: CiMatrix;
  reps: string[];
}) {
  // Group rows by competitor for the group header rows
  const competitors = Array.from(
    new Map(matrix.rows.map((r) => [r.competitorSlug, r.competitorLabel])).entries()
  );

  return (
    <div className={styles.root}>
      {/* Page header */}
      <div className={styles.header}>
        <h1 className={styles.title}>CI Verification Tracker</h1>
        <p className={styles.subtitle}>
          Rep completion status for competitor intelligence forms · Live from Supabase
        </p>
      </div>

      {/* KPI strip */}
      <div className={styles.kpiStrip}>
        <div className={`${styles.kpiTile} ${styles.yellow}`}>
          <div className={styles.kpiVal}>
            {matrix.totalDone}<span style={{ fontSize: "0.7em", opacity: 0.6 }}>/75</span>
          </div>
          <div className={styles.kpiSub}>Forms Done</div>
        </div>
        <div className={`${styles.kpiTile} ${styles.red}`}>
          <div className={styles.kpiVal}>{matrix.totalOverdue}</div>
          <div className={styles.kpiSub}>Overdue</div>
        </div>
        <div className={`${styles.kpiTile} ${styles.teal}`}>
          <div className={styles.kpiVal}>
            {matrix.repsComplete}<span style={{ fontSize: "0.7em", opacity: 0.6 }}>/5</span>
          </div>
          <div className={styles.kpiSub}>Reps Complete</div>
        </div>
        <div className={styles.kpiTile}>
          <div className={styles.kpiVal}>
            {matrix.formsVerified}<span style={{ fontSize: "0.7em", opacity: 0.6 }}>/15</span>
          </div>
          <div className={styles.kpiSub}>Forms Fully Verified</div>
        </div>
        <div className={styles.kpiTile}>
          <div className={styles.kpiVal} style={{ fontSize: "1rem", paddingTop: "0.2rem" }}>
            {fmt(matrix.refreshed)}
          </div>
          <div className={styles.kpiSub}>Last Refreshed</div>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.gridWrap}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.labelCol}>Competitor — Category</th>
              {reps.map((r) => <th key={r}>{r}</th>)}
              <th>Done</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map(([slug, label]) => {
              const compRows = matrix.rows.filter((r) => r.competitorSlug === slug);
              return [
                // Competitor group header
                <tr key={`grp-${slug}`} className={styles.groupRow}>
                  <td colSpan={reps.length + 2}>{label}</td>
                </tr>,
                // Form rows
                ...compRows.map((row, i) => (
                  <tr key={`${slug}-${row.category}`} className={i % 2 === 1 ? styles.rowAlt : ""}>
                    <td className={styles.formLabel}>
                      {label} — {CATEGORY_LABELS[row.category] ?? row.category}
                    </td>
                    {reps.map((rep) => (
                      <td key={rep}>
                        <CellIcon state={row.cells[rep] ?? "pending"} />
                      </td>
                    ))}
                    <td>
                      <DoneCounter done={row.doneCount} total={reps.length} />
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.cellSubmitted}>✓</span> Submitted</span>
        <span className={styles.legendItem}><span className={styles.cellSent}>📧</span> Sent — awaiting</span>
        <span className={styles.legendItem}><span className={styles.cellOverdue}>!</span> Overdue (&gt;5 weekdays)</span>
        <span className={styles.legendItem}><span className={styles.cellPending}>—</span> Not yet sent</span>
      </div>

      <div className={styles.footer}>
        <a href="/" className={styles.backLink}>← Back to Portal</a>
      </div>
    </div>
  );
}
