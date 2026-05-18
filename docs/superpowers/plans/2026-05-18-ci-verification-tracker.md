# CI Verification Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live admin-only portal page at `/ci-tracker` that shows which reps have completed competitor intelligence verification forms, paired with a daily reminder script that emails outstanding reps and Telegrams Quintus.

**Architecture:** Portal server component queries Supabase `public` schema directly on load to derive a 75-cell (15 forms × 5 reps) completion matrix; a client component renders the grid. A Python script (`send_ci_reminders.py`) runs daily via Task Scheduler, sends Outlook reminders to lagging reps, logs to a new `ci_dispatch_log` Supabase table, and sends a Telegram summary.

**Tech Stack:** Next.js 16 (App Router), TypeScript, @supabase/supabase-js, CSS Modules (Barlow/Barlow Condensed fonts, existing token system); Python 3, win32com, requests, truststore, supabase-py (new dep); Windows Task Scheduler.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `lib/supabase.ts` | Add `supabasePublic` client (public schema) |
| Modify | `app/_components/Topbar.tsx` | Add CI Tracker nav link (admin-only) |
| Create | `app/ci-tracker/page.tsx` | Server component — auth gate + Supabase queries + matrix derivation |
| Create | `app/ci-tracker/CiTrackerDashboard.tsx` | Client component — KPI strip + grid render |
| Create | `app/ci-tracker/CiTracker.module.css` | Styles for the tracker page |
| Create | `_verification/send_ci_reminders.py` | Daily reminder script (replaces `send_verification_reminders.py`) |
| Modify | `_verification/send_verification_emails.py` | Log initial sends to `ci_dispatch_log` |
| Create | `_verification/register_ci_reminders_task.ps1` | Register Windows Task Scheduler job |

---

## Task 1: Create `ci_dispatch_log` Supabase table

**Files:**
- No code files — SQL run directly in Supabase dashboard

- [ ] **Step 1: Run migration SQL in Supabase**

Open the Supabase SQL editor for project `nssufmvpdtzhybcqispv` (olympic-paints-forms) and run:

```sql
CREATE TABLE public.ci_dispatch_log (
  id        bigint generated always as identity primary key,
  rep_code  text not null,
  form_id   uuid not null,
  sent_at   date not null,
  kind      text not null default 'initial'
);
CREATE INDEX ON public.ci_dispatch_log (form_id, rep_code);
```

- [ ] **Step 2: Verify table exists**

In the Supabase Table Editor, confirm `public.ci_dispatch_log` appears with columns: `id`, `rep_code`, `form_id`, `sent_at`, `kind`.

---

## Task 2: Add `supabasePublic` client

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Add the second client export**

Open `lib/supabase.ts`. It currently exports only `supabase` (portal schema). Add `supabasePublic` after the existing client:

```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.",
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: "portal" },
});

export const supabasePublic = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: "public" },
});
```

- [ ] **Step 2: Verify build still passes**

```bash
cd C:\Users\quint\olympic-paints-portal
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add supabasePublic client for public schema queries"
```

---

## Task 3: Add CI Tracker nav link to Topbar

**Files:**
- Modify: `app/_components/Topbar.tsx`

- [ ] **Step 1: Add the nav link**

`Topbar.tsx` currently renders an `Admin` link when `isAdmin` is true. Add a `CI Tracker` link alongside it:

```tsx
import ThemeToggle from "./ThemeToggle";

export default function Topbar({
  fullName,
  isAdmin,
}: {
  fullName?: string;
  isAdmin?: boolean;
}) {
  return (
    <header className="topbar-slim">
      <ThemeToggle />
      <div className="topbar-slim-user">
        <span className="user-name">{fullName ?? "Signed in"}</span>
        {isAdmin && <a href="/ci-tracker">CI Tracker</a>}
        {isAdmin && <a href="/admin">Admin</a>}
        <form method="POST" action="/api/logout">
          <button type="submit" className="linkish">Sign out</button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/_components/Topbar.tsx
git commit -m "feat: add CI Tracker nav link to topbar (admin-only)"
```

---

## Task 4: Create CSS module for CI Tracker

**Files:**
- Create: `app/ci-tracker/CiTracker.module.css`

- [ ] **Step 1: Create the CSS file**

