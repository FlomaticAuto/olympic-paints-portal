import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// Make.com scenario 9306962 "Rep Bulk Send" — sends one message to all 5 reps at once.
// Payload: { message: string }
const BULK_WEBHOOK = "https://hook.eu2.make.com/f4egcip53inh4o4hkv3abq17e3meom4n";

// Make.com scenario 9301106 "Claude Send WhatsApp" — sends to one recipient.
// Payload: { to: string, message: string }
const SINGLE_WEBHOOK = "https://hook.eu2.make.com/og4xli5ljkagkuas1om2oragzy2xxpm2";

const ALL_REPS = ["AC", "AP", "BV", "NP", "BM"];

const REPS: Record<string, { name: string; phone: string }> = {
  AC: { name: "Aboo Cassim",      phone: "27835889057" },
  AP: { name: "Amit Patel",       phone: "27828991825" },
  BV: { name: "Bhadresh Vallabh", phone: "27826173879" },
  NP: { name: "Nikhil Panchal",   phone: "27828991826" },
  BM: { name: "Byron Minnie",     phone: "27604987117" },
};

export async function POST(req: Request) {
  await requireAdmin();

  const { message, reps } = await req.json() as { message: string; reps: string[] };

  if (!message?.trim()) {
    return new NextResponse("Message is required.", { status: 400 });
  }
  if (!Array.isArray(reps) || reps.length === 0) {
    return new NextResponse("Select at least one rep.", { status: 400 });
  }

  const trimmed = message.trim();
  const sendingAll = ALL_REPS.every((c) => reps.includes(c)) && reps.length === ALL_REPS.length;

  // If all 5 reps selected, use the dedicated bulk scenario (one call, all 5 sent in Make).
  if (sendingAll) {
    const resp = await fetch(BULK_WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return new NextResponse(`Bulk webhook error ${resp.status}: ${text.slice(0, 200)}`, { status: 502 });
    }

    const summary = ALL_REPS.map((code) => ({ code, name: REPS[code].name, ok: true }));
    return NextResponse.json(summary);
  }

  // Selective send — call the single-send hook once per selected rep.
  const results = await Promise.allSettled(
    reps.map(async (code) => {
      const rep = REPS[code];
      if (!rep) throw new Error(`Unknown rep code: ${code}`);

      const resp = await fetch(SINGLE_WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: rep.phone, message: trimmed }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`${resp.status}: ${text.slice(0, 200)}`);
      }

      return { code, name: rep.name };
    }),
  );

  const summary = results.map((r, i) => {
    const code = reps[i];
    if (r.status === "fulfilled") {
      return { code, name: REPS[code]?.name ?? code, ok: true };
    }
    return { code, name: REPS[code]?.name ?? code, ok: false, error: r.reason?.message ?? "Unknown error" };
  });

  return NextResponse.json(summary);
}
