import ThemeToggle from "./ThemeToggle";

export default function Topbar({
  fullName,
  isAdmin,
}: {
  fullName?: string;
  isAdmin?: boolean;
}) {
  return (
    <header
      className="topbar-slim"
      style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, width: "100%" }}
    >
      <ThemeToggle />
      <div className="topbar-slim-user">
        <span className="user-name">{fullName ?? "Signed in"}</span>
        <a href="/customer-trends">Customer Trends</a>
        {isAdmin && <a href="/ci-tracker">CI Tracker</a>}
        {isAdmin && <a href="/quote-changes">Quote Changes</a>}
        {isAdmin && <a href="/admin/whatsapp-blast">WhatsApp Blast</a>}
        {isAdmin && <a href="/file-management">File Management</a>}
        {isAdmin && <a href="/admin">Admin</a>}
        <form method="POST" action="/api/logout">
          <button type="submit" className="linkish">Sign out</button>
        </form>
      </div>
    </header>
  );
}
