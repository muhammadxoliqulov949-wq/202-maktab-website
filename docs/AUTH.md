# Authentication & Authorization — Phase 4

> Status: implemented in Phase 4. This document is the authoritative reference for
> how `/admin` and `/api/v1/admin/*` are authenticated and authorized.

---

## 1. Audit of what Phase 3 actually had

Before writing any Phase 4 code the existing implementation was inspected. Findings
(every item below was read from the repository, not assumed):

| Area | Phase 3 state |
| --- | --- |
| `/admin` UI | `src/app/admin/layout.tsx` → `AdminShell` client component. **No server check at all** — the page rendered for anyone. |
| Gate | `requireAdmin(req)` in `src/server/services/admin.service.ts` compared header `x-admin-dev-token` against env `ADMIN_DEV_TOKEN` (`timingSafeEqual`). Without the env var, production returned 503 and development returned **full admin access with `adminIdentifier: null`**. |
| Token storage | `localStorage["m202-admin-dev-token"]` (`src/components/admin/client.ts`). |
| Session | None. No cookies anywhere in the app. |
| Roles | None. Binary "has token / no token". |
| Audit identity | `admin_audit_logs.admin_identifier` held the literal string `"dev-token"` or `null`. |
| RLS | `supabase/migrations/0002_rls.sql` — RLS enabled on all 15 tables with **zero policies** (default deny). Server used the service-role key for everything. |
| Supabase clients | One: `src/server/repositories/supabase/client.ts` (`server-only`, service role). No anon/browser client, no SSR client. |
| Middleware | None (`src/middleware.ts` did not exist). |
| Rate limits | `auth` policy existed in `policyConfig()` but was **never applied** to any route. |
| Media | `GET /api/v1/admin/media` listed `media_assets`. No upload path, no Storage object policies. |

Removed by Phase 4: `ADMIN_DEV_TOKEN`, `x-admin-dev-token`, the `localStorage` token,
the `TokenPrompt` dialog and the "DEVELOPMENT ONLY" banner.

---

## 2. Authentication architecture

```
Supabase Auth (GoTrue)              ← credentials, password hashing, token signing
      │  signInWithPassword (server-side, anon apikey)
      ▼
POST /api/v1/auth/login             ← rate limited, generic errors, audit logged
      │  Set-Cookie
      ▼
HttpOnly session cookie (m202_session, base64url of the Supabase session)
      │
      ▼
src/middleware.ts                   ← refreshes the session, redirects /admin → /admin/login
      │
      ▼
Route protection
   • /admin/*        → AdminGate server component (session + admin_users + is_active + role)
   • /api/v1/admin/* → requireAdminActor() in EVERY handler
      │
      ▼
Role + permission authorization (admin_users.role → admin_roles.permissions)
      │
      ▼
Repositories → PostgreSQL (RLS) → admin_audit_logs
```

### 2.1 Three Supabase clients (clean separation)

| Module | Key | Runtime | Purpose |
| --- | --- | --- | --- |
| `src/lib/supabase/browser.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | Public anon client factory. **Deliberately not used for session management** — the session cookie is `HttpOnly`, so JS cannot read it (see §2.3). Kept as the single sanctioned place a browser client may ever be created; it can never see the service key. |
| `src/lib/supabase/server.ts` | `SUPABASE_ANON_KEY` (falls back to service key, logged as a warning) | Node server | `@supabase/ssr` `createServerClient` bound to the request/response cookie jar. Used for `signInWithPassword`, `getUser`, `refreshSession`, `signOut`. |
| `src/lib/supabase/service.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Node server, `import "server-only"` | Bypasses RLS. The only client that can write to `admin_users`, `admin_audit_logs`, `contact_submissions`. |

`src/lib/supabase/service.ts` starts with `import "server-only"`, so any accidental
import from a client component is a **build-time error**. The service key is never
referenced from `NEXT_PUBLIC_*` and never appears in a client bundle.

**Why service role is still used (documented per requirement):**

