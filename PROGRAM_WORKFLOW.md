# Consistify — Program Workflow & Architecture Guide

This document explains **what Consistify is**, **how the codebase is organized**, **how a request flows from browser to database**, and **how scoring, privacy, and auth work**. It is meant for developers and technical users onboarding to the project.

---

## 1. Product in one paragraph

Consistify is a **private group consistency tracker**. Users register, create or join private groups via secure invitations, share a task list, and each mark **their own** daily completions. Points and analytics are calculated on the **server**. There is no public global leaderboard; every group’s data is visible only to its members.

---

## 2. High-level architecture

```
┌─────────────────────┐         HTTPS / cookies          ┌──────────────────────┐
│  React client       │  ←── CSRF header + credentials ─→│  Express API         │
│  (Vite, port 5173)  │         /api/v1/*                │  (port 5000)         │
│                     │                                   │                      │
│  pages / components │                                   │  routes → controllers│
│  AuthContext        │                                   │  → services → models │
│  GroupContext       │                                   │                      │
│  Axios api.js       │                                   │  JWT cookies         │
└─────────────────────┘                                   └──────────┬───────────┘
                                                                     │
                                                                     ▼
                                                            ┌────────────────┐
                                                            │   MongoDB      │
                                                            │  (Mongoose)    │
                                                            └────────────────┘
```

| Folder | Role |
|--------|------|
| `html_code/` | Original static design (HTML/CSS/JS). **Reference only** — not executed by the app. |
| `client/` | Production React UI. Reuses `reference.css` visual language. |
| `server/` | REST API under `/api/v1`, auth, business rules, analytics. |
| Root `package.json` | Orchestrates `dev` / `build` / `test` / `lint`. |

---

## 3. End-to-end user workflow

### 3.1 Visitor (unauthenticated)

1. Opens `/` → **LandingPage** (marketing: hero, features, how-it-works, footer).
2. No login required to view the landing page.
3. Clicks **Get started** / **Log in** → Auth modal (sign up or sign in).

### 3.2 Account creation & session

1. `POST /api/v1/auth/register` with name, email, password.
2. Server hashes password with **bcrypt**, creates `User`, issues:
   - `accessToken` HTTP-only cookie (short-lived JWT)
   - `refreshToken` HTTP-only cookie (longer-lived, hashed in DB)
3. Client fetches CSRF token via `GET /api/v1/csrf`.
4. On refresh, `AuthContext` calls `/auth/me` or `/auth/refresh` to restore session.  
   **Tokens are never stored in `localStorage`.**

### 3.3 Create or join a group

**Create**

1. `POST /api/v1/groups` → creates `Group`, owner `Membership`, default categories/tasks, first `Invitation`.
2. Response includes invite **code** + **token** (token shown once for link sharing).

**Join**

1. User enters invite code **or** opens `/join/:token`.
2. `POST /api/v1/groups/join` validates invitation (not expired / revoked / exhausted).
3. Creates or reactivates `Membership` as `member` (or `pending` if join approval is enabled).
4. Duplicate active memberships are prevented by unique `(group, user)` index.

### 3.4 Daily tracking loop

1. User selects active group (group switcher → `GroupContext`).
2. Dashboard loads summary, checklist, charts, activity, leaderboard from API.
3. Member toggles a task → `POST .../tasks/:taskId/complete` or `.../undo`.
4. Server:
   - Checks membership + permission
   - Validates date (today or yesterday in **group timezone**)
   - Ensures task is active/scheduled
   - Creates `TaskCompletion` with **pointsAwarded snapshot** and an occurrence number
   - Enforces the task's per-member daily limit; a unique partial index blocks duplicate occurrence records
5. UI refreshes from API (frontend does not invent scores).

### 3.5 Analytics & competition

- **Daily chart**: points per member per day for 7/30/90 days.
- **Cumulative chart**: running sum from historical completions (+ points before window).
- **Leaderboard**: ranked by period points; ties broken by cumulative then name.
- **Calendar**: month grid with group/your points per day (view history; no arbitrary backdating).
- **Members**: list roles; owner/admin can invite, change roles, remove; owner can transfer ownership.

---

## 4. Backend structure & request pipeline

```
HTTP request
  → Helmet / CORS / rate limit / JSON body / cookie parser / mongo sanitize
  → CSRF check (mutating + has access cookie; login/register/refresh/logout skipped)
  → /api/v1 routes
       → authenticate (JWT from access cookie)
       → requireGroupMember (loads Group + Membership)
       → requirePermission (central matrix in permissions.js)
       → validate (Joi schemas)
       → controller (thin HTTP adapter)
       → service (business logic)
       → Mongoose models
  → centralized errorHandler → JSON { success, error: { code, message } }
```

