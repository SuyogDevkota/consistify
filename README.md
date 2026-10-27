# Consistify

Private group-based consistency tracker built with the **MERN** stack (MongoDB, Express, React, Node).

Groups are private. Tasks are shared within a group. Completions and points are **per member**. Scores and charts always come from the backend.

> For a full architecture walkthrough, API map, data flow, and security notes, see **[PROGRAM_WORKFLOW.md](./PROGRAM_WORKFLOW.md)**.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + React Router + Axios + Recharts |
| Styling | Plain CSS (reference design in `html_code/`) — no Tailwind |
| Backend | Node.js + Express + Mongoose |
| Auth | JWT access + refresh cookies (HTTP-only), CSRF, bcrypt, rate limits, Helmet |

## Project layout

```
consistify/
  html_code/          # Original HTML/CSS/JS design reference (unchanged)
  client/             # React app
  server/             # Express API
  PROGRAM_WORKFLOW.md # Deep dive for developers
  README.md
  package.json        # Root scripts (dev / build / test)
```

## Prerequisites

- Node.js 18+
- MongoDB locally **or** [MongoDB Atlas](https://www.mongodb.com/atlas)

## Quick start

```bash
# From project root
npm run install:all

# Configure env (examples already exist)
copy server\.env.example server\.env
copy client\.env.example client\.env

# Start API + Vite together
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:5000/api/v1/health  

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Concurrently run server + client |
| `npm run build` | Production build of the client |
| `npm run start` | Start API in production mode |
| `npm run test` | Backend integration tests (in-memory MongoDB) |
| `npm run lint` | Lint client + server |

## Environment variables

### Server (`server/.env`)

See `server/.env.example`:

- `MONGODB_URI` — Mongo connection string  
- `CLIENT_URL` — frontend origin (CORS + cookies)  
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random secrets  
- `COOKIE_SECURE=true` in production (HTTPS)  
- `COOKIE_SAME_SITE` — `lax` (same-site) or `none` (cross-site + Secure)  
- `CSRF_SECRET` — CSRF signing secret  

### Client (`client/.env`)

- `VITE_API_URL=http://localhost:5000/api/v1`  
  In Vite dev you can also rely on the `/api` proxy.

**Never commit real `.env` files.**

## Testing

```bash
npm run test
```

Runs **server integration tests** (`mongodb-memory-server`, never your real database) and **client unit tests** (Vitest). Coverage includes auth, groups/privacy, invites, join approval, RBAC, completions, point snapshots, charts, streaks, and date boundaries.

## Deployment notes

1. **MongoDB Atlas** — create a cluster; set `MONGODB_URI`.  
2. **API host** (Render, Railway, Fly, etc.) — set production env; enable HTTPS.  
3. **Frontend** (Vercel/Netlify/static host) — build with `npm run build`, set `VITE_API_URL` to the API URL.  
4. **Cookies across origins** — use `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, and exact `CLIENT_URL`. Prefer same-site reverse-proxy when possible.  
5. **CSRF** — browser clients must call `GET /api/v1/csrf` and send `x-csrf-token` on mutating authenticated requests (the React client already does this).

### Point / streak policy (summary)

- Completions allowed for **today** or **yesterday** (grace) in the **group timezone**.  
- Points snapshotted on the completion record (editing a task later does not rewrite history).  
- Undo marks `undoneAt`; points no longer count; activity is logged.  
- Tasks can allow 1–50 completions per member per scheduled day; each award has its own audit record and can be undone independently.  
- Streaks: consecutive days with ≥1 valid completion; if today is empty, current streak may start from yesterday.

## Reference design

Visual source of truth: `html_code/index.html`, `style.css`, `script.js`.  
The React app reuses that CSS language; interactions are React state/hooks, not the old DOM script.

## What is still manual / out of scope

- You need a MongoDB URI (local or Atlas) in `server/.env` to run the live app. Tests use an in-memory server and do not need that URI.
- MongoDB **transactions** are not required for the default standalone setup. Concurrent completion safety uses unique indexes. For multi-document transactions in production, run a replica set.
- In-app push/email **notifications** are not a full product; the group activity feed covers events.
- Completions are allowed for **today and yesterday** in the group timezone only (no arbitrary historical backfill).
- Existing databases must run the task-completion index migration before deploying the multi-completion update: `npm run migrate:completion-occurrences --prefix server`.
