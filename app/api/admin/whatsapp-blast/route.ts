import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

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

  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    return new NextResponse("WHATSAPP_WEBHOOK_URL not configured.", { status: 500 });
  }

  const results = await Promise.allSettled(
    reps.map(async (code) => {
      const rep = REPS[code];
      if (!rep) throw new Error(`Unknown rep code: ${code}`);

      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: rep.phone, message: message.trim() }),
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