### Key server folders

| Path | Purpose |
|------|---------|
| `src/config/` | Env + DB connection |
| `src/models/` | User, Group, Membership, Invitation, Category, Task, TaskCompletion, RefreshToken, ActivityLog |
| `src/middleware/` | Auth, group auth, validation, errors |
| `src/validators/` | Joi input schemas |
| `src/services/` | Auth, groups, tasks, completions, analytics, activity, tokens |
| `src/controllers/` | Map HTTP ↔ services |
| `src/routes/` | Versioned route tables |
| `src/utils/` | AppError, dates, permissions, logger |
| `tests/` | Integration tests with in-memory MongoDB |

### Permission matrix (source of truth)

Defined in `server/src/utils/permissions.js`:

- **Owner** — full control including delete group, transfer ownership, change roles  
- **Admin** — update group, invites, members (limited), categories/tasks, own completions, analytics  
- **Member** — view group, own completions, analytics/activity  

Hiding a button in React is **not** security; every API route re-checks role.

---

## 5. Data model (relationships)

```
User ──< Membership >── Group
                │
                ├── Invitation (tokenHash, code, expires, maxUses)
                ├── Category
                ├── Task ──< TaskCompletion >── User (per dateKey)
                └── ActivityLog
User ──< RefreshToken
```

**Important rules**

- Role lives on **Membership**, not on User globally.
- Completions are **independent per user**; Person A completing Physics does not complete it for Person B.
- `TaskCompletion.pointsAwarded` is a snapshot — changing task points later does not rewrite history.
- Soft-delete / archive: groups `archivedAt`, tasks `archivedAt`, users `deletedAt`.

---

## 6. Frontend structure & state

```
client/src/
  pages/          LandingPage, JoinPage, AppDashboard
  layouts/        DashboardLayout (shell: sidebar, header, modals)
  components/     UI building blocks + views/*
  context/        AuthContext, GroupContext
  hooks/          useToast, useDashboardData
  services/api.js Central Axios client (cookies + CSRF + refresh retry)
  utils/          format helpers, nav constants
  styles/         reference.css (design) + app.css (additions)
```

### View routing (authenticated)

`DashboardLayout` holds `view` state: `dashboard | tasks | members | progress | calendar | leaderboard`.  
`AppDashboard` loads data via `useDashboardData` and renders the matching view component.

### Auth / group state

- **AuthContext**: user, login/register/logout, session restore.  
- **GroupContext**: list of groups, active group id (persisted in `localStorage` as UI preference only — **not** an auth secret), group details, role helpers.

---

## 7. API map (v1)

Base: `/api/v1`