```css
/* ── CI Verification Tracker ─────────────────────────────────── */

.root {
  min-height: 100vh;
  background: var(--color-surface-page);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  padding-bottom: 3rem;
}

/* ── Page header ─────────────────────────────────────────────── */
.header {
  padding: 1.25rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.title {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 1.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-primary);
  margin: 0 0 4px;
  line-height: 1;
}

.subtitle {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* ── KPI Strip ───────────────────────────────────────────────── */
.kpiStrip {
  display: flex;
  gap: 12px;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-wrap: wrap;
}

.kpiTile {
  flex: 1;
  min-width: 120px;
  background: var(--color-surface-base);
  border: 1px solid var(--color-border-default);
  border-radius: var(--r-md);
  padding: 0.75rem 1rem;
  text-align: center;
}

.kpiTile.yellow { border-color: rgba(245,196,0,0.4); }
.kpiTile.red    { border-color: rgba(232,96,96,0.4); }
.kpiTile.teal   { border-color: rgba(45,140,122,0.4); }

.kpiVal {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--color-text-primary);
}
.kpiTile.yellow .kpiVal { color: var(--color-brand-primary); }
.kpiTile.red    .kpiVal { color: var(--_coral, #E86060); }
.kpiTile.teal   .kpiVal { color: var(--_teal, #2D8C7A); }

.kpiSub {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  margin-top: 4px;
}

/* ── Grid ────────────────────────────────────────────────────── */
.gridWrap {
  overflow-x: auto;
  margin: 1rem 1.5rem 0;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--r-md);
}

.grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.grid th {
  padding: 0.6rem 0.75rem;
  background: var(--color-surface-secondary);
  color: var(--color-brand-primary);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.65rem;
  white-space: nowrap;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,0.10);
}

.grid th.labelCol {
  text-align: left;
  min-width: 180px;
}

.grid td {
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid var(--color-border-subtle);
  text-align: center;
  vertical-align: middle;
}

.grid tr:last-child td { border-bottom: none; }

/* Competitor group header row */
.groupRow td {
  background: rgba(45,107,168,0.12);
  color: var(--_n300, #6B9ED0);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.3rem 0.75rem;
  text-align: left;
}

.formLabel {
  text-align: left;
  color: var(--color-text-primary);
  font-size: 0.8rem;
}

/* Alternating row background */
.rowAlt td { background: var(--color-surface-overlay); }

/* Done/5 counter */
.doneCounter {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.88rem;
  white-space: nowrap;
}
.doneCounter.full  { color: var(--_teal, #2D8C7A); }
.doneCounter.mid   { color: var(--color-brand-primary); }
.doneCounter.low   { color: var(--color-text-tertiary); }

/* Cell state indicators */
.cellSubmitted { color: var(--_teal, #2D8C7A); font-size: 1rem; font-weight: 700; }
.cellSent      { color: var(--color-brand-primary); font-size: 0.85rem; }
.cellOverdue   { color: var(--_coral, #E86060); font-size: 0.85rem; font-weight: 700; }
.cellPending   { color: var(--color-text-tertiary); font-size: 1rem; }

/* ── Legend ──────────────────────────────────────────────────── */
.legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 0.75rem 1.5rem;
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  border-top: 1px solid var(--color-border-subtle);
  margin-top: 0.5rem;
}

.legendItem { display: flex; align-items: center; gap: 0.4rem; }

/* ── Footer ──────────────────────────────────────────────────── */
.footer {
  padding: 1rem 1.5rem 0;
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  text-align: right;
}

.backLink {
  color: var(--color-brand-primary);
  text-decoration: none;
}
.backLink:hover { text-decoration: underline; }

/* ── Mobile ──────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .kpiStrip { gap: 8px; padding: 0.75rem 1rem; }
  .kpiTile  { min-width: 90px; padding: 0.6rem 0.5rem; }
  .kpiVal   { font-size: 1.4rem; }
  .gridWrap { margin: 0.75rem 0.5rem 0; }
  .legend   { padding: 0.5rem 1rem; gap: 1rem; }
}
```

- [ ] **Step 2: No test needed — CSS only. Commit.**

```bash
git add app/ci-tracker/CiTracker.module.css
git commit -m "feat: add CiTracker CSS module"
```

---

## Task 5: Create the server component (`page.tsx`)

**Files:**
- Create: `app/ci-tracker/page.tsx`

This component queries Supabase and derives the full matrix, then passes it as props. All logic lives here — the client component is render-only.

- [ ] **Step 1: Create `app/ci-tracker/page.tsx`**

