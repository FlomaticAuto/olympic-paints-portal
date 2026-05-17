"use client";

import { useMemo, useState, useTransition } from "react";

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
  const [filter, setFilter] = useState("");

  const visibleUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [users, filter]);

  function key(uid: string, did: string) { return `${uid}|${did}`; }

  function toggle(uid: string, did: string) {
    const k = key(uid, did);
    const next = new Set(grants);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setGrants(next);
  }

  function toggleRow(uid: string, on: boolean) {
    const next = new Set(grants);
    for (const d of dashboards) {
      const k = key(uid, d.id);
      if (on) next.add(k);
      else next.delete(k);
    }
    setGrants(next);
  }

  function toggleCol(did: string, on: boolean) {
    const next = new Set(grants);
    for (const u of users) {
      const k = key(u.id, did);
      if (on) next.add(k);
      else next.delete(k);
    }
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
        <div className="toolbar-left">
          <strong>{users.length}</strong> users × <strong>{dashboards.length}</strong> dashboards
          <input
            type="search"
            placeholder="Filter users…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-input"
          />
        </div>
        <button className="btn" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="matrix-help">
        Tip — click a column header to grant/revoke that dashboard for everyone; click a row header to grant/revoke all dashboards for one user.
      </div>

      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner">User</th>
              {dashboards.map((d) => {
                const colCount = users.filter((u) => grants.has(key(u.id, d.id))).length;
                const allOn = colCount === users.length;
                return (
                  <th
                    key={d.id}
                    className={`matrix-col-h ${!d.is_active ? "off" : ""}`}
                    onClick={() => toggleCol(d.id, !allOn)}
                    title={`${d.name} — click to ${allOn ? "revoke" : "grant"} for all users`}
                  >
                    <span className="col-name">{d.name}</span>
                    {!d.is_active && <span className="col-off">off</span>}
                    <span className="col-count">{colCount}/{users.length}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => {
              const rowCount = dashboards.filter((d) => grants.has(key(u.id, d.id))).length;
              const allOn = rowCount === dashboards.length;
              return (
                <tr key={u.id}>
                  <th
                    scope="row"
                    className="matrix-row-h"
                    onClick={() => toggleRow(u.id, !allOn)}
                    title={`Click to ${allOn ? "revoke" : "grant"} all dashboards for ${u.full_name}`}
                  >
                    <div className="row-name">
                      {u.full_name}
                      {u.is_admin && <span className="badge admin">ADMIN</span>}
                      {!u.is_active && <span className="badge danger">OFF</span>}
                    </div>
                    <div className="row-username">{u.username}</div>
                    <div className="row-count">{rowCount}/{dashboards.length}</div>
                  </th>
                  {dashboards.map((d) => (
                    <td key={d.id} className="matrix-cell">
                      <input
                        type="checkbox"
                        checked={grants.has(key(u.id, d.id))}
                        onChange={() => toggle(u.id, d.id)}
                        aria-label={`Grant ${d.name} to ${u.full_name}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
