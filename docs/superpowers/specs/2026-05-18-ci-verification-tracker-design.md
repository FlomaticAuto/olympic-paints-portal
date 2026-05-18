# CI Verification Tracker — Design Spec
**Date:** 2026-05-18  
**Status:** Approved  
**Scope:** Portal page + reminder script + Supabase table + scheduler job

---

## Overview

A live dashboard in the Olympic Paints staff portal that shows which reps have completed which competitor intelligence verification forms. Paired with a daily reminder system that emails outstanding reps and sends a Telegram summary to Quintus until every form is done.

---

## Decisions Made

| Question | Decision |
|---|---|
| Primary grid layout | Competitor-first (15 rows × 5 rep columns) |
| Reminder cadence | Daily email to reps + daily Telegram nudge to Quintus |
| Hosting | Olympic Portal (`olympic-paints-portal.vercel.app/ci-tracker`) |
| Data source | Live Supabase query on page load |
| Email sent tracking | Yes — fourth cell state `📧 Sent` |
| Auth gate | Admin-only (`requireAdmin()`) |
| Reminder cutoff | None — runs every weekday until all cells are ✓ |

---

## Components

### 1. `app/ci-tracker/page.tsx` (portal repo)
Server component. Guards with `requireAdmin()`. Queries Supabase `public` schema on the server:
- `form_submissions` — which (form_id, rep_code) pairs have been submitted
- `ci_dispatch_log` — which (form_id, rep_code) pairs have been sent

Derives the full 75-cell completion matrix and passes it as props to `CiTrackerDashboard`.

Uses `supabasePublic` (new second client, see lib changes below).

### 2. `app/ci-tracker/CiTrackerDashboard.tsx` (portal repo)
Client component. Render-only — no fetching. Receives `matrix` prop.

Renders:
- **KPI strip** — 5 tiles: Forms Done (X/75), Overdue, Reps Complete (X/5), Forms Fully Verified (X/15), Last Refreshed
- **Competitor-first grid** — 15 rows grouped by competitor (5 groups with a blue group header row). Columns: form label, AC, AP, BV, NP, BM, Done/5
- **Legend** — ✓ Submitted · 📧 Sent · ! Overdue · — Not sent

### 3. `lib/supabase.ts` (portal repo) — additive change
Add a second exported client alongside the existing `supabase`:
```ts
export const supabasePublic = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: "public" },
});
```
The existing `supabase` client (portal schema) is unchanged.

### 4. Topbar nav link (portal repo)
Add `CI Tracker` nav link in `app/_components/Topbar.tsx`, admin-only, pointing to `/ci-tracker`.

### 5. `send_ci_reminders.py` (`_verification/` folder)
Replaces `send_verification_reminders.py` (archived to `.bak`).

**Daily flow:**
1. Query `ci_dispatch_log` → set of (form_id, rep_code) sent pairs
2. Query `form_submissions` → set of submitted pairs
3. Per rep: outstanding = sent − submitted
4. Send Outlook email to each rep with outstanding forms (same `reminder_email.html` template, same force-flush pattern)
5. Upsert reminder rows to `ci_dispatch_log` (kind=`'reminder'`)
6. Send one Telegram message to chat ID `8042233389` with full outstanding matrix

**Telegram message format:**
```
CI Tracker — YYYY-MM-DD
──────────────────────
AC  ✓ all done
AP  3 outstanding — Crest PVA, Excelsior Enamel, Anetic WP
BV  5 outstanding
NP  2 outstanding
BM  ! 4 OVERDUE (sent >5 days ago)
──────────────────────
Total: 14/75 done · 4 overdue
```
Script runs even when all reps are complete — sends "All 75 forms complete ✓" Telegram so you know the job ran.

**No cutoff.** Runs every weekday indefinitely until every cell is ✓.

### 6. `send_verification_emails.py` — additive change
After each successful initial send, upsert to `ci_dispatch_log` (kind=`'initial'`). This enables the `📧 Sent` state in the portal grid from day one.

### 7. Windows Task Scheduler job
- **Name:** `\Olympic Paints\CI\OlympicPaints_SendCIReminders`
- **Trigger:** Weekday 07:00 SAST
- **Action:** `python send_ci_reminders.py` from `_verification/`
- **Log dir:** `C:\Users\quint\.claude\logs\ci-reminders\`
- **Replaces:** `send_verification_reminders.py` scheduler task (disable old task after new one verified)

---

## New Supabase Table

```sql
CREATE TABLE public.ci_dispatch_log (
  id        bigint generated always as identity primary key,
  rep_code  text not null,
  form_id   uuid not null,
  sent_at   date not null,
  kind      text not null default 'initial'  -- 'initial' | 'reminder'
);
CREATE INDEX ON public.ci_dispatch_log (form_id, rep_code);
```

Written to by both `send_verification_emails.py` (initial) and `send_ci_reminders.py` (reminder).  
Read by `app/ci-tracker/page.tsx` (server component, via `supabasePublic`).

---

## Cell State Logic

For each of the 75 cells (15 forms × 5 reps):

| Condition | State | Display |
|---|---|---|
| Submission exists in `form_submissions` | Submitted | ✓ (teal) |
| No submission + dispatch exists + >5 weekdays since first send | Overdue | ! (red) |
| No submission + dispatch exists + ≤5 weekdays since first send | Sent | 📧 (yellow) |
| No submission + no dispatch | Not sent | — (grey) |

**Done/5 counter colour:**
- `5/5` → teal + ✓ suffix (fully verified)
- `3–4/5` → yellow
- `0–2/5` → grey

---

## KPI Strip Tiles

| Tile | Calculation | Colour |
|---|---|---|
| Forms Done | Count of cells with state=Submitted | Yellow border |
| Overdue | Count of cells with state=Overdue | Red border |
| Reps Complete | Count of reps where all 15 of their cells = Submitted | Teal border |
| Forms Fully Verified | Count of forms (rows) where all 5 rep cells = Submitted | Neutral border |
| Last Refreshed | Server render timestamp | Neutral border |

---

## File Locations Summary

| File | Repo / Path |
|---|---|
| `app/ci-tracker/page.tsx` | `olympic-paints-portal` |
| `app/ci-tracker/CiTrackerDashboard.tsx` | `olympic-paints-portal` |
| `app/ci-tracker/CiTracker.module.css` | `olympic-paints-portal` |
| `lib/supabase.ts` (additive) | `olympic-paints-portal` |
| `app/_components/Topbar.tsx` (additive) | `olympic-paints-portal` |
| `send_ci_reminders.py` | `_verification/` |
| `send_verification_emails.py` (additive) | `_verification/` |
| Task Scheduler registration `.ps1` | `_verification/` |

---

## Out of Scope

- Rep-level view (reps cannot see the tracker — admin-only)
- Email open/read tracking
- Automatic form re-dispatch (only reminders, no new initial sends)
- Any changes to the form schema or matchup logic