| Use | Why RLS/authenticated context is not enough |
| --- | --- |
| Content CRUD (`news_articles`, `team_members`, …) | Public rows must stay readable only through the API, which enforces draft/archive separation. There are intentionally no anon SELECT policies, so the server needs a role above RLS. |
| `admin_audit_logs` writes | Append-only journal. No role may UPDATE/DELETE it (enforced by a trigger), and the writer must not be the same role that could be blocked by a self-referential policy. |
| `contact_submissions` | Private PII. No anon/authenticated policy exists at all. |
| `admin_users` writes (grant/revoke) | Must be performed by an administrator, not by the subject of the row; a `using`-clause policy cannot express "an admin may edit someone else's row" without also letting them edit their own `is_active`. |
| Media upload metadata | Kept on service role for symmetry with `media_assets` writes; the **Storage object write itself uses the authenticated admin's JWT** so RLS decides (see §9). |

### 2.2 Login flow

1. `POST /api/v1/auth/login` `{ email, password }` — rate limited by IP **and** by email (`auth` policy).
2. Zod validation (email format, password 8–200 chars). Invalid shape → `422`, and the
   response is identical whether or not the account exists.
3. `supabase.auth.signInWithPassword()` with the **anon** apikey, `persistSession: false`.
4. Failure → structured `login_failed` server log (`reason`, `emailHash`, `ip`), audit
   row `LOGIN_FAILED`, and the single public message
   `Login failed. Please check your email and password.` (`401 UNAUTHORIZED`).
   Supabase's own error string is never returned to the client.
5. Success → `admin_users` lookup by `user_id`:
   * no row → audit `LOGIN_DENIED` (`reason: not_admin`), `403 FORBIDDEN`, session discarded.
   * `is_active = false` → audit `LOGIN_DENIED` (`reason: inactive`), `403 FORBIDDEN`.
6. Session written to the `m202_session` cookie, CSRF token written to `m202_csrf`,
   `admin_users.last_login_at` updated, audit `LOGIN` written with the **real** user UUID.
7. Response body contains only `{ email, role, permissions }` — never tokens.

### 2.3 Cookie & session policy

| Cookie | Contents | Flags |
| --- | --- | --- |
| `m202_session` | base64url of the Supabase session (access + refresh token) | `HttpOnly`, `Path=/`, `SameSite=Lax`, `Secure` in production |
| `m202_csrf` | 32 random bytes (double-submit CSRF token) | **readable by JS** (that is the point), `Path=/`, `SameSite=Lax`, `Secure` in production |

* Tokens never touch `localStorage`, `sessionStorage` or the response body.
* `SameSite=Lax` + `Secure` + `HttpOnly`.
* Refresh: `src/middleware.ts` calls `supabase.auth.getUser()` on admin paths only, which
  transparently refreshes an expiring access token and rewrites the cookie. Public pages
  are **not** matched, so no auth call is added to public traffic (requirement 17).
* Expiry: once GoTrue rejects the refresh token, `getUser()` returns no user →
  middleware redirects `/admin` to `/admin/login?next=…`; the API returns `401` and the
  admin shell routes to the login screen.
* Logout: `POST /api/v1/auth/logout` revokes the refresh token at GoTrue, clears both
  cookies and writes an audit `LOGOUT` row.

### 2.4 CSRF

`SameSite=Lax` already prevents a cross-site page from attaching the cookie to a
`POST`/`PATCH`/`DELETE`. That alone was judged insufficient because it relies on browser
behaviour and does not protect against same-site subdomain attackers, so a
**double-submit token** is layered on top:

* `m202_csrf` is issued at login (readable, `SameSite=Lax`, never `HttpOnly`).
* Every state-changing call to `/api/v1/admin/*` must send `x-csrf-token` equal to that
  cookie value (constant-time comparison). Mismatch → `403 CSRF_FAILED`.
* `GET`/`HEAD` are exempt (safe methods, and admin reads return no private data that a
  cross-origin page could read back — `X-Content-Type-Options: nosniff` + no permissive CORS).
* The admin browser client reads the cookie and attaches the header automatically.

The token is not a secret in the cryptographic sense; it proves the caller can read the
response of our origin, which a cross-origin form/fetch cannot.

