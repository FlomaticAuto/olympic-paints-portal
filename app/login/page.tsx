import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const s = await getSession();
  if (s.userId) redirect("/");

  const sp = await searchParams;
  const error =
    sp.error === "invalid"
      ? "Username or password is incorrect."
      : sp.error === "inactive"
        ? "This account has been disabled."
        : null;

  return (
    <div className="login-wrap">
      <form className="login-card" method="POST" action="/api/login">
        <div className="logo">
          <img src="/logo.jpg" alt="Olympic Paints" />
        </div>
        <h1>Staff Portal</h1>
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required autoFocus autoComplete="username" />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
        <button type="submit">Sign in</button>
        {error && <div className="err">{error}</div>}
      </form>
    </div>
  );
}
