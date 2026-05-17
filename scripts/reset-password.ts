/**
 * CLI fallback for resetting a password without using the admin UI.
 * Usage:  npm run reset-password <username>
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const username = process.argv[2];
if (!username) {
  console.error("Usage: npm run reset-password <username>");
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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

async function main() {
  const tmp = tempPassword();
  const password_hash = await bcrypt.hash(tmp, 12);
  const { error, data } = await sb
    .from("users")
    .update({ password_hash, must_change_pw: true })
    .eq("username", username.toLowerCase())
    .select("username")
    .single();
  if (error || !data) {
    console.error(`Failed: ${error?.message ?? "user not found"}`);
    process.exit(1);
  }
  console.log(`\n  ${data.username}  ${tmp}\n`);
  console.log("Share once. They must change it on next login.\n");
}

main().then(() => process.exit(0));