```tsx
import { requireAdmin } from "@/lib/auth";
import { supabasePublic } from "@/lib/supabase";
import Topbar from "@/app/_components/Topbar";
import CiTrackerDashboard from "./CiTrackerDashboard";

export const dynamic = "force-dynamic";

// 5 competitors × 3 categories = 15 forms, 5 reps = 75 cells
const COMPETITORS = [
  { slug: "africa_paints", label: "Africa Paints" },
  { slug: "anetic",        label: "Anetic" },
  { slug: "crest",         label: "Crest" },
  { slug: "excelsior",     label: "Excelsior" },
  { slug: "golden_choice", label: "Golden Choice" },
] as const;

const CATEGORIES = ["enamel", "pva", "waterproofing"] as const;

const REPS = ["AC", "AP", "BV", "NP", "BM"] as const;

// form_ids keyed by competitor_slug.category — baked in so the page
// doesn't need a filesystem read. Update if forms are ever rebuilt.
const FORM_IDS: Record<string, Record<string, string>> = {
  africa_paints: {
    enamel:         "549bfd97-4afd-44e9-b811-a1a1aa90cc4b",
    pva:            "32a6f4cb-324f-4e45-9f29-68b9986d6354",
    waterproofing:  "a959fd88-bc10-4a66-ac6f-a2a997a80933",
  },
  anetic: {
    enamel:         "7f07b40a-8a55-4ee8-a681-391a130e930d",
    pva:            "7869bad9-9076-47f2-a633-efc4078081fc",
    waterproofing:  "1fcb8c0a-eb5d-4628-9009-7542741b6624",
  },
  crest: {
    enamel:         "e4b0737f-b0ea-4330-ae9f-f67926f1764a",
    pva:            "348b1b21-8c63-4864-8046-9967517f3a56",
    waterproofing:  "a69d910e-2363-4591-800c-d2b8bb9afbd9",
  },
  excelsior: {
    enamel:         "758273cf-af2c-42ca-a9a3-63d7ec7c04b4",
    pva:            "8eeb4161-94b4-44dd-b8ff-c6dc5d08c4b5",
    waterproofing:  "dddf5d46-99e9-4516-b245-ca615637a494",
  },
  golden_choice: {
    enamel:         "7481ad9a-26c7-4cb9-893e-2bb82b196d0f",
    pva:            "b26ae681-be54-4cf8-ac6a-290998c8c22d",
    waterproofing:  "b810aad2-5c25-408d-bfb4-4a8ffb42d739",
  },
};

export type CellState = "submitted" | "overdue" | "sent" | "pending";

export type FormRow = {
  competitorSlug: string;
  competitorLabel: string;
  category: string;
  cells: Record<string, CellState>; // keyed by rep_code
  doneCount: number;                 // 0-5
};

export type CiMatrix = {
  rows: FormRow[];
  totalDone: number;
  totalOverdue: number;
  repsComplete: number;
  formsVerified: number;
  refreshed: string; // ISO datetime
};

function weekdaysBetween(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export default async function CiTrackerPage() {
  const s = await requireAdmin();

  const now = new Date();

  // 1. Fetch all submissions across all 15 forms
  const { data: subs } = await supabasePublic
    .from("form_submissions")
    .select("form_id, metadata")
    .in(
      "form_id",
      Object.values(FORM_IDS).flatMap((cats) => Object.values(cats)),
    );

  // submitted set: "form_id:rep_code"
  const submittedSet = new Set<string>();
  for (const sub of subs ?? []) {
    const rep = (sub.metadata as Record<string, string> | null)?.rep_code;
    if (rep) submittedSet.add(`${sub.form_id}:${rep}`);
  }

  // 2. Fetch all dispatch log entries
  const { data: dispatches } = await supabasePublic
    .from("ci_dispatch_log")
    .select("form_id, rep_code, sent_at, kind");

  // earliest dispatch per "form_id:rep_code"
  const firstSentMap = new Map<string, Date>();
  for (const d of dispatches ?? []) {
    const key = `${d.form_id}:${d.rep_code}`;
    const dt = new Date(d.sent_at);
    const existing = firstSentMap.get(key);
    if (!existing || dt < existing) firstSentMap.set(key, dt);
  }

  // 3. Derive matrix
  const rows: FormRow[] = [];

  for (const comp of COMPETITORS) {
    for (const cat of CATEGORIES) {
      const formId = FORM_IDS[comp.slug][cat];
      const cells: Record<string, CellState> = {};
      let doneCount = 0;

      for (const rep of REPS) {
        const key = `${formId}:${rep}`;
        if (submittedSet.has(key)) {
          cells[rep] = "submitted";
          doneCount++;
        } else {
          const firstSent = firstSentMap.get(key);
          if (!firstSent) {
            cells[rep] = "pending";
          } else if (weekdaysBetween(firstSent, now) > 5) {
            cells[rep] = "overdue";
          } else {
            cells[rep] = "sent";
          }
        }
      }

      rows.push({
        competitorSlug: comp.slug,
        competitorLabel: comp.label,
        category: cat,
        cells,
        doneCount,
      });
    }
  }

  // 4. Aggregate KPIs
  const totalDone    = rows.reduce((s, r) => s + r.doneCount, 0);
  const totalOverdue = rows.reduce(
    (s, r) => s + Object.values(r.cells).filter((c) => c === "overdue").length,
    0,
  );
  const repsComplete = REPS.filter((rep) =>
    rows.every((r) => r.cells[rep] === "submitted"),
  ).length;
  const formsVerified = rows.filter((r) => r.doneCount === 5).length;

  const matrix: CiMatrix = {
    rows,
    totalDone,
    totalOverdue,
    repsComplete,
    formsVerified,
    refreshed: now.toISOString(),
  };

  return (
    <>
      <Topbar fullName={s.fullName} isAdmin={!!s.isAdmin} />
      <CiTrackerDashboard matrix={matrix} reps={[...REPS]} />
    </>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build completes. The page will 404 until `CiTrackerDashboard.tsx` is created — that's fine, proceed to next task.

- [ ] **Step 3: Commit**

```bash
git add app/ci-tracker/page.tsx
git commit -m "feat: add ci-tracker server component with Supabase matrix derivation"
```

---

## Task 6: Create the client component (`CiTrackerDashboard.tsx`)

**Files:**
- Create: `app/ci-tracker/CiTrackerDashboard.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Test locally**

