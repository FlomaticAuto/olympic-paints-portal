import { randomBytes } from "crypto";

// 14-char URL-safe temp password (~83 bits of entropy).
// Avoids visually ambiguous chars: 0/O, 1/l/I.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function tempPassword(len = 14): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