---

## 3. Authorization model

Database-backed, extensible without code changes.

```sql
admin_roles(role text pk, description text, permissions text[] not null, created_at)
admin_users(id uuid pk, user_id uuid unique → auth.users(id), email text unique,
            role text → admin_roles(role), is_active bool, created_at, updated_at, last_login_at)
```

`admin_roles` is seeded with a single `admin` role holding every permission. Adding
`editor` or `viewer` later is an `INSERT` — no application change, because handlers ask
for a **permission**, never for a role name.

Permissions:

```
dashboard.read
content.read   content.write
inbox.read     inbox.write
audit.read
media.read     media.write
settings.read  settings.write
admin.manage
```

Every `/api/v1/admin/*` handler independently runs `requireAdminActor(req, permission)`:

1. read the session cookie → `supabase.auth.getUser()` (verified against GoTrue, **not** the JWT alone) → `401` if absent/invalid;
2. `admin_users` lookup by `user_id` → `403 FORBIDDEN` if missing;
3. `is_active = true` → otherwise `403 FORBIDDEN`;
4. `admin_roles.permissions @> [required]` → otherwise `403 FORBIDDEN`;
5. CSRF double-submit check for unsafe methods → `403 CSRF_FAILED`.

Nothing is inferred from the referer, from the fact the request "came from `/admin`", or
from a client-supplied role. `curl` with no cookie gets `401`; a signed-in non-admin gets
`403`; a deactivated admin gets `403`.

---

## 4. Row Level Security

Phase 3's default-deny model is **kept** (no anon policies on content tables), because
the public site reads through `/api/v1/*` and that is where draft/archive separation and
pagination live. Phase 4 adds:

| Table | RLS | Policies |
| --- | --- | --- |
| `admin_users` | on | `admin_users_select_self` — an authenticated user may read **their own** row (`auth.uid() = user_id`). |
| `admin_roles` | on | `admin_roles_select_active_admin` — only active admins may read the role/permission catalogue. |
| `admin_audit_logs` | on | none (default deny) + append-only trigger blocking `UPDATE`/`DELETE` for every role except the table owner. "Table owner" is `postgres`/`supabase_admin` (migration/dashboard identity) — **`service_role` is not exempt**, so even the API server cannot rewrite history; it may only append. `verify-migrations` asserts exactly this. |
| `contact_submissions` | on | none — service role only. |
| `media_assets` | on | none for anon/authenticated — service role only. |
| content tables | on | unchanged from Phase 3. |
| `storage.objects` (`media` bucket) | on | `media_public_read` (anon + authenticated), `media_admin_write` / `media_admin_update` / `media_admin_delete` — `exists (select 1 from public.admin_users where user_id = auth.uid() and is_active)`. |

Each policy is exercised by `npm run verify:supabase` with a **real** authenticated JWT
(§11), and every policy + FK action is additionally executed on a real PostgreSQL 18 by
`npm run verify:migrations` (§11), which runs without credentials.

> **Why the migration is written the way it is.** The first revision used
> `references admin_roles (role) on restrict`, which PostgreSQL rejects — `ON RESTRICT`
> is not a foreign-key action; only `ON DELETE`/`ON UPDATE` exist, each taking
> `RESTRICT | CASCADE | SET NULL | SET DEFAULT | NO ACTION`. The SQL Editor aborted at
> that statement and left the project part-migrated (`admin_roles` created,
> `admin_users` not). The corrected file uses explicit **named** constraints preceded by
> `drop constraint if exists`, so the same paste converges a clean Phase 3 database and
> that part-applied one. `admin_user_id` on the audit table deliberately carries **no**
> foreign key: a journal must outlive the account it records (a cascade would let account
> deletion erase history).

---

## 5. Environment variables

Public (safe for the browser bundle):

| Var | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Used by `src/lib/supabase/browser.ts` and as a fallback for middleware. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Anon key. Not required by this app because no browser code talks to PostgREST. |