```bash
npm run dev
```

Open http://localhost:3000/ci-tracker — confirm the page loads (may show 0 data if Supabase has no submissions yet — that's fine). Confirm the KPI strip renders 5 tiles and the grid shows 15 rows grouped under 5 competitor headers.

- [ ] **Step 4: Commit**

```bash
git add app/ci-tracker/CiTrackerDashboard.tsx
git commit -m "feat: add CiTrackerDashboard client component"
```

---

## Task 7: Update `send_verification_emails.py` to log to `ci_dispatch_log`

**Files:**
- Modify: `3.Resources/17. Strategic Intelligence/_verification/send_verification_emails.py`

- [ ] **Step 1: Read the current file**

Open `send_verification_emails.py` and find the section that calls `send_one()` or logs to `dispatch_log.json`. Identify where a successful send is confirmed.

- [ ] **Step 2: Add supabase-py dependency**

In the `_verification/` folder, check if `supabase` is already installed:

```powershell
python -c "import supabase; print(supabase.__version__)"
```

If not installed:
```powershell
pip install supabase
```

- [ ] **Step 3: Add `log_dispatch_to_supabase()` helper**

Add this function near the top of `send_verification_emails.py`, after the existing imports and constants:

```python
import supabase as _sb

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def log_dispatch_to_supabase(rep_code: str, form_id: str, sent_at: str, kind: str = "initial") -> None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("  WARN: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping Supabase log")
        return
    try:
        client = _sb.create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        client.table("ci_dispatch_log").insert({
            "rep_code": rep_code,
            "form_id": form_id,
            "sent_at": sent_at,
            "kind": kind,
        }).execute()
    except Exception as e:
        print(f"  WARN: ci_dispatch_log insert failed: {e}")
```

- [ ] **Step 4: Call `log_dispatch_to_supabase()` after each successful send**

Find the loop where emails are sent to reps. After the `send_one()` call (and before appending to the local `dispatch_log.json`), add:

```python
for slug, label, day, form_id in items_for_this_rep:
    log_dispatch_to_supabase(rep_code, form_id, today.isoformat(), kind="initial")
```

Note: `items_for_this_rep` is the list of `(slug, label, day, form_id)` tuples already being iterated to build the email links. Adapt variable names to match the actual loop in the file.

- [ ] **Step 5: Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `_verification/.env`**

Open `3.Resources/17. Strategic Intelligence/_verification/.env`. Add:

```
SUPABASE_URL=https://nssufmvpdtzhybcqispv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase dashboard → Settings → API → service_role key>
```

- [ ] **Step 6: Test with dry-run**

