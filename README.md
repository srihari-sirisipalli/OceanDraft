# OceanDraft

> An event-booth one-question quiz that looks and sounds like a ship — compass, lighthouse, brass bells, foghorn, confetti. Visitors tap in, draw a random ticket, answer one marine / naval architecture question, and walk away with a pass or a shipwreck.

This README is written so a complete beginner — someone who has never touched Node.js or Docker — can clone the repo and have the booth running on their laptop in about fifteen minutes. If you already know what you're doing, skim the [Quick path](#quick-path-for-people-in-a-hurry) at the bottom.

Deep architecture & design: see [`OceanDraft_System_Design.md`](./OceanDraft_System_Design.md).

---

## Table of contents

1. [What is this, exactly?](#1-what-is-this-exactly)
2. [What you need installed first](#2-what-you-need-installed-first)
3. [Clone the repo](#3-clone-the-repo)
4. [Step-by-step local run](#4-step-by-step-local-run)
5. [Open the booth](#5-open-the-booth)
6. [Running as a real event booth](#6-running-as-a-real-event-booth)
7. [Admin panel tour](#7-admin-panel-tour)
8. [Common gotchas and how to fix them](#8-common-gotchas-and-how-to-fix-them)
9. [Sound, visual and reset toggles](#9-sound-visual-and-reset-toggles)
10. [LAN / Wi-Fi demo (other devices)](#10-lan--wi-fi-demo-other-devices)
11. [Going to production](#11-going-to-production)
12. [Architecture in one picture](#12-architecture-in-one-picture)
13. [Scripts cheatsheet](#13-scripts-cheatsheet)
14. [Quick path (for people in a hurry)](#quick-path-for-people-in-a-hurry)

---

## 1. What is this, exactly?

OceanDraft is a **single-question quiz booth** designed for events (career fairs, product launches, conferences). Each visitor:

1. Walks up to a laptop or tablet (the "booth").
2. Either taps "Take the challenge" (kiosk mode) or enters a mobile number + OTP (OTP mode).
3. Draws a unique ticket (a 4-digit number — the pool is actually smaller, but the number is inflated so it *feels* like hundreds).
4. Sees one random question, answers it within a timer, and gets an instant Hooray / Not quite / Time's up result with a contextual ocean scene and sound.
5. The screen waits for them to tap **Return to shore** — a silent 120-second safety timer brings the booth back to the landing page if nobody touches it.

Under the hood:
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion for page transitions, Web Audio API for all sounds (nothing ships as an mp3 — every bell, horn and wave crash is synthesised live in the browser).
- **Backend**: NestJS 10 + Prisma 5 on Postgres, Redis for session/cache, MinIO (S3-compatible) for question images.
- **Admin panel**: built into the same Next.js app under `/admin`.

---

## 2. What you need installed first

You need three tools on your machine. Install in this order:

| Tool | Why | Where to get it |
|---|---|---|
| **Node.js 20** | Runs the API and the web server | https://nodejs.org (pick the LTS build labelled "20.x") |
| **Docker Desktop** | Runs Postgres, Redis and MinIO so you don't have to install them separately | https://www.docker.com/products/docker-desktop/ |
| **Git** | Downloads this repo | https://git-scm.com/downloads |

After installing each, open a fresh terminal and check the versions — if any of these prints an error, re-install:

```bash
# what this does: prints the installed version of each tool
node --version    # expected: v20.x.x
npm --version     # expected: 10.x.x
docker --version  # expected: Docker version 24.x or newer
git --version     # expected: git version 2.x
```

On **Windows**, run these in PowerShell (it ships built-in — press `Win` and type "PowerShell"). You can also use Git Bash or WSL if you prefer a Unix shell.
On **macOS**, any Terminal works.
On **Linux**, any shell works; make sure `docker` is the Docker CE package, not `docker.io` from a very old repo.

> **Tip:** after installing Docker Desktop on Windows or Mac, **open the app once** — it needs to start the background engine before `docker` commands will work.

---

## 3. Clone the repo

Pick one of the two clone methods. If you don't know what SSH vs HTTPS means — use HTTPS.

```bash
# what this does: downloads the project into a folder called OceanDraft
git clone https://github.com/srihari-sirisipalli/OceanDraft.git
cd OceanDraft
```

Or with SSH (requires a GitHub SSH key on your machine):

```bash
git clone git@github.com:srihari-sirisipalli/OceanDraft.git
cd OceanDraft
```

Everything from here runs from the `OceanDraft/` folder unless noted.

---

## 4. Step-by-step local run

### 4.1 Install the Node packages

```bash
# what this does: installs every JavaScript dependency for both API and web
# time: 3–5 minutes on a reasonable connection
npm install
```

You should see a final line like `added 1234 packages in 4m`. If you see "npm ERR! code" — your Node version is probably wrong; re-check step 2.

### 4.2 Copy the three environment files

Environment files hold secrets and local URLs. The repo ships `.env.example` files (safe to read) — you copy them to their real-names-with-dot prefix so the apps can load them.

```bash
# macOS / Linux / Git Bash / WSL
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

The defaults are wired to match the Docker containers and dev-mode OTP — you don't have to edit anything to run locally. Important defaults worth knowing:

- **Dev OTP mode** is on — if you use the OTP flow, the 6-digit code is printed to the API server console; **no real SMS is sent**.
- **Default admin login** is `admin` / `ChangeMe!123456` (set in `.env`).
- `SESSION_COOKIE_SECRET` / `JWT_SECRET` should be changed before anyone else sees the booth. For first-run-on-your-laptop, the defaults are fine.

### 4.3 Start the Docker services

```bash
# what this does: starts Postgres, Redis, MinIO as background containers
npm run docker:up
```

Wait ~15 seconds for the containers to become healthy, then check:

```bash
# what this does: lists running containers — you should see three with STATUS "Up … (healthy)"
docker ps
```

Expected names: `oceandraft-postgres-1`, `oceandraft-redis-1`, `oceandraft-minio-1` (numbers may differ). If any are "unhealthy" or "Exited", see [gotchas](#8-common-gotchas-and-how-to-fix-them).

### 4.4 Create the database schema and seed demo data

```bash
# what this does: applies all Prisma migrations to create tables
npm run prisma:migrate
```

Expected output ends with: `All migrations have been successfully applied.`

```bash
# what this does: inserts the admin user, result templates, categories and ~103 demo questions
npm run prisma:seed
```

Expected output ends with: `Seed complete.`

### 4.5 (Optional) Import the 50-question Marine Quiz pack

If you have the file `Marine_Quiz_With_Images.xlsx` in the project root (ask the maintainer for a copy — it is **not** checked into git), you can add 50 more ship-trivia questions, 42 of them with embedded images:

```bash
# what this does: parses the Excel file, uploads embedded images to MinIO,
# creates 50 new questions under a "Ship Trivia" category
npm run -w @oceandraft/api import:marine-quiz
```

Expected output ends with something like: `Imported 50, skipped 0 duplicates, attached 42 images`.

Safe to re-run — already-imported questions are deduped by stem text.

### 4.6 Start the dev servers

```bash
# what this does: runs BOTH the API (:4000) and the web app (:3000) in parallel
npm run dev
```

Wait about 20 seconds. You want to see two groups of log lines intermixed:

- API: `Nest application successfully started` on port **4000**
- Web: `ready started server on 0.0.0.0:3000, url: http://localhost:3000`

If one of them crashes and the other keeps running, kill the command (`Ctrl+C`) and see the gotchas section.

---

## 5. Open the booth

With `npm run dev` still running, open a browser:

| Role | URL | Login |
|---|---|---|
| Candidate / booth | http://localhost:3000 | — no login, just tap "Take the challenge" |
| Admin panel | http://localhost:3000/admin/login | `admin` / `ChangeMe!123456` |
| MinIO console (image storage) | http://localhost:9001 | `minio` / `miniosecret` |

**First run checklist** — in the candidate flow you should see:
1. **Landing**: big "Can you read the tide?" headline over a drifting-ship background.
2. **Reveal**: a ticket number shuffles up to a 4-digit figure; a ship's bell plays.
3. **Question**: the question card appears with a timer. Image questions show a large photo on the left.
4. **Result**: confetti on correct, a symbolic sad scene (sunken compass / crying moon / broken anchor) on wrong, an hourglass / bottle / dark lighthouse on timeout. Grand horn fanfare on correct.

A mute button (speaker icon, top-right) silences all sounds and persists per browser.

---

## 6. Running as a real event booth

Two flags in the admin **Settings** page control the overall feel:

- `event.collect_mobile` — **off** for walk-up (kiosk) mode, **on** for OTP-gated mode.
- `event.kiosk_mode` — legacy kiosk-auto-reset toggle; the modern flow uses `result.auto_reset_fallback_seconds` (default 120) so a visitor who walked away resets the screen after 2 minutes of inactivity.

Other booth-operator toggles worth knowing — all live under admin `/admin/settings`:

- `branding.animations_enabled` — turn off to disable ship scenes, transitions and confetti (motion-sensitivity).
- `branding.sound_enabled` — global mute (visitors can still individually mute).
- `branding.ambient_ocean_enabled` — low background drone while reading the question.
- `result.auto_reset_fallback_enabled` / `_seconds` — the 120-second walk-away reset.
- `result.reveal_correct_on_fail` — when on, wrong answers also show the correct option on the result screen.

---

## 7. Admin panel tour

Sign in at http://localhost:3000/admin/login. Top-nav sections:

- **Questions** — the question bank. Create / edit / archive / re-order. Each question has a category, difficulty, type (TEXT / IMAGE / MIXED), answer type (SINGLE / MULTI), options, optional primary image, optional time limit. The **▶ Preview** button walks through every question in candidate-style layout — use the ← / → arrow keys or the on-screen buttons to page through, and jump with Home / End.
- **Categories** — organisational buckets. The scene-picker uses the slug here to pick a topic-matching ocean background ("navigation" → lighthouse, "propulsion" → container ship, and so on).
- **Media** — uploads the images used by questions. Stored in MinIO.
- **Templates** — pass / fail / timeout headlines shown on the result screen. Add as many as you like; one is picked at random per result. Keys must start with `HOORAY_` / `FAIL_` / `EXPIRE_`.
- **Settings** — toggles described above.
- **Attempts** — audit of every visitor, filter by date / status / correctness, export as XLSX.
- **Users** — add/remove admin accounts, assign roles, reset passwords.

---

## 8. Common gotchas and how to fix them

### `EADDRINUSE: address already in use :::3000`

Something else already owns port 3000 (usually a previous `npm run dev` left dangling).

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

```bash
# macOS / Linux
lsof -ti tcp:3000 | xargs kill -9
```

Same recipe with `4000` if the API won't start.

### `ECONNREFUSED ::1:4000` in the web console

The API isn't running. Either it crashed (scroll up in the `npm run dev` output) or you only started the web app in a sub-command. Re-run `npm run dev` from the root — it starts both.

### Docker container marked "unhealthy"

Inspect the logs to see what's unhappy:

```bash
docker compose logs postgres
docker compose logs redis
docker compose logs minio
```

Common cause: the port is already used by a different Postgres / Redis on your laptop. Stop the other service or edit `docker-compose.yml` to use a different host port.

### Prisma error `The table "…" does not exist`

You skipped the migrate step. Run:

```bash
npm run prisma:migrate
```

If you later change `apps/api/prisma/schema.prisma`, regenerate the client and re-migrate:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### OTP never arrives

In dev mode it is **not** sent by SMS — it's printed to the API console with a banner like `[OTP] 123456 for +919999999999`. Check the terminal running `npm run dev`. If you need a real SMS provider see section 11.

### Images don't load in the browser

MinIO is stopped or un-initialised. Bring it back up with `npm run docker:up`. The bucket is auto-created on first seed / first upload.

---

## 9. Sound, visual and reset toggles

There are two layers of control:

1. **Admin settings** (server-wide, affects every visitor)
   - `branding.animations_enabled` — ship scenes, page transitions, confetti.
   - `branding.sound_enabled` — all sounds.
   - `branding.ambient_ocean_enabled` — the low drone while reading.
   - `result.auto_reset_fallback_enabled` / `_seconds` — walk-away safety reset.

2. **Per-visitor local** (stored in the browser)
   - **Mute button** (speaker icon, top-right of every screen) — silences everything for just that browser. Persists across reloads.
   - **`prefers-reduced-motion`** — if the visitor's OS is set to reduce motion, all scene animations freeze and page transitions collapse to a 120 ms cross-fade. No config needed.

---

## 10. LAN / Wi-Fi demo (other devices)

You want to let other phones / laptops on the same Wi-Fi join as candidates while the admin stays on the booth laptop.

1. On the booth laptop find your LAN IP:
   - Windows: `ipconfig` → "IPv4 Address" under your Wi-Fi adapter.
   - macOS: `ipconfig getifaddr en0`.
   - Linux: `hostname -I`.
2. Edit `apps/web/.env.local` and set `NEXT_PUBLIC_API_BASE_URL=http://<LAN-IP>:4000`.
3. Allow inbound TCP 3000 and 4000 through your OS firewall.
4. Restart `npm run dev`.
5. On any device on the same Wi-Fi, open `http://<LAN-IP>:3000`.

Real OTP still requires the laptop to have internet — dev-mode OTP still prints to the API console.

---

## 11. Going to production

Short pointer — deep detail in `OceanDraft_System_Design.md` §14.3.

Essentials:
- Replace `SESSION_COOKIE_SECRET` and `JWT_SECRET` with long random strings.
- Set `OTP_DEV_MODE=false` and configure a real provider (`SMS_PROVIDER=msg91` or `twilio` + credentials).
- Provide a managed Postgres, Redis and S3 (or keep MinIO for self-hosted).
- Use `docker-compose.prod.yml` or a container platform (ECS, Render, Fly.io).
- Re-run `npm run prisma:migrate` on the production DB; then seed.

---

## 12. Architecture in one picture

```
                ┌───────────────────────────┐
                │  Next.js (apps/web) :3000 │
                │  • landing / reveal /     │
                │    question / result      │
                │  • admin panel (/admin)   │
                │  • page transitions       │
                │  • SVG scenes + Web Audio │
                └────────────┬──────────────┘
                             │ HTTP (JSON) + cookie session
                             ▼
                ┌───────────────────────────┐
                │  NestJS (apps/api) :4000  │
                │  • candidate sessions     │
                │  • assignment + attempt   │
                │  • admin CRUD             │
                │  • OTP / SMS abstraction  │
                │  • Prometheus metrics     │
                └──┬────────────┬───────────┘
                   │            │
        ┌──────────▼──┐  ┌──────▼─────────┐  ┌───────────────┐
        │  Postgres   │  │  Redis         │  │  MinIO (S3)   │
        │  (Prisma)   │  │  sessions/OTP  │  │  media blobs  │
        └─────────────┘  └────────────────┘  └───────────────┘
                  ↑                  ↑                  ↑
                  └──────── docker-compose up ──────────┘
```

---

## 13. Scripts cheatsheet

| Command | What it does |
|---|---|
| `npm install` | Install all deps (workspaces) |
| `npm run docker:up` / `:down` / `:logs` | Start / stop / tail infra containers |
| `npm run dev` | Run API + Web in parallel (dev mode) |
| `npm run build` | Build both apps for production |
| `npm run prisma:generate` | Regenerate the Prisma client after `schema.prisma` edits |
| `npm run prisma:migrate` | Apply pending DB migrations |
| `npm run prisma:seed` | Seed admin, categories, templates, demo questions |
| `npm run -w @oceandraft/api import:marine-quiz` | Import 50 ship-trivia questions from `Marine_Quiz_With_Images.xlsx` (optional) |
| `npm run -w @oceandraft/api update:marine-quiz-images` | Swap the ship-trivia images for resized ones from a folder-per-question tree (default `C:\Users\Sri\Downloads\quiz_images\quiz_images`, override with `--root`) |
| `npm run start:api` | Production-mode API |
| `npm run start:web` | Production-mode Web |

---

## Quick path (for people in a hurry)

```bash
git clone https://github.com/srihari-sirisipalli/OceanDraft.git
cd OceanDraft
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run docker:up
npm run prisma:migrate
npm run prisma:seed
npm run dev
# open http://localhost:3000
```

Admin: http://localhost:3000/admin/login — `admin` / `ChangeMe!123456`.

---

## License

Not yet specified. Ask the repo owner before redistributing.
