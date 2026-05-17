"use client";

import { useState, useTransition } from "react";
import type { User } from "@/lib/types";

export default function UsersAdmin({ users }: { users: User[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refreshTo(path: string) {
    window.location.href = path;
  }

  function createUser(form: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        body: form,
      });
      if (res.redirected) refreshTo(res.url);
      else if (!res.ok) setError(await res.text());
    });
  }

  function resetPassword(id: string, username: string) {
    if (!confirm(`Reset password for ${username}?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${id}/reset`, { method: "POST" });
      if (res.redirected) refreshTo(res.url);
      else if (!res.ok) setError(await res.text());
    });
  }

  function toggleActive(id: string, isActive: boolean) {
    const action = isActive ? "disable" : "enable";
    if (!confirm(`${action[0].toUpperCase() + action.slice(1)} this user?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (res.ok) window.location.reload();
      else setError(await res.text());
    });
  }

  function toggleAdmin(id: string, isAdmin: boolean) {
    if (!confirm(`${isAdmin ? "Remove" : "Grant"} admin rights?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_admin: !isAdmin }),
      });
      if (res.ok) window.location.reload();
      else setError(await res.text());
    });
  }

  return (
    <div>
      <details style={{ marginBottom: 20 }}>
        <summary style={{ cursor: "pointer", padding: "10px 14px", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-default)", borderRadius: 8, fontWeight: 600 }}>
          + Add user
        </summary>
        <form
          onSubmit={(e) => { e.preventDefault(); createUser(new FormData(e.currentTarget)); }}
          style={{ marginTop: 12, padding: 16, background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-default)", borderRadius: 8, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          <div>
            <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Username</label>
            <input name="username" required style={{ width: "100%", padding: 8, background: "var(--color-surface-sunken)", border: "1px solid var(--color-border-default)", borderRadius: 4, color: "var(--color-text-primary)", marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Full name</label>
            <input name="full_name" required style={{ width: "100%", padding: 8, background: "var(--color-surface-sunken)", border: "1px solid var(--color-border-default)", borderRadius: 4, color: "var(--color-text-primary)", marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Email (optional)</label>
            <input name="email" type="email" style={{ width: "100%", padding: 8, background: "var(--color-surface-sunken)", border: "1px solid var(--color-border-default)", borderRadius: 4, color: "var(--color-text-primary)", marginTop: 4 }} />
          </div>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" name="is_admin" value="1" /> Admin
            </label>
            <button type="submit" className="btn" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </details>

      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Full name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Admin</th>
            <th>Status</th>
            <th>Last login</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="col-user">{u.full_name}</td>
              <td>{u.username}</td>
              <td>{u.email ?? "—"}</td>
              <td>
                <button className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => toggleAdmin(u.id, u.is_admin)}>
                  {u.is_admin ? "Yes" : "No"}
                </button>
              </td>
              <td>
                <button className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => toggleActive(u.id, u.is_active)}>
                  {u.is_active ? "Active" : "Disabled"}
                </button>
              </td>
              <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                {u.must_change_pw && <span style={{ marginLeft: 6, color: "var(--color-brand-primary)" }}>(pw reset pending)</span>}
              </td>
              <td style={{ textAlign: "right" }}>
                <button className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => resetPassword(u.id, u.username)}>
                  Reset password
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
