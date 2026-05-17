# Olympic Paints — Staff Portal (v1)

Single-login portal that gates which Olympic Paints dashboards each user can see.
Next.js 16 on Vercel, Postgres on Supabase (`olympic-paints-forms` project, `portal` schema).

> **v1 scope:** soft hide via login + tile filter. Dashboards still live on GitHub Pages.
> v2 (scheduled reminder: 2026-05-24) will move dashboards behind real cookie-checked auth.

## Architecture

```
 Browser
    │
    ▼
 [portal.olympicpaints.co.za] ─── Next.js on Vercel
    │
    ├─ /login                    Username/password form
    ├─ /                         Tile grid (only allowed dashboards)
    ├─ /change-password          Forced on first login
    ├─ /admin                    Permissions matrix (admin only)
    ├─ /admin/users              Add/disable/reset users (admin only)
    ├─ /d/<slug>                 Proxied dashboard (auth + permission check)
    └─ /d/<slug>/<assets...>     Proxied assets (CSS/JS/images)
            │
            ▼
       fetch() → flomaticauto.github.io/olympic-paints-<slug>/...
       (HTML rewritten so all internal URLs go back through /d/<slug>/)
```

## Setup

```bash
cd C:\Users\quint\olympic-paints-portal
copy .env.example .env.local
# Edit .env.local — fill in SUPABASE_SERVICE_ROLE_KEY and SESSION_PASSWORD

npm install
npm run seed              # creates 13 users + 7 dashboards. Prints temp passwords.
npm run dev               # http://localhost:3000
```

### Where to get the secrets

- **SUPABASE_SERVICE_ROLE_KEY:** Supabase dashboard → `olympic-paints-forms` project → Settings → API → `service_role` secret. Never commit; never expose to the browser.
- **SESSION_PASSWORD:** generate locally:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## Deployment

1. Push repo to GitHub: `FlomaticAuto/olympic-paints-portal`
2. Import into Vercel (team: `flomaticautos-projects`)
3. Add env vars in Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_PASSWORD`
4. Add custom domain `portal.olympicpaints.co.za`
5. Run `npm run seed` once against the production Supabase

## Daily admin

- **Add a user:** `/admin/users` → "Add user" → temp password is shown once.
- **Change who sees what:** `/admin` → tick checkboxes → Save.
- **Reset a forgotten password:** `/admin/users` → "Reset password" → temp password is shown once.
- **Disable someone:** `/admin/users` → click "Active" → confirms.

## Adding a new dashboard

Insert directly into Supabase (or build a small admin UI later):

```sql
INSERT INTO portal.dashboards (slug, name, description, upstream_url, icon, sort_order)
VALUES ('new-thing', 'New Thing', 'What it does',
        'https://flomaticauto.github.io/new-thing/', 'N', 80);
```

Then tick the new column in `/admin` for whoever should see it.

## Phase 2 (the reminder fires 2026-05-24)

The proxy hides URLs but the upstream GitHub Pages dashboards are still public.
Anyone who already knows or finds the original URL can open it directly.

To actually lock them down, each dashboard needs to:
1. Be migrated off GitHub Pages onto Vercel (or behind a Vercel proxy).
2. Check the `oly_portal_session` cookie at the edge.
3. Reject requests without a valid session.

Start with the KPI dashboard (smallest, touched weekly). Then HAVEN, PULSE, etc.
