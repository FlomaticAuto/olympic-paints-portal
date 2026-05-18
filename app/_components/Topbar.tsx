import ThemeToggle from "./ThemeToggle";

export default function Topbar({
  fullName,
  isAdmin,
}: {
  fullName?: string;
  isAdmin?: boolean;
}) {
  return (
    <header className="topbar-slim">
      <ThemeToggle />
      <div className="topbar-slim-user">
        <span className="user-name">{fullName ?? "Signed in"}</span>
        {isAdmin && <a href="/ci-tracker">CI Tracker</a>}
        {isAdmin && <a href="/admin">Admin</a>}
        <form method="POST" action="/api/logout">
          <button type="submit" className="linkish">Sign out</button>
        </form>
      </div>
    </header>
  );
}