```powershell
cd "c:\Users\quint\OneDrive\1.Projects\1.Olympic Paints\3.Resources\17. Strategic Intelligence\_verification"
python send_verification_emails.py --dry-run
```

Expected: Sends test emails to `quintusl@`, logs entries to `ci_dispatch_log` in Supabase. Verify in Supabase Table Editor that rows appear in `public.ci_dispatch_log`.

- [ ] **Step 7: Commit**

```bash
git add "3.Resources/17. Strategic Intelligence/_verification/send_verification_emails.py"
git commit -m "feat: log initial sends to ci_dispatch_log in Supabase"
```

---

## Task 8: Create `send_ci_reminders.py`

**Files:**
- Create: `3.Resources/17. Strategic Intelligence/_verification/send_ci_reminders.py`

This replaces `send_verification_reminders.py`. It reads from Supabase instead of the local dispatch log, and adds a Telegram summary.

- [ ] **Step 1: Create the script**

```python
"""
Daily weekday reminder script for CI verification forms.

For each rep with outstanding forms (sent but not submitted):
  - Sends an Outlook reminder email
  - Logs the reminder to ci_dispatch_log in Supabase

After processing all reps, sends one Telegram message to Quintus
summarising the full outstanding matrix.

No cutoff — runs every weekday until all 75 forms are submitted.

Usage:
  python send_ci_reminders.py
  python send_ci_reminders.py --dry-run    # emails only to quintusl@
  python send_ci_reminders.py --force      # run even on weekends
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

import requests
import supabase as _sb
import truststore
import win32com.client

truststore.inject_into_ssl()

REPO_ROOT = Path(r"c:\Users\quint\OneDrive\1.Projects\1.Olympic Paints")
VF_DIR    = REPO_ROOT / "3.Resources" / "17. Strategic Intelligence" / "_verification"
TEMPLATES_DIR = VF_DIR / "templates"
CONFIG_DIR    = VF_DIR / "config"

FORMS_PUBLIC_BASE = "https://olympic-paints-forms-admin.vercel.app/f"
TELEGRAM_CHAT_ID  = "8042233389"

COMPETITORS = [
    ("africa_paints",  "Africa Paints"),
    ("anetic",         "Anetic"),
    ("crest",          "Crest"),
    ("excelsior",      "Excelsior"),
    ("golden_choice",  "Golden Choice"),
]
CATEGORIES = ["enamel", "pva", "waterproofing"]

FORM_IDS: dict[str, dict[str, str]] = {
    "africa_paints": {
        "enamel":        "549bfd97-4afd-44e9-b811-a1a1aa90cc4b",
        "pva":           "32a6f4cb-324f-4e45-9f29-68b9986d6354",
        "waterproofing": "a959fd88-bc10-4a66-ac6f-a2a997a80933",
    },
    "anetic": {
        "enamel":        "7f07b40a-8a55-4ee8-a681-391a130e930d",
        "pva":           "7869bad9-9076-47f2-a633-efc4078081fc",
        "waterproofing": "1fcb8c0a-eb5d-4628-9009-7542741b6624",
    },
    "crest": {
        "enamel":        "e4b0737f-b0ea-4330-ae9f-f67926f1764a",
        "pva":           "348b1b21-8c63-4864-8046-9967517f3a56",
        "waterproofing": "a69d910e-2363-4591-800c-d2b8bb9afbd9",
    },
    "excelsior": {
        "enamel":        "758273cf-af2c-42ca-a9a3-63d7ec7c04b4",
        "pva":           "8eeb4161-94b4-44dd-b8ff-c6dc5d08c4b5",
        "waterproofing": "dddf5d46-99e9-4516-b245-ca615637a494",
    },
    "golden_choice": {
        "enamel":        "7481ad9a-26c7-4cb9-893e-2bb82b196d0f",
        "pva":           "b26ae681-be54-4cf8-ac6a-290998c8c22d",
        "waterproofing": "b810aad2-5c25-408d-bfb4-4a8ffb42d739",
    },
}

ALL_FORM_IDS = [fid for cats in FORM_IDS.values() for fid in cats.values()]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    env_path = VF_DIR / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    env.update({k: v for k, v in os.environ.items() if k not in env})
    return env


def weekdays_between(start: date, end: date) -> int:
    count = 0
    d = start + timedelta(days=1)
    while d <= end:
        if d.weekday() < 5:
            count += 1
        d += timedelta(days=1)
    return count


def get_submitted_set(sb) -> set[tuple[str, str]]:
    """Returns set of (form_id, rep_code) that have been submitted."""
    resp = sb.table("form_submissions").select("form_id, metadata").in_("form_id", ALL_FORM_IDS).execute()
    result = set()
    for row in resp.data or []:
        rep = (row.get("metadata") or {}).get("rep_code", "")
        if rep:
            result.add((row["form_id"], rep))
    return result


def get_sent_set(sb) -> set[tuple[str, str]]:
    """Returns set of (form_id, rep_code) that have been dispatched."""
    resp = sb.table("ci_dispatch_log").select("form_id, rep_code").execute()
    return {(r["form_id"], r["rep_code"]) for r in resp.data or []}


def get_first_sent_map(sb) -> dict[tuple[str, str], date]:
    """Returns earliest sent_at per (form_id, rep_code)."""
    resp = sb.table("ci_dispatch_log").select("form_id, rep_code, sent_at").execute()
    result: dict[tuple[str, str], date] = {}
    for r in resp.data or []:
        key = (r["form_id"], r["rep_code"])
        dt = date.fromisoformat(r["sent_at"])
        if key not in result or dt < result[key]:
            result[key] = dt
    return result


def build_link(form_id: str, rep_code: str, rep_email: str, competitor: str, category: str) -> str:
    params = urllib.parse.urlencode({
        "rep": rep_code, "email": rep_email,
        "competitor": competitor, "category": category,
    })
    return f"{FORMS_PUBLIC_BASE}/{form_id}?{params}"


def render_links_html(items: list[tuple[str, str, str, str]], rep_code: str, rep_email: str) -> str:
    parts = []
    for slug, label, cat, form_id in items:
        url = build_link(form_id, rep_code, rep_email, slug, cat)
        parts.append(
            f'<a class="link-row" href="{url}">'
            f'<strong>{label} &mdash; {cat.title()}</strong>'
            f'<span class="sub">Open form &rarr;</span>'
            f'</a>'
        )
    return "\n".join(parts)


def send_one(outlook, to_email: str, cc_email: str, subject: str, html_body: str) -> None:
    mail = outlook.CreateItem(0)
    mail.To = to_email
    if cc_email:
        mail.CC = cc_email
    mail.Subject = subject
    mail.HTMLBody = html_body
    mail.Send()


def force_flush(outlook_app) -> None:
    ns = outlook_app.GetNamespace("MAPI")
    outbox = ns.GetDefaultFolder(4)
    for item in list(outbox.Items):
        try:
            item.Send()
        except Exception as e:
            print(f"  flush skip: {e}")
    time.sleep(2)


def send_telegram(bot_token: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}, timeout=15)


def build_telegram_summary(
    reps_cfg: dict,
    outstanding: dict[str, list],
    submitted_set: set[tuple[str, str]],
    first_sent_map: dict[tuple[str, str], date],
    today: date,
) -> str:
    total_done = sum(
        1 for slug, cats in FORM_IDS.items()
        for cat, fid in cats.items()
        for rep in reps_cfg["reps"]
        if (fid, rep) in submitted_set
    )
    total_overdue = sum(
        1 for slug, cats in FORM_IDS.items()
        for cat, fid in cats.items()
        for rep in reps_cfg["reps"]
        if (fid, rep) not in submitted_set
        and (fid, rep) in first_sent_map
        and weekdays_between(first_sent_map[(fid, rep)], today) > 5
    )

    lines = [f"<b>CI Tracker — {today.isoformat()}</b>", "──────────────────────"]
    for code, rep in reps_cfg["reps"].items():
        items = outstanding.get(code, [])
        overdue_count = sum(
            1 for _, _, _, fid in items
            if (fid, code) in first_sent_map
            and weekdays_between(first_sent_map[(fid, code)], today) > 5
        )
        if not items:
            lines.append(f"{code}  ✓ all done")
        elif overdue_count:
            lines.append(f"{code}  ! {overdue_count} OVERDUE · {len(items)} total outstanding")
        else:
            names = ", ".join(f"{label} {cat.title()}" for _, label, cat, _ in items[:3])
            suffix = f" +{len(items)-3} more" if len(items) > 3 else ""
            lines.append(f"{code}  {len(items)} outstanding — {names}{suffix}")

    lines.append("──────────────────────")
    lines.append(f"Total: {total_done}/75 done · {total_overdue} overdue")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    today = date.today()
    if today.weekday() >= 5 and not args.force:
        print(f"Today is {today.strftime('%A')} — skipping (use --force to override)")
        return

    env = load_env()
    sb_url = env.get("SUPABASE_URL", "")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bot_token_path = Path(r"c:\Users\quint\OneDrive\1.Projects\PULSE — Sales & Ops Manager\.env")
    bot_token = ""
    if bot_token_path.exists():
        for line in bot_token_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("TELEGRAM_BOT_TOKEN="):
                bot_token = line.split("=", 1)[1].strip()

    if not sb_url or not sb_key:
        sys.exit("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")

    sb = _sb.create_client(sb_url, sb_key)
    reps_cfg = json.loads((CONFIG_DIR / "rep_emails.json").read_text(encoding="utf-8"))
    template = (TEMPLATES_DIR / "reminder_email.html").read_text(encoding="utf-8")

    submitted_set = get_submitted_set(sb)
    sent_set      = get_sent_set(sb)
    first_sent_map = get_first_sent_map(sb)

    # Outstanding = sent but not submitted
    outstanding: dict[str, list[tuple[str, str, str, str]]] = defaultdict(list)
    for rep_code in reps_cfg["reps"]:
        for slug, label in COMPETITORS:
            for cat in CATEGORIES:
                form_id = FORM_IDS[slug][cat]
                if (form_id, rep_code) in sent_set and (form_id, rep_code) not in submitted_set:
                    outstanding[rep_code].append((slug, label, cat, form_id))

    reps_to_remind = [(code, rep) for code, rep in reps_cfg["reps"].items() if outstanding.get(code)]

    if not reps_to_remind:
        print("All reps done (or nothing sent yet) — sending Telegram confirmation")
        if bot_token:
            send_telegram(bot_token, f"CI Tracker — {today.isoformat()}\nAll 75 forms complete ✓")
        return

    print(f"Reps to remind: {[c for c, _ in reps_to_remind]}")
    outlook = win32com.client.Dispatch("Outlook.Application")

    for code, rep in reps_to_remind:
        items = outstanding[code]
        target = "quintusl@olympicpaints.co.za" if args.dry_run else rep["email"]
        cc     = "" if args.dry_run else "quintusl@olympicpaints.co.za"
        first_name = rep["name"].split()[0]
        links_html = render_links_html(items, code, rep["email"])

        html_body = (template
                     .replace("{{rep_first_name}}", first_name)
                     .replace("{{date}}", today.isoformat())
                     .replace("{{outstanding_count}}", str(len(items)))
                     .replace("{{links}}", links_html))

        send_one(outlook, to_email=target, cc_email=cc,
                 subject=f"[Olympic] Reminder: {len(items)} CI form(s) outstanding",
                 html_body=html_body)

        # Log to Supabase
        for _, _, cat, form_id in items:
            try:
                sb.table("ci_dispatch_log").insert({
                    "rep_code": code,
                    "form_id":  form_id,
                    "sent_at":  today.isoformat(),
                    "kind":     "reminder",
                }).execute()
            except Exception as e:
                print(f"  WARN log reminder {code}/{form_id}: {e}")

        print(f"  reminded → {rep['name']} ({code}): {len(items)} outstanding")

    force_flush(outlook)
    print("Force-flushed Outbox.")

    # Telegram summary
    if bot_token:
        summary = build_telegram_summary(reps_cfg, outstanding, submitted_set, first_sent_map, today)
        send_telegram(bot_token, summary)
        print("Telegram summary sent.")
    else:
        print("WARN: TELEGRAM_BOT_TOKEN not found — skipping Telegram")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test with dry-run**

```powershell
cd "c:\Users\quint\OneDrive\1.Projects\1.Olympic Paints\3.Resources\17. Strategic Intelligence\_verification"
python send_ci_reminders.py --dry-run --force
```

Expected: Connects to Supabase, identifies outstanding forms (if any), sends email to `quintusl@`, sends Telegram summary. No errors.

- [ ] **Step 3: Archive old script**

```powershell
Rename-Item "send_verification_reminders.py" "send_verification_reminders.py.bak"
```

- [ ] **Step 4: Commit**

```bash
git add "3.Resources/17. Strategic Intelligence/_verification/send_ci_reminders.py"
git commit -m "feat: add send_ci_reminders.py (replaces send_verification_reminders.py)"
```

---

## Task 9: Register Windows Task Scheduler job

**Files:**
- Create: `3.Resources/17. Strategic Intelligence/_verification/register_ci_reminders_task.ps1`

- [ ] **Step 1: Create the registration script**

```powershell
# register_ci_reminders_task.ps1
# Run once as administrator to register the CI reminders scheduler job.
# Logs go to C:\Users\quint\.claude\logs\ci-reminders\

