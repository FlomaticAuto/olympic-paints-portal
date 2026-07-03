import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-only. Never import from a Client Component.
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

// Backend project (olympic-paints-backend, bpblxplotublqsecdkcb) — where the
// forms write. Used server-side only for the admin-gated Quote Change dashboard.
// Lazily created so a missing key only breaks that one route, not the whole app.
export function backendSupabase() {
  const bUrl = process.env.BACKEND_SUPABASE_URL;
  const bKey = process.env.BACKEND_SUPABASE_SERVICE_ROLE_KEY;
  if (!bUrl || !bKey) {
    throw new Error(
      "BACKEND_SUPABASE_URL and BACKEND_SUPABASE_SERVICE_ROLE_KEY must be set for the Quote Change dashboard.",
    );
  }
  return createClient(bUrl, bKey, {
    auth: { persistSession: false },
    db: { schema: "public" },
  });
}
