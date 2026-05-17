export default function Topbar({
  fullName,
  isAdmin,
}: {
  fullName?: string;
  isAdmin?: boolean;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <img src="/logo.jpg" alt="Olympic Paints" />
        <strong>Staff Portal</strong>
      </div>
      <div className="user">
        <span>{fullName ?? "Signed in"}</span>
        {isAdmin && <a href="/admin">Admin</a>}
        <form method="POST" action="/api/logout">
          <button type="submit" className="linkish">Sign out</button>
        </form>
      </div>
    </header>
  );
}