$logDir  = "C:\Users\quint\.claude\logs\ci-reminders"
$logFile = "$logDir\ci_reminders.log"
$script  = "c:\Users\quint\OneDrive\1.Projects\1.Olympic Paints\3.Resources\17. Strategic Intelligence\_verification\send_ci_reminders.py"

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force $logDir | Out-Null }

$action  = New-ScheduledTaskAction `
    -Execute "python" `
    -Argument "`"$script`" >> `"$logFile`" 2>&1"

# Mon-Fri at 07:00
$trigger = New-ScheduledTaskTrigger -Weekly `
    -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday `
    -At "07:00"

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName "OlympicPaints_SendCIReminders" `
    -TaskPath "\Olympic Paints\CI\" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Registered: \Olympic Paints\CI\OlympicPaints_SendCIReminders"
Write-Host "Logs: $logFile"
```

- [ ] **Step 2: Run the registration script**

Open PowerShell as administrator and run:

```powershell
cd "c:\Users\quint\OneDrive\1.Projects\1.Olympic Paints\3.Resources\17. Strategic Intelligence\_verification"
.\register_ci_reminders_task.ps1
```

Expected output:
```
Registered: \Olympic Paints\CI\OlympicPaints_SendCIReminders
Logs: C:\Users\quint\.claude\logs\ci-reminders\ci_reminders.log
```

