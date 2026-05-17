"use client";

import { useState, useTransition } from "react";

type U = { id: string; username: string; full_name: string; is_admin: boolean; is_active: boolean };
type D = { id: string; slug: string; name: string; is_active: boolean };

export default function PermissionsMatrix({
  users,
  dashboards,
  initialGrants,
}: {
  users: U[];
  dashboards: D[];
  initialGrants: string[];
}) {
  const [grants, setGrants] = useState<Set<string>>(new Set(initialGrants));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function key(uid: string, did: string) { return `${uid}|${did}`; }

  function toggle(uid: string, did: string) {
    const k = key(uid, did);
    const next = new Set(grants);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setGrants(next);
  }

  function save() {
    setError(null);
    const payload = Array.from(grants).map((s) => {
      const [user_id, dashboard_id] = s.split("|");
      return { user_id, dashboard_id };
    });
    startTransition(async () => {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grants: payload }),
      });
      if (res.ok) {
        window.location.href = "/admin?saved=1";
      } else {
        setError(await res.text());
      }
    });
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <strong>{users.length}</strong> users × <strong>{dashboards.length}</strong> dashboards
        </div>
        <button className="btn" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              {dashboards.map((d) => (
                <th key={d.id} style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  {d.name}{!d.is_active && " (off)"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="col-user">
                  {u.full_name}
                  {u.is_admin && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: "var(--color-brand-primary)" }}>
                      ADMIN
                    </span>
                  )}
                  {!u.is_active && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: "var(--color-danger-fg)" }}>
                      DISABLED
                    </span>
                  )}
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{u.username}</div>
                </td>
                {dashboards.map((d) => (
                  <td key={d.id} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={grants.has(key(u.id, d.id))}
                      onChange={() => toggle(u.id, d.id)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
