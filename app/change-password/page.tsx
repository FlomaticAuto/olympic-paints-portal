import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await requireUser();
  const sp = await searchParams;
  const error =
    sp.error === "mismatch"
      ? "The two new passwords don't match."
      : sp.error === "short"
        ? "Password must be at least 10 characters."
        : sp.error === "wrong"
          ? "Current password is incorrect."
          : null;

  return (
    <div className="login-wrap">
      <form className="login-card" method="POST" action="/api/change-password">
        <div className="logo">
          <img src="/logo.jpg" alt="Olympic Paints" />
        </div>
        <h1>Set a new password</h1>
        <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13, margin: "-12px 0 18px" }}>
          Hi {s.fullName}. {s.mustChangePw ? "Please set your own password before continuing." : ""}
        </p>
        {!s.mustChangePw && (
          <>
            <label htmlFor="current">Current password</label>
            <input id="current" name="current" type="password" required autoComplete="current-password" />
          </>
        )}
        <label htmlFor="next1">New password (10+ chars)</label>
        <input id="next1" name="next1" type="password" required minLength={10} autoComplete="new-password" autoFocus={s.mustChangePw} />
        <label htmlFor="next2">Confirm new password</label>
        <input id="next2" name="next2" type="password" required minLength={10} autoComplete="new-password" />
        <button type="submit">Update password</button>
        {error && <div className="err">{error}</div>}
      </form>
    </div>
  );
}