Server-only:

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | **yes** when `DATA_PROVIDER=supabase` | Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** when `DATA_PROVIDER=supabase` | Never exposed; `server-only` enforced. |
| `SUPABASE_ANON_KEY` | recommended | apikey for `signInWithPassword` / `getUser`. If omitted, the server falls back to the service-role key for **auth calls only** and logs a one-time warning. |
| `RATE_LIMIT_LOGIN_MAX` / `RATE_LIMIT_LOGIN_WINDOW_MS` | no | Defaults `10` / `60000`. |
| `ADMIN_USERS_SEED` | no | **Ignored unless `DATA_PROVIDER=json`.** Local-dev/test fixture: JSON array of `{userId,email,role,isActive}`. Contains no credentials. |

Removed: `ADMIN_DEV_TOKEN`.

`.env*` is gitignored (except `.env.example`); `scripts/check-secrets.mjs` scans the tree
and the git history for leaked keys and runs in CI.

---

## 6. Creating the first administrator (bootstrap)

No admin is hardcoded anywhere in the source tree, and `admins = 0` is the correct
state right after `0004_auth.sql` is applied: the schema exists, nobody is granted yet.

**You do not need to create the Auth user in the dashboard first** — but which command
you run depends on whether one already exists:

| Situation | Command | What it does |
| --- | --- | --- |
| No Auth user for that e-mail yet | `node scripts/admin-user.mjs create --email <e> --role admin` | creates the Auth user (GoTrue admin API, `email_confirm: true`) **and** the `admin_users` row |
| Auth user **already exists** (signed up / invited / created in the dashboard) | `node scripts/admin-user.mjs link --email <e> --role admin` | looks the user up and writes **only** the `admin_users` row — no password, no user record touched, nothing deleted |

```bash
export SUPABASE_URL=...                       # or keep them in .env.local
export SUPABASE_SERVICE_ROLE_KEY=...          # read from the environment, never committed

node scripts/admin-user.mjs list              # who has access today (addresses masked)
node scripts/admin-user.mjs create --email director@202-maktab.uz --role admin
#   → prompts the password twice on STDIN, prints auth.users UUID, inserts admin_users
node scripts/admin-user.mjs link --email director@202-maktab.uz   # if create says it already exists
```

Running `create` for an e-mail that exists stops with a pointer to `link`; it never
overwrites or re-invites the account. `link` is idempotent: if the grant already exists
with the same role and `is_active`, it reports that and issues **no write at all**.

Non-interactive use is supported (the password prompts read a line queue, so piping
works): `printf 'pw\npw\n' | node scripts/admin-user.mjs create --email <e>`. A
truncated pipe fails loudly instead of exiting 0 having done nothing — that was a real
defect: two sequential `rl.question()` calls on a pipe answer only the first, so the
command printed both prompts, called nothing and died on an unsettled await. Note that
piping puts the password in shell history — prefer the interactive prompt, and never
paste a password or key into a chat/CI log.

Verification afterwards (read-only):

```sql
select u.email, a.role, a.is_active, a.last_login_at
from admin_users a join auth.users u on u.id = a.user_id;
```

The bootstrap is **not** a backdoor: it is an operator-run CLI with the same privileges
as the Supabase dashboard, it creates no ambient credential, and deleting the
`admin_users` row (or the Auth user) immediately revokes access.

### Rotating / revoking access

* Revoke one admin: `node scripts/admin-user.mjs deactivate --user-id <uuid>` —
  the next API call returns `403` even if the session cookie is still valid.
* Kill a session now: Supabase dashboard → Auth → user → *Sign out*; or
  `admin-user.mjs deactivate` plus the user's own logout.
* Rotate the service key: Supabase dashboard → Settings → API → rotate, then update the
  deployment secret and redeploy. Nothing in the code caches it beyond process start.

---

## 7. Login / logout from a user's point of view

* `/admin/login` — email, password, show/hide, inline validation, loading state,
  generic error, redirect to `?next=` or `/admin`.
* Any `/admin/*` visit without a session → `307` to `/admin/login?next=<path>`.
* Signed in but not an admin (or deactivated) → a `403` screen with a logout button;
  the API answers `403` for the same identity.
