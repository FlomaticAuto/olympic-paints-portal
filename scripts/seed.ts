/**
 * One-shot seed for the Olympic Paints portal.
 *
 * Usage:
 *   cp .env.example .env.local && fill in values
 *   npm run seed
 *
 * Idempotent: existing rows (matched by username/slug) are left alone;
 * only missing ones are inserted. Passwords are NOT regenerated for
 * users who already exist — use the admin console "Reset password"
 * button (or `npm run reset-password <username>`) for that.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env if .env.local missing
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}
const sb = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: "portal" },
});

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function tempPassword(len = 14) {
  const b = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return s;
}

const USERS = [
  { username: "quintus",   full_name: "Quintus Lategan",   email: "quintusl@olympicpaints.co.za", is_admin: true,  icon: "QL" },
  { username: "AC",        full_name: "Aboo Cassim",        email: null,                            is_admin: false, icon: "AC" },
  { username: "AP",        full_name: "Amit Patel",         email: null,                            is_admin: false, icon: "AP" },
  { username: "BV",        full_name: "Bhadresh Vallabh",   email: null,                            is_admin: false, icon: "BV" },
  { username: "NP",        full_name: "Nikhil Panchal",     email: null,                            is_admin: false, icon: "NP" },
  { username: "BM",        full_name: "Byron Minnie",       email: null,                            is_admin: false, icon: "BM" },
  { username: "kishan",    full_name: "Kishan",             email: null,                            is_admin: false, icon: "KI" },
  { username: "shital",    full_name: "Shital",             email: "accounts@olympicpaints.co.za",  is_admin: false, icon: "SH" },
  { username: "emeshnee",  full_name: "Emeshnee",           email: null,                            is_admin: false, icon: "EM" },
  { username: "aziza",     full_name: "Aziza",              email: "orders@olympicpaints.co.za",    is_admin: false, icon: "AZ" },
  { username: "demona",    full_name: "Demona",             email: "sales@olympicpaints.co.za",     is_admin: false, icon: "DM" },
  { username: "sejal",     full_name: "Sejal",              email: "sejalp@olympicpaints.co.za",    is_admin: false, icon: "SJ" },
  { username: "prateek",   full_name: "Prateek",            email: "prateek@olympicpaints.co.za",   is_admin: false, icon: "PR" },
];

const DASHBOARDS = [
  { slug: "kpi",                name: "KPI Sales Dashboard",   description: "Weekly MTD sales, targets, rep performance",   upstream_url: "https://flomaticauto.github.io/olympic-paints-kpi/",                  icon: "K",  sort_order: 10 },
  { slug: "haven-clocking",     name: "HAVEN Clocking",        description: "Daily attendance, hours, missed clock-outs",   upstream_url: "https://flomaticauto.github.io/olympic-paints-clocking/",            icon: "H",  sort_order: 20 },
  { slug: "pulse-leaderboard",  name: "PULSE Leaderboard",     description: "Daily sales-rep activity leaderboard",          upstream_url: "https://flomaticauto.github.io/olympic-paints-pulse/",                icon: "P",  sort_order: 30 },
  { slug: "ecommerce",          name: "E-Commerce",            description: "WooCommerce orders and conversion",             upstream_url: "https://flomaticauto.github.io/olympic-paints-ecommerce/",            icon: "E",  sort_order: 40 },
  { slug: "merchandising",      name: "Merchandising",         description: "Same-month YoY impact of merchandiser visits",  upstream_url: "https://flomaticauto.github.io/olympic-paints-merchandising/",        icon: "M",  sort_order: 50 },
  { slug: "store-health",       name: "Store Health",          description: "Account-level visit cadence and risk",          upstream_url: "https://flomaticauto.github.io/olympic-paints-store-health/",         icon: "S",  sort_order: 60 },
  { slug: "cso-insights",       name: "CSO Insights",          description: "Strategic intelligence and weekly insights",    upstream_url: "https://flomaticauto.github.io/olympic-paints-cso-insights/",         icon: "C",  sort_order: 70 },
];

async function main() {
  console.log("\n=== Olympic Paints Portal — seed ===\n");

  // Users
  const newPasswords: { username: string; tmp: string }[] = [];
  for (const u of USERS) {
    const { data: existing } = await sb.from("users").select("id").eq("username", u.username).maybeSingle();
    if (existing) {
      console.log(`  user '${u.username}' already exists — skipping`);
      continue;
    }
    const tmp = tempPassword();
    const password_hash = await bcrypt.hash(tmp, 12);
    const { error } = await sb.from("users").insert({
      username: u.username, full_name: u.full_name, email: u.email,
      is_admin: u.is_admin, password_hash, must_change_pw: true,
    });
    if (error) {
      console.error(`  user '${u.username}' FAILED:`, error.message);
      continue;
    }
    newPasswords.push({ username: u.username, tmp });
    console.log(`  user '${u.username}' created`);
  }

  // Dashboards
  for (const d of DASHBOARDS) {
    const { data: existing } = await sb.from("dashboards").select("id").eq("slug", d.slug).maybeSingle();
    if (existing) {
      console.log(`  dashboard '${d.slug}' already exists — skipping`);
      continue;
    }
    const { error } = await sb.from("dashboards").insert(d);
    if (error) console.error(`  dashboard '${d.slug}' FAILED:`, error.message);
    else console.log(`  dashboard '${d.slug}' created`);
  }

  // Grant the admin access to every dashboard
  const { data: admin } = await sb.from("users").select("id").eq("username", "quintus").single();
  const { data: dashes } = await sb.from("dashboards").select("id");
  if (admin && dashes) {
    for (const d of dashes) {
      await sb.from("user_dashboards").upsert(
        { user_id: admin.id, dashboard_id: d.id },
        { onConflict: "user_id,dashboard_id" },
      );
    }
    console.log(`\n  admin granted access to all ${dashes.length} dashboards`);
  }

  if (newPasswords.length) {
    console.log("\n=== TEMP PASSWORDS (share once, then they must change) ===\n");
    for (const p of newPasswords) {
      console.log(`  ${p.username.padEnd(12)}  ${p.tmp}`);
    }
    console.log("");
  } else {
    console.log("\nNo new users created — all already existed.\n");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
