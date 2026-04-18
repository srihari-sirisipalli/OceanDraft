# OceanDraft

Marine & Naval Architecture single-question assessment platform.
Candidate verifies via mobile + OTP, answers exactly **one** admin-controlled question, and sees an instant Hooray/Fail result — all wrapped in a marine/shipyard aesthetic.

See [`OceanDraft_System_Design.md`](./OceanDraft_System_Design.md) for the full V1 architecture & spec.

---

## Monorepo layout

```
oceandraft/
├── apps/
│   ├── api/   # NestJS + Prisma (Postgres) + Redis + SMS abstraction
│   └── web/   # Next.js 14 (App Router) — candidate portal + admin panel
├── docker-compose.yml   # Postgres, Redis, MinIO (S3-compatible)
├── package.json         # npm workspaces
└── OceanDraft_System_Design.md
```

## Prerequisites

- Node.js **20+**
- npm **10+**
- Docker Desktop (for Postgres / Redis / MinIO)

## Quick start (local dev, single machine)

```bash
# 1. Install deps (workspaces)
npm install

# 2. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start infra
npm run docker:up

# 4. Migrate DB + seed demo data
npm run prisma:migrate
npm run prisma:seed

# 5. Run dev servers (API on :4000, Web on :3000)
npm run dev
```

Open:
- Candidate portal → http://localhost:3000
- Admin panel → http://localhost:3000/admin/login (default creds from `.env`)
- MinIO console → http://localhost:9001 (`minio` / `miniosecret`)

## OTP in development

With `OTP_DEV_MODE=true` (default), OTPs are **not sent via SMS** — they are printed to the API server log with a banner, so you can complete the flow without an SMS provider. Switch to a real provider by setting `SMS_PROVIDER=msg91` (or `twilio`) and its credentials.

## LAN demo (other devices on the same Wi-Fi)

1. Find your laptop's LAN IP (e.g. `192.168.1.15`).
2. In `apps/web/.env.local` set `NEXT_PUBLIC_API_BASE_URL=http://192.168.1.15:4000`.
3. Start dev servers: Next.js binds to `0.0.0.0` by default; add `--hostname 0.0.0.0` to `dev:api` if needed.
4. Allow inbound TCP 3000 / 4000 in your OS firewall.
5. On other devices open `http://192.168.1.15:3000`.
6. Real OTPs over SMS work as long as the laptop has internet.

## Cloud deploy

See `OceanDraft_System_Design.md` §14.3 — target any container platform (ECS / Render / Fly.io), managed Postgres + Redis + S3, and set `OTP_DEV_MODE=false` with real SMS credentials.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs API + Web in parallel |
| `npm run build` | Builds both apps |
| `npm run prisma:migrate` | Applies Prisma migrations |
| `npm run prisma:seed` | Seeds admin + sample questions |
| `npm run docker:up` / `:down` | Starts/stops infra containers |

## Status

V1 MVP skeleton — candidate flow wired end-to-end, admin skeleton with auth + question CRUD scaffolding. See `OceanDraft_System_Design.md` §36 for the full roadmap.