* The shell shows the signed-in email + role and a **Chiqish** (logout) button.
* Refresh / new tab: the cookie is per-browser, so a new tab is already authenticated;
  a refresh re-verifies at GoTrue.

---

## 8. Deployment requirements

1. Apply `supabase/migrations/0004_auth.sql` (or `supabase/APPLY-ALL.sql` on a fresh project).
2. Create the first admin (§6).
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and preferably `SUPABASE_ANON_KEY`.
4. Serve over HTTPS — the session cookie is `Secure` when `NODE_ENV=production`, so a
   plain-HTTP deployment cannot authenticate.
5. Behind a CDN, do **not** cache `/admin/*`, `/api/v1/admin/*` or `/api/v1/auth/*`
   (the app already emits `private, no-store` on those responses).

---

## 9. Media security

`POST /api/v1/admin/media` (multipart):

* `media.write` permission required (active admin only).
* MIME allow-list: `image/jpeg|png|webp|gif|avif|svg+xml`, `video/mp4|webm`, `application/pdf`.
  `image/svg+xml` is stored but served from the public bucket with `Content-Disposition`
  handled by Storage; it is never inlined by the app's CSP (`img-src 'self' data:`).
* Extension must match the MIME type; executables (`.php`, `.js`, `.html`, `.exe`, …) rejected.
* Size cap `MEDIA_MAX_BYTES` (default 8 MiB) enforced **before** the body is buffered.
* Stored under `uploads/<yyyy>/<mm>/<uuid>.<ext>` — the client-supplied filename is never
  used as the object path.
* The Storage write uses the **authenticated admin's JWT**, so the `media_admin_write`
  RLS policy is what actually authorises it.
* `DELETE /api/v1/admin/media/[id]` removes the Storage object (same policy) and the
  metadata row; both are audit-logged (`MEDIA_UPLOAD`, `MEDIA_DELETE`).

---

## 10. What is logged

`admin_audit_logs` gains `admin_user_id uuid`, `admin_email text`, `ip_address text`
alongside the existing `admin_identifier` (kept for Phase 3 rows). Actions now include
`LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `LOGIN_DENIED`, `MEDIA_UPLOAD`, `MEDIA_DELETE`.

Never written: passwords, access tokens, refresh tokens, the service key, CSRF tokens,
full IP+email pairs in the same row as a credential, or raw Supabase error payloads.
Emails in failed-login rows are stored as a SHA-256 prefix (`emailHash`) so the journal
cannot be used as an address list.

---

## 11. Verification

| Command | What it proves |
| --- | --- |
| `npm test` | 4 suites: public API, admin CRUD (authenticated), **auth** (login/401/403/inactive/CSRF/session/audit/dev-token regression) against a local Supabase-Auth test double, and **migrations** (SQL guard assertions). |
| `npm run build` | production build, no `server-only` violations, no secret inlining. |
| `npm run verify:supabase` | real Supabase project: schema, Phase 3 public/CRUD/audit/cache checks **plus** Phase 4 auth, RLS, 401/403, audit user-id, logout and Storage-policy checks. |
| `npm run check:sql` | every `supabase/migrations/*.sql`, `APPLY-ALL.sql` and `SEED.sql` parsed by the **real PostgreSQL grammar** (libpg_query), plus structural lint: invalid FK actions, `create table/index` without `if not exists`, trigger/policy/constraint without a preceding `drop … if exists`, any `drop table`/`truncate`. Catches `syntax error at or near "restrict"` before a human pastes it. |
| `npm run verify:migrations` | **executes** the migrations on real PostgreSQL 18 (PGlite, Supabase's `auth.*`/`storage.*` objects emulated): clean apply, double re-run idempotency, recovery from the part-applied state, FK actions (`RESTRICT`/`CASCADE`/`SET NULL`), append-only trigger under `service_role`, and RLS/storage visibility for anon, non-admin, active admin and deactivated admin. No credentials needed, so it runs in CI before the build. |
| `node scripts/check-secrets.mjs` | no key material in the tree or in git history. |