- [ ] **Step 3: Verify the task appears in Task Scheduler**

```powershell
schtasks /query /tn "\Olympic Paints\CI\OlympicPaints_SendCIReminders"
```

Expected: Task listed with `Ready` status.

- [ ] **Step 4: Disable the old reminder task**

```powershell
# Find the old task name first:
schtasks /query /fo LIST | Select-String "SendCIReminders\|SendVerification"
# Then disable it (replace with actual old task name):
schtasks /change /tn "\Olympic Paints\OlympicPaints_SendVerificationReminders" /disable
```

- [ ] **Step 5: Commit**

```bash
git add "3.Resources/17. Strategic Intelligence/_verification/register_ci_reminders_task.ps1"
git commit -m "feat: add Task Scheduler registration script for CI reminders"
```

---

## Task 10: Deploy portal to Vercel and verify end-to-end

- [ ] **Step 1: Push portal changes to GitHub**

```bash
cd C:\Users\quint\olympic-paints-portal
git push
```

- [ ] **Step 2: Verify Vercel deployment**

Wait ~2 minutes, then check https://vercel.com/flomaticautos-projects/olympic-paints-portal for a green deployment. Or run:

```bash
gh run list --repo FlomaticAuto/olympic-paints-portal --limit 3
```

- [ ] **Step 3: Test the live page**

