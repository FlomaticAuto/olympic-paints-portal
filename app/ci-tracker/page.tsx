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

// form_ids keyed by competitor_slug.category
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
