import { requireAdmin } from "@/lib/auth";
import Topbar from "../_components/Topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  return (
    <>
      <Topbar fullName={s.fullName} isAdmin />
      <div className="admin-wrap">
        <h1>Admin Console</h1>
        <p className="sub">Manage users and dashboard permissions.</p>
        <nav className="admin-tabs">
          <a href="/">&larr; Portal</a>
          <a href="/admin/users">Users</a>
          <a href="/admin">Permissions</a>
        </nav>
        {children}
      </div>
    </>
  );
}
