import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Admin-only Quote & Price Change Tracker. The dashboard HTML is rendered by
// /quote-changes/dashboard (server-side, admin-gated) and shown in an iframe,
// so the sensitive rep/customer data never sits on a public URL.
export default async function QuoteChangesPage() {
  await requireAdmin();
  return (
    <iframe
      src="/quote-changes/dashboard"
      title="Quote & Price Change Tracker"
      style={{ border: 0, width: "100%", height: "100dvh", display: "block" }}
    />
  );
}
