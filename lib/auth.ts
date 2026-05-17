import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function requireUser() {
  const s = await getSession();
  if (!s.userId) redirect("/login");
  return s;
}

export async function requireAdmin() {
  const s = await requireUser();
  if (!s.isAdmin) redirect("/");
  return s;
}

export async function requireFreshPassword() {
  const s = await requireUser();
  if (s.mustChangePw) redirect("/change-password");
  return s;
}