Open https://olympic-paints-portal.vercel.app/ci-tracker and confirm:
- Redirects to `/login` if not authenticated
- After login as admin, renders the CI Tracker page
- KPI strip shows 5 tiles
- Grid shows 15 rows grouped under 5 competitor headers
- CI Tracker link appears in topbar

- [ ] **Step 4: Run reminder script once manually to seed `ci_dispatch_log`**

If enamel forms have been sent already (check `dispatch_log.json` — entries with `"day": "enamel"`), backfill by running:

```powershell
cd "c:\Users\quint\OneDrive\1.Projects\1.Olympic Paints\3.Resources\17. Strategic Intelligence\_verification"
python send_ci_reminders.py --force --dry-run
```

Then reload `/ci-tracker` and verify that previously-sent forms now show `📧` (sent) instead of `—` (pending).

---

## Self-Review Notes

- All 8 files in the File Map have corresponding tasks.
- `FORM_IDS` constant is duplicated between `page.tsx` and `send_ci_reminders.py` — this is intentional: the portal can't read Python files, and the script can't import TypeScript. Both are authoritative copies of the same static data; update both if forms are ever rebuilt.
- `supabase-py` is a new Python dependency not currently in `_verification/`. Task 7 Step 2 installs it.
- The `ci_dispatch_log` backfill from existing `dispatch_log.json` is not automated — Task 10 Step 4 handles this with a manual dry-run trigger.
- Type `CellState` and `CiMatrix` are exported from `page.tsx` and imported by `CiTrackerDashboard.tsx` — consistent across tasks 5 and 6.