### Auth
| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | Rate limited |
| POST | `/auth/login` | Rate limited |
| POST | `/auth/logout` | Revokes refresh |
| POST | `/auth/refresh` | Rotates refresh |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/password` | Change password |
| PATCH | `/auth/profile` | Name / avatar color |
| DELETE | `/auth/account` | Soft-delete + policy |

### Groups / invites / members
| Method | Path |
|--------|------|
| POST/GET | `/groups` |
| GET/PATCH/DELETE | `/groups/:groupId` |
| POST | `/groups/join`, `/groups/invitations/validate` |
| POST | `/groups/:groupId/leave` |
| GET | `/groups/:groupId/members` |
| PATCH | `/groups/:groupId/members/:userId/role` |
| DELETE | `/groups/:groupId/members/:userId` |
| POST | `/groups/:groupId/transfer-ownership` |
| CRUD-ish | `/groups/:groupId/invitations` |

### Tasks & completions
| Method | Path |
|--------|------|
| Categories | `/groups/:groupId/categories` |
| Tasks | `/groups/:groupId/tasks` |
| Checklist | `GET /groups/:groupId/checklist` |
| Complete / undo | `POST .../tasks/:taskId/complete\|undo` |
| History | `GET /groups/:groupId/history` |

### Analytics
| Path | Returns |
|------|---------|
| `.../analytics/summary` | Today/week/month/streaks/counts |
| `.../analytics/daily` | Multi-member daily series |
| `.../analytics/cumulative` | Multi-member cumulative series |
| `.../analytics/leaderboard` | Ranked members |
| `.../analytics/categories` | Category stats |
| `.../analytics/calendar` | Month day map |
| `.../activity` | Recent feed |

Response shape: `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`.

---

## 8. Security checklist (implemented)

| Control | Where |
|---------|--------|
| Password hashing (bcrypt) | `User` model / authService |
| HTTP-only cookies | tokenService |
| Refresh rotation + revoke | RefreshToken + auth refresh |
| Rate limiting | Global + auth routes |
| Helmet | app.js |
| CORS with credentials | `CLIENT_URL` |
| CSRF double-submit | csrf-csrf + `x-csrf-token` |
| Joi validation + stripUnknown | validators + middleware |
| mongo-sanitize | app.js |
| RBAC on every group route | groupAuth + permissions |
| Invitation token hashing | Invitation model |
| No stack traces in prod errors | errorHandler |
| Structured logging redacts secrets | logger.js |

---

## 9. Scoring & streak policy (authoritative)

Documented for product consistency:

1. Completing a task awards that task’s **current** `points`, stored as `pointsAwarded`.  
2. One active completion per `(group, user, task, dateKey)` unless undone.  
3. Eligible completion dates: **today** and **yesterday** in group timezone (grace for late-night/timezone edges). No free-form historical backfill.  
4. Undo sets `undoneAt`; those points leave aggregates; activity log records the undo.  
5. **Current streak**: consecutive days with ≥1 non-undone completion ending at today, or at yesterday if today is still empty.  
6. **Longest streak**: longest consecutive run in history.  
7. Charts/leaderboards query non-undone completions only.

---

## 10. Local development workflow

```bash
npm run install:all
# Ensure MongoDB is running OR use Atlas URI in server/.env
npm run dev          # API + Vite
npm run test         # server tests (memory Mongo)
npm run build        # client production bundle
```

Typical debug path:

1. Hit `GET /api/v1/health` — API up?  
2. Register via UI — cookies set in Application tab?  
3. Create group — appears in `GET /groups`?  
4. Complete task — checklist + summary update?  
5. Second browser/user with invite — independent checklist?

---

## 11. Testing strategy

| File | Focus |
|------|--------|
| `tests/auth.test.js` | Register, login, duplicate email, wrong password, protected routes |
| `tests/groups.test.js` | Create, join, expired invite, cross-group 403, member can’t manage tasks |
| `tests/completions.test.js` | Independent completions, duplicates, undo, charts, leaderboard, points |
| `tests/dateUtils.test.js` | Date keys, ranges, streaks, timezone format |

Tests use **mongodb-memory-server** so they never touch your real database.

---

## 12. Deployment workflow (summary)

1. Provision MongoDB Atlas; copy URI.  
2. Deploy `server` with production secrets; `NODE_ENV=production`, `COOKIE_SECURE=true`.  
3. Build `client` with `VITE_API_URL` pointing at the API.  
4. Align CORS `CLIENT_URL` with the real frontend origin.  
5. Prefer reverse-proxy same-site cookies; if cross-site, use `SameSite=None; Secure`.  
6. Confirm CSRF + refresh still work after deploy (login → mutate → refresh page).

---

## 13. What is intentionally out of scope / incomplete

Be honest with maintainers:

- **Notifications** model/UI not shipped as a full product (activity feed covers group events).  
- **Mongo multi-document transactions** are not required for the default local standalone Mongo path; concurrent completion safety relies on unique indexes. For multi-doc atomic workflows in production, use a replica set.  
- **Frontend unit tests** are lighter than backend integration tests; critical paths are covered on the API.  
- Reference folder remains `html_code/` (not renamed to `reference-design/`) to avoid breaking the user’s existing files.

---

## 14. File map for quick navigation

**Backend entry:** `server/src/server.js` → `app.js` → `routes/index.js`  
**Auth:** `services/authService.js` + `tokenService.js` + `middleware/auth.js`  
**Groups/invites:** `services/groupService.js`  
**Points:** `services/completionService.js` + `services/analyticsService.js`  
**Permissions:** `utils/permissions.js`  

**Frontend entry:** `client/src/main.jsx` → `App.jsx`  
**Landing:** `pages/LandingPage.jsx`  
**App shell:** `layouts/DashboardLayout.jsx`  
**Dashboard data:** `hooks/useDashboardData.js` + `pages/AppDashboard.jsx`  
**HTTP:** `services/api.js`  

**Design CSS:** `client/src/styles/reference.css` (copied from `html_code/style.css`)

---

## 15. Glossary

| Term | Meaning |
|------|---------|
| dateKey | `YYYY-MM-DD` string in the group’s timezone |
| Membership | Link between User and Group + role |
| Snapshot points | Points frozen on the completion document |
| Active group | Currently selected group in the UI |
| Invite token | High-entropy secret for `/join/:token` links |
| Invite code | Short human-shareable code (also validated server-side) |

---

*Last updated with the Consistify MERN implementation. Prefer this document + README over tribal knowledge when onboarding.*
