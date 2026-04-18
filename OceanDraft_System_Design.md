# OceanDraft — Marine & Naval Architecture Single-Question Assessment Platform
## System Design & Architecture Specification

---

## 1. Document Control

| Field | Value |
|---|---|
| **Title** | OceanDraft — Single-Question Assessment Platform with OTP Verification and Admin Panel |
| **Version** | 1.0 (V1 Design Baseline) |
| **Date** | 2026-04-18 |
| **Author** | *{{Lead Architect — placeholder}}* |
| **Reviewers** | *{{Product Owner, Engineering Lead, QA Lead, DevOps Lead — placeholders}}* |
| **Status** | Draft — Ready for Implementation Review |
| **Classification** | Internal — Engineering |
| **Intended Audience** | Founders & stakeholders, Product managers, UI/UX designers, Frontend & backend engineers, QA engineers, DevOps engineers, Security/compliance reviewers |
| **Change History** | v1.0 — Initial draft |

---

## 2. Executive Summary

**OceanDraft** is a web-based assessment platform themed around **marine engineering and naval architecture**. It verifies candidates via **mobile number + OTP**, optionally challenges them with a **captcha/random-number check**, then presents **exactly one question per attempt** (text-based or image-based). Upon submission, the system instantly records the result and displays either a **"Hooray" success page** or a **failure page**, both styled in a strong marine/shipyard aesthetic.

- **Who uses it**
  - **Candidates** — mobile-first users (students, interview candidates, conference attendees, trainees) attempting a single marine/NA question.
  - **Admins** — content owners and operators who manage questions, OTP settings, assignment logic, reports, and app settings via a secure admin panel.

- **Problem it solves**
  - Provides a **lightweight, high-integrity, single-question assessment** experience (e.g., at events, training booths, outreach campaigns, interview screening).
  - Enforces **identity verification (OTP)** and **anti-bot controls (captcha)** while keeping the candidate flow friction-minimal.
  - Centralizes all governance — question authoring, activation, assignment, review — in an admin panel.

- **High-level flow**
  1. Candidate enters **mobile number** → 2. System sends **OTP** via SMS gateway → 3. Candidate **verifies OTP** (and optional captcha) → 4. System assigns **1 question** from active pool → 5. Candidate **submits one answer** → 6. System evaluates → 7. **Hooray** (correct) or **Fail** (wrong) page with marine-themed visuals.

---

## 3. Product Goals and Non-Goals

### 3.1 Business Goals
- Engage marine/NA audiences with a memorable, single-question assessment.
- Capture verified-mobile leads with consent.
- Provide admin-controlled content and configuration for rapid campaign turnaround.
- Produce exportable reports for marketing/training analysis.

### 3.2 User Goals
- **Candidate**: quickly verify, attempt one question, get instant feedback, feel the marine theme.
- **Admin**: add/edit questions, control assignment rules and OTP, review attempts, export reports with minimal friction.

### 3.3 Technical Goals
- Responsive, accessible web app.
- Stateless API, horizontally scalable backend.
- Secure OTP handling, hashed at rest.
- Extensible schema for future multi-question exams.
- Operable on **localhost**, **LAN**, or **cloud** with minimal change.

### 3.4 Non-Goals (V1)
- No multi-question exams, sectioned papers, or time-limited test batteries.
- No proctoring (webcam/screen capture), no adaptive testing.
- No native mobile apps (responsive web only).
- No multilingual content (English only for V1; localization-ready).
- No payment, certification issuance, or third-party SSO.
- No public candidate profile accounts (mobile-only identity).

---

## 4. Assumptions

1. **OTP via SMS** is the sole primary-identity verification channel.
2. Captcha/random-number challenge is **optional** and toggled from admin settings; default = OFF in V1.
3. V1 question format = **single-choice, single-correct-answer (MCQ-SC)**.
4. Questions may be **text-only** or **image-based** (one primary image + optional per-option images).
5. **Exactly one submission** per attempt; no edit after submit.
6. Result is shown **immediately** post-submission (no async grading).
7. **Correct → Hooray; Wrong → Fail**. No partial credit.
8. **Per-mobile attempt policy** is admin-configurable (single-attempt-only vs. multiple attempts / cool-off window).
9. **Assignment mode** default for V1 = **"Random from Active Pool"**.
10. Timings & metadata are logged for every attempt.
11. Reports exportable as **CSV** and **Excel (.xlsx)**.
12. Admin architecture supports **roles/permissions from day one** (even if only one admin exists in V1).
13. Deployment: primary dev target = localhost; LAN and cloud supported with the same codebase.
14. **Relational database** preferred (PostgreSQL).
15. Product is **English-only** in V1 but strings are externalized for later i18n.
16. Reasonable V1 load: up to **~500 concurrent candidates, 10k attempts/day**.
17. Data subject (candidate) **consent** is captured before OTP is sent.

---

## 5. Scope

### 5.1 In Scope (V1)
- Candidate portal: mobile entry, OTP, optional captcha, 1 question, result page.
- Admin portal: auth, question/category CRUD, media upload, OTP & app settings, attempt log, reports (CSV/XLSX), audit log.
- SMS OTP via pluggable provider abstraction.
- Responsive UI with marine/naval theme.
- Deployment: localhost, LAN, cloud (single-region).

### 5.2 Out of Scope (V1)
- Multi-question exams, sections, negative marking.
- Native apps, offline mode.
- Proctoring, biometric verification.
- Multi-tenant SaaS, org hierarchy.
- Public API for third parties.
- Payment processing.

### 5.3 Future Scope (V2+)
- Multi-question tests & timers per question.
- Multi-language content, RTL support.
- Advanced analytics dashboards (cohort, funnels).
- OAuth/email verification alternatives.
- One-time-use question pool.
- Adaptive question selection & difficulty weighting.
- Webhook/third-party integration (CRM, Zapier).
- WhatsApp/email OTP channels.

---

## 6. Stakeholders and User Roles

| Role | Description | Primary Access | V1 Availability |
|---|---|---|---|
| **Candidate** | End user attempting the question | Candidate portal (no login, mobile+OTP) | Yes |
| **Admin** | Manages questions, settings, reports | Admin portal (username/password + MFA-ready) | Yes |
| **Super Admin** | Manages admins, roles, global config | Admin portal, elevated permissions | Schema-ready, single super admin seeded |
| **Operations / Support** | Monitors OTP delivery, assists stuck candidates | Admin portal (read-only scope) | Role defined, permissions granted on demand |
| **Developer / DevOps** | Builds, deploys, monitors | CI/CD, infra consoles, logs | Yes |
| **Auditor / Compliance** | Reviews audit log, data-handling controls | Admin portal read-only + DB snapshots | Role defined |

---

## 7. Functional Requirements

### 7.1 Candidate-Side Requirements

| ID | Requirement |
|---|---|
| C-01 | Entry screen accepts **mobile number** with country code selector (default +91; admin-configurable). |
| C-02 | Validate mobile format; reject obvious invalids before hitting backend. |
| C-03 | Consent checkbox + privacy-notice link **required** before OTP send. |
| C-04 | On submit, generate & send OTP via SMS gateway; show masked mobile on OTP screen. |
| C-05 | **OTP screen**: 6-digit input, 60-second resend cooldown, max 5 verify attempts, 5-minute expiry (configurable). |
| C-06 | **Resend OTP**: enabled after cooldown; max 3 resends per 15 minutes per mobile. |
| C-07 | **Invalid OTP** → show inline error, decrement remaining attempts, lock after limit. |
| C-08 | **Optional captcha/random-number challenge** screen inserted after OTP if enabled. |
| C-09 | **Instructions/start screen** with "Begin Assessment" CTA. |
| C-10 | **Question display**: renders stem, optional image, 2–6 options; clearly disabled state when submitting. |
| C-11 | **Text question handling**: supports markdown-light (bold, italic, subscript/superscript for formulas). |
| C-12 | **Image question handling**: image lazy-loaded, alt text mandatory, responsive scaling, zoom on click. |
| C-13 | **Answer submission**: single-select, submit button disabled until option chosen; confirmation modal optional (admin-config). |
| C-14 | **Timer tracking**: client starts on question-shown event; server authoritative timestamps recorded. |
| C-15 | **Immediate result** within ≤2 seconds typical latency. |
| C-16 | **Hooray page** on correct: marine theme, optional share/close CTA; admin-configurable copy. |
| C-17 | **Fail page** on wrong: encouraging copy, admin-configurable; may reveal correct answer (admin-config). |
| C-18 | **Retry rule**: block retry if per-mobile attempt policy says "single"; otherwise allow after cool-off. |
| C-19 | **Error states**: OTP send failure, no active questions, network error, session expiry — all with clear marine-themed messaging. |

### 7.2 Admin-Side Requirements

| ID | Requirement |
|---|---|
| A-01 | **Admin authentication**: username/password; session via secure HTTP-only cookie; MFA-ready. |
| A-02 | **Dashboard**: KPIs — attempts today/week/month, success %, active question count, OTP success %. |
| A-03 | **Question management**: CRUD with rich-text editor, image upload, option management, correct-answer flag, difficulty, tags. |
| A-04 | **Category management**: CRUD, parent/child hierarchy (1 level in V1), slugs. |
| A-05 | **Question assignment rules**: select mode (all same / random / category-random / manual-by-mobile), preview effective pool. |
| A-06 | **Activation/deactivation**: per question; bulk actions. |
| A-07 | **Candidate attempt log**: filter (date, mobile, category, result), sort, paginate, drill-down. |
| A-08 | **Result templates**: edit copy & media for Hooray/Fail pages; per-category overrides (optional). |
| A-09 | **OTP settings**: length, expiry, resend limits, provider selection, sender ID, template text. |
| A-10 | **App settings**: captcha on/off, attempt policy, default country code, privacy-notice URL, brand strings. |
| A-11 | **Export/reporting**: CSV/XLSX export with filters; background job for large exports. |
| A-12 | **Audit log**: every admin action (who, what, when, before/after snapshot). |
| A-13 | **Mobile attempt reset**: admin can clear attempts for a mobile (requires reason, audited). |
| A-14 | **Image/media library**: upload, rename, delete (soft), view usage references. |
| A-15 | **Search / filter / sort** throughout list views. |

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | OWASP Top-10 mitigated; OTP hashed at rest; RBAC-ready; all traffic HTTPS in non-dev environments. |
| **Performance** | p95 API latency < 400 ms under V1 load; question fetch < 250 ms; result page < 500 ms including network. |
| **Availability** | V1 target 99.5% (single region); cloud prod designed for 99.9% with multi-AZ. |
| **Scalability** | Stateless API; DB read replicas path; CDN for images. |
| **Maintainability** | Modular monolith (V1) → extractable services; linted, typed code; ≥70% unit coverage on core modules. |
| **Observability** | Structured JSON logs, request IDs, metrics, healthchecks, alerts. |
| **Accessibility** | WCAG 2.1 AA target for candidate flow. |
| **Usability** | Candidate flow ≤ 4 screens to question; mobile-first. |
| **Reliability** | Retry with backoff for SMS; idempotency keys on submit. |
| **Privacy** | Mobile numbers masked in reports by default; consent gated; retention configurable. |
| **Localization Readiness** | All UI strings in a resource file; left-to-right assumption but RTL-ready. |
| **Browser/Device Support** | Latest Chrome, Edge, Firefox, Safari; iOS Safari 14+, Android Chrome 90+; desktop 1280+ and mobile 360+ widths. |

---

## 9. Detailed User Journeys

### 9.1 Successful Candidate Attempt

```mermaid
flowchart TD
    A[Landing Page] --> B[Enter Mobile + Consent]
    B --> C[POST /otp/send]
    C --> D[OTP Screen]
    D --> E[Enter OTP]
    E --> F[POST /otp/verify]
    F -->|valid| G{Captcha enabled?}
    G -->|No| H[Start Instructions]
    G -->|Yes| I[Captcha Challenge]
    I --> H
    H --> J[GET /question/assign]
    J --> K[Question Screen]
    K --> L[Select Option + Submit]
    L --> M[POST /attempts/submit]
    M -->|correct| N[Hooray Page]
```

### 9.2 Wrong Answer Attempt
Same as 9.1 up to `M`; on wrong answer → **Fail Page** with themed imagery and optional "correct answer reveal" if admin enabled.

### 9.3 Expired OTP Flow
1. Candidate enters OTP after 5-min expiry → server responds `410 Gone — OTP_EXPIRED`.
2. UI shows "Your OTP has set with the tide 🌊 — please request a new one."
3. Resend button enabled immediately (subject to resend limits).

### 9.4 Resend OTP Flow
1. After 60s cooldown, resend enabled.
2. Tap resend → `POST /otp/resend` → same mobile, new OTP value, new expiry, count incremented.
3. Block at 3 resends in 15 min → "Please try again later" message.

### 9.5 Captcha-Enabled Flow
Inserted between successful OTP verify and instructions. Failure retries up to 3 times, then forced back to mobile entry.

### 9.6 Admin Creates a New Question

```mermaid
flowchart LR
    AL[Admin Login] --> AD[Dashboard] --> QL[Questions List]
    QL --> QN[New Question Form]
    QN --> QI[Upload Image optional]
    QI --> QO[Add Options + Mark Correct]
    QO --> QT[Select Category/Tags]
    QT --> QA[Activate toggle]
    QA --> QS[Save]
    QS --> LOG[Audit Log entry]
```

### 9.7 Admin Activates/Deactivates
Toggle on list view → confirmation → state updates → audit log captures who/when.

### 9.8 Admin Reviews Attempts
Attempts list → filter by date/mobile/result → drill to attempt detail → view question snapshot + answer chosen + correctness + timings.

### 9.9 Admin Exports Report
Filter attempts → Export → Choose format (CSV/XLSX) → Job queued → Downloadable link on completion + audit entry.

---

## 10. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Exactly **one question** is shown per candidate attempt. |
| BR-02 | Assignment modes supported: `ALL_SAME`, `RANDOM_ACTIVE` (default V1), `RANDOM_BY_CATEGORY`, `MANUAL_BY_MOBILE`. |
| BR-03 | Candidate may submit an answer **once**. Subsequent submissions for the same attempt_id are rejected. |
| BR-04 | Correctness = selected option's `is_correct = true`. Only one option may be marked correct in V1. |
| BR-05 | Pass/Fail: `PASS` iff correct; else `FAIL`. |
| BR-06 | Result page shown immediately and is a direct consequence of Pass/Fail. |
| BR-07 | Retry logic is configurable: `NO_RETRY`, `RETRY_AFTER_COOLDOWN_MIN` (default 0), `UNLIMITED`. |
| BR-08 | Per-mobile attempt policy: `SINGLE_LIFETIME`, `SINGLE_PER_DAY`, `UNLIMITED`. |
| BR-09 | Only `status = ACTIVE` questions are eligible for assignment. |
| BR-10 | If no active questions are available → show "Dry Dock" maintenance page; log event; alert admins. |
| BR-11 | Image-based questions require a valid `media_id` and non-empty `alt_text`. |
| BR-12 | Admin can **reset** a mobile's attempt history with a mandatory reason. |
| BR-13 | OTP is valid for the configured `otp_expiry_seconds`. Verification after expiry is rejected. |
| BR-14 | Maximum 5 OTP verification attempts per OTP, 3 resends per 15 minutes per mobile. |
| BR-15 | Consent checkbox must be checked **before** OTP send; consent timestamp stored. |
| BR-16 | All admin actions on questions, settings, attempts are audit-logged. |

---

## 11. Solution Overview / Architecture Summary

OceanDraft is a **modular monolith** at V1: a Next.js frontend (candidate + admin portals share the codebase but isolated routes) and a Node.js/NestJS backend exposing a versioned REST API, backed by PostgreSQL, with object storage (S3-compatible) for images and a pluggable SMS gateway for OTP. Redis provides OTP rate-limit counters and short-lived caches. The backend exposes healthchecks and emits structured logs and Prometheus metrics. The system ships with migrations, seed data (default admin + sample marine questions), and CI/CD. Deployment modes supported identically: **localhost dev**, **LAN/workgroup demo**, and **cloud production** (AWS/Render/Railway/Fly.io).

Key design choices:
- **Server-authoritative timings** avoid client clock abuse.
- **Idempotent submit** with `attempt_id + client_nonce` prevents double-submits.
- **SMS provider abstraction** (strategy pattern) lets ops swap providers (Twilio, MSG91, TextLocal, AWS SNS, Fast2SMS).
- **RBAC from day one** (admin/super-admin/ops/auditor) even if only one admin is seeded.
- **Marine theme** is a dedicated Tailwind preset + SVG asset pack.

---

## 12. Recommended Technology Stack

| Layer | Recommendation (V1) | Rationale | Alternatives |
|---|---|---|---|
| **Frontend** | **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion** | SSR/SSG, fast routing, typed, rich component ecosystem, easy theming | Vite + React, Remix, Nuxt |
| **Backend** | **Node.js 20 + NestJS + TypeScript** | Modular, DI, opinionated for monolith; straightforward for small teams | Express, Fastify, Django, Spring Boot |
| **Database** | **PostgreSQL 15** | Strong relational features, JSONB for flexible fields, open source | MySQL 8, MariaDB |
| **ORM** | **Prisma** | Type-safe schema, fast dev iteration, good migrations | TypeORM, Drizzle, Knex |
| **Cache / Rate-limit** | **Redis 7** | Token buckets, OTP attempt counters, session store | Memcached, in-memory (dev only) |
| **Object Storage** | **S3-compatible** (AWS S3 / MinIO locally) | Scales cheaply, CDN-friendly | Cloudflare R2, GCS, Azure Blob |
| **Auth (admin)** | **NextAuth (admin) + custom credential provider** + JWT/session cookie | Secure defaults, CSRF, rotation | Auth.js, Keycloak, Ory |
| **SMS/OTP** | **Provider abstraction** with default adapter = **MSG91 / Twilio / Fast2SMS** (India-first: MSG91) | India DLT compliance, global fallback via Twilio | AWS SNS, TextLocal |
| **Reporting/Export** | **ExcelJS** + stream CSV; **BullMQ** (Redis) for async jobs | Simple, runs on same infra | Pandas via Python worker (overkill for V1) |
| **Observability** | **pino** (logs) + **Prometheus** metrics + **Grafana** + **Sentry** | Open standards | ELK, Datadog |
| **Testing** | Jest (unit), Supertest (API), Playwright (E2E) | Widely adopted | Vitest, Cypress |
| **Deployment** | Docker + docker-compose (local/LAN) → **Render / Fly.io / AWS ECS** (cloud) | Portable; same image across envs | Vercel (frontend) + Render (API) |

**Why this stack fits:** TypeScript everywhere lowers context switching; Next.js gives one codebase for candidate and admin UIs with strong theming; NestJS enforces modular boundaries that ease future extraction into microservices; Postgres + Prisma cover the relational needs for questions/attempts/audit; Redis cleanly solves OTP rate-limit; Docker makes localhost/LAN/cloud parity trivial.

---

## 13. System Architecture

### 13.1 High-Level Component Diagram

```mermaid
flowchart LR
    subgraph Client
      CU[Candidate Browser]
      AU[Admin Browser]
    end

    subgraph Edge
      CDN[CDN / Static Assets]
      LB[HTTPS Load Balancer]
    end

    subgraph App[OceanDraft App Tier]
      FE[Next.js Frontend<br/>Candidate + Admin Routes]
      API[NestJS API Service]
      JOBS[BullMQ Worker<br/>Exports / Cleanups]
    end

    subgraph Data
      DB[(PostgreSQL)]
      CACHE[(Redis)]
      S3[(S3-compatible Object Store)]
    end

    subgraph External
      SMS[SMS Gateway<br/>MSG91 / Twilio]
      MON[Prometheus + Grafana + Sentry]
    end

    CU --> CDN
    AU --> CDN
    CU --> LB --> FE
    AU --> LB --> FE
    FE --> API
    API --> DB
    API --> CACHE
    API --> S3
    API --> SMS
    JOBS --> DB
    JOBS --> S3
    API --> MON
    JOBS --> MON
```

### 13.2 Frontend Components
- **Candidate app shell** (public routes): `/`, `/otp`, `/captcha`, `/start`, `/question`, `/result/hooray`, `/result/fail`, `/blocked`, `/dry-dock`.
- **Admin app shell** (protected routes under `/admin`): login, dashboard, questions, categories, attempts, settings, media, audit, reports.
- **Shared**: marine theme tokens, form primitives, toast system, error boundaries.

### 13.3 Backend Modules (NestJS)
`AuthModule`, `OtpModule`, `CaptchaModule`, `CandidateModule`, `QuestionModule`, `CategoryModule`, `MediaModule`, `AttemptModule`, `AssignmentModule`, `ResultModule`, `AdminModule`, `SettingsModule`, `ReportModule`, `AuditModule`, `HealthModule`.

### 13.4 Database, Storage, SMS Gateway, Monitoring
Covered in §12 and §14.

---

## 14. Deployment Architecture

### 14.1 Mode 1 — Localhost (Development, single machine)

```mermaid
flowchart LR
    DEV[Developer Browser<br/>http://localhost:3000] --> NEXT[Next.js dev]
    NEXT --> API[NestJS :4000]
    API --> PG[(Postgres :5432)]
    API --> RED[(Redis :6379)]
    API --> MINIO[(MinIO :9000)]
    API --> SMSX{SMS Provider?}
    SMSX -->|real key| MSG[MSG91 / Twilio]
    SMSX -->|no key| DEVLOG[Dev OTP: log to console/DB]
```

- Runs on the developer laptop only. Access = `http://localhost:3000` and API = `http://localhost:4000`.
- Docker Compose provisions Postgres, Redis, MinIO.
- **OTP delivery**: if internet available AND provider API key configured, real SMS is sent. If not, a **`DEV_OTP` mode** prints the OTP to the server log and to the DB (never shown to the candidate), so developers can test end-to-end.
- **Not accessible** from other devices on the LAN unless the dev server is bound to `0.0.0.0` and the firewall allows it.

### 14.2 Mode 2 — LAN / Local Network Demo

- Same Docker Compose stack, but services bind to the laptop's LAN IP (e.g., `192.168.1.15`).
- Colleagues/candidates on the **same Wi-Fi/workgroup** can open `http://192.168.1.15:3000`.
- Requires Windows/macOS firewall inbound rule on ports 3000/4000.
- **OTP works** as long as the laptop has internet → it calls the SMS gateway outbound.
- **No HTTPS** by default; use **`mkcert`** or a local CA for internal TLS, or expose via **ngrok / Cloudflare Tunnel** with HTTPS if external attendees need access.
- Not intended for sustained production use.

### 14.3 Mode 3 — Cloud Production Deployment

```mermaid
flowchart LR
    USR[Internet Users] --> DNS[Route53/Cloudflare DNS]
    DNS --> CF[Cloudflare/WAF]
    CF --> ALB[HTTPS ALB]
    ALB --> NEXTP[Next.js Containers]
    ALB --> APIP[NestJS Containers]
    APIP --> RDS[(RDS Postgres multi-AZ)]
    APIP --> ECR[(Managed Redis)]
    APIP --> S3P[(S3)]
    APIP --> MSGP[MSG91/Twilio]
    APIP --> SENTRY[Sentry]
    APIP --> PROM[Prometheus]
```

- Containers on **AWS ECS Fargate / Render / Fly.io**; managed Postgres and Redis.
- TLS via ACM/Cloudflare; WAF + rate-limit rules in front.
- **Environment separation**: `dev`, `staging`, `production` with distinct secrets and DBs.
- OTP delivery identical to LAN mode but with **production SMS credentials, DLT-registered sender IDs, template IDs**.

### 14.4 Security/Network Notes (all modes)
- Never log OTP plaintext beyond the dev-mode flag.
- Always hash OTPs at rest (even in dev DB).
- CORS: whitelist only expected origins.
- In LAN mode, disable `DEV_OTP` if candidates are real.

---

## 15. Module-Wise Design

### 15.1 Candidate Portal
- **Purpose**: deliver the one-question experience.
- **Responsibilities**: capture mobile & consent, orchestrate OTP/captcha, show question, capture submission, display result.
- **Inputs**: mobile, OTP, captcha answer, selected option, `attempt_id`, `client_nonce`.
- **Outputs**: page transitions, success/failure rendering.
- **Key APIs**: `/otp/send`, `/otp/verify`, `/captcha/*`, `/assignment/next`, `/attempts/submit`, `/attempts/:id/result`.
- **Validations**: client-side format checks + server-authoritative checks.
- **Failure handling**: retry UI for network blips, specific error codes → themed messages.

### 15.2 OTP Service
- **Purpose**: generate, deliver, verify OTPs with rate limiting.
- **Responsibilities**: OTP generation (secure RNG), hash + store, dispatch via `SmsProvider`, track verify attempts, expire.
- **Inputs**: mobile, session fingerprint.
- **Outputs**: `otp_request_id`, `expires_at`, delivery metadata; verification result.
- **Key APIs**: `send`, `resend`, `verify`.
- **Validations**: mobile format, cooldown, resend cap, attempt cap.
- **Failure handling**: SMS provider retries (exponential backoff, max 2), mark `DELIVERY_FAILED`, surface safe message.

### 15.3 Captcha / Random-Number Challenge Module
- **Purpose**: optional anti-bot barrier.
- **Responsibilities**: issue a short arithmetic/random-digit challenge tied to session; verify.
- **Inputs**: session token.
- **Outputs**: `challenge_id`, question text, expected hash stored server-side.
- **Validations**: one-challenge-per-session unless failed.
- **Failure**: 3 fails → restart flow.

### 15.4 Question Engine
- **Purpose**: manage question lifecycle and serve an assigned question.
- **Responsibilities**: CRUD, validate (exactly one correct), versioning, activation.
- **Inputs**: admin CRUD payloads; candidate "next question" request with session.
- **Outputs**: assigned question payload (safe — no correctness revealed).
- **Validations**: 2–6 options, exactly 1 correct, image (if any) resolves.
- **Failure**: no active questions → deterministic error → "Dry Dock".

### 15.5 Result Engine
- **Purpose**: evaluate a submission and decide result template.
- **Responsibilities**: match selected option to correct, compute timings, persist, build result payload.
- **Validations**: attempt must be `IN_PROGRESS`, selected option must belong to the assigned question.

### 15.6 Admin Panel
- **Purpose**: control plane for all config and content.
- **Responsibilities**: sections listed in §7.2.
- **Auth**: credentials + CSRF + rate-limit + session timeout.
- **Authorization**: RBAC enforced at API layer.

### 15.7 Reporting Module
- **Purpose**: generate filtered exports and on-screen reports.
- **Responsibilities**: query builder, async export job via BullMQ, signed URL for download.
- **Failure**: stuck jobs auto-marked failed after 10 min; admin can retry.

### 15.8 Settings Module
- **Purpose**: store and apply app-wide configuration.
- **Responsibilities**: typed key-value settings with validation, hot-reload by API.
- **Keys** (examples): `otp.length`, `otp.expiry_seconds`, `captcha.enabled`, `attempt.policy`, `result.reveal_correct_on_fail`, `theme.brand_name`.

### 15.9 Audit / Logging Module
- **Purpose**: tamper-evident record of admin and sensitive operations.
- **Responsibilities**: write `audit_logs`, include actor, action, entity, before/after JSON, IP, UA, `correlation_id`.

### 15.10 Media / Image Module
- **Purpose**: secure image uploads for questions/options/result pages.
- **Responsibilities**: validate MIME, size, dimensions; virus-scan hook; generate thumbnails; store to S3; return `media_id`.
- **Failure**: rejected uploads with specific reasons.

---

## 16. Screen / Page Inventory

### 16.1 Candidate Pages

| # | Page | Purpose | Fields | Actions | Validations | Success / Error | Role |
|---|---|---|---|---|---|---|---|
| 1 | **Landing** | Intro + mobile entry | Country code, Mobile, Consent checkbox | "Send OTP" | Valid mobile; consent checked | → OTP screen / inline errors | Candidate |
| 2 | **OTP Entry** | Verify OTP | 6-digit OTP | Verify / Resend / Change mobile | 6 digits numeric | → Captcha or Start / expired/invalid errors | Candidate |
| 3 | **Captcha** (optional) | Anti-bot | Challenge answer | Submit / Refresh | Correct answer | → Start / retry | Candidate |
| 4 | **Start Instructions** | Briefing | — | "Begin Assessment" | — | → Question | Candidate |
| 5 | **Question** | Show 1 question | Option radios | Submit | An option selected | → Result | Candidate |
| 6 | **Hooray Result** | Success | — | Done / Share | — | — | Candidate |
| 7 | **Fail Result** | Wrong answer | — | Done / (Retry if allowed) | — | — | Candidate |
| 8 | **Blocked** | Rate-limited | — | — | — | — | Candidate |
| 9 | **Dry Dock** | No active questions | — | — | — | — | Candidate |
| 10 | **Error / Network** | Generic fallback | — | Retry | — | — | Candidate |

### 16.2 Admin Pages

| # | Page | Purpose | Key Elements | Role |
|---|---|---|---|---|
| 11 | **Admin Login** | Auth | Username, Password, MFA (when enabled), Forgot password | Admin |
| 12 | **Dashboard** | KPIs | Attempts, success %, OTP health, quick links | Admin/Ops |
| 13 | **Questions List** | Browse questions | Filters, bulk actions, status toggle | Admin |
| 14 | **Question Editor** | Create/Edit | Stem editor, image upload, options, correct flag, category, tags, status | Admin |
| 15 | **Categories** | Manage categories | Tree view, CRUD | Admin |
| 16 | **Media Library** | Manage images | Upload, replace, delete, usage | Admin |
| 17 | **Assignment Rules** | Configure mode | Mode selector, category filter, preview pool | Admin |
| 18 | **Attempts** | Review attempts | Filters, drilldown | Admin/Ops/Auditor |
| 19 | **Attempt Detail** | Inspect one attempt | Question snapshot, selected option, timings | Admin/Auditor |
| 20 | **OTP Settings** | Configure OTP | Length, expiry, resend limits, provider | Super Admin |
| 21 | **App Settings** | Global config | Captcha, attempt policy, branding, privacy URL | Super Admin |
| 22 | **Result Templates** | Copy & media for Hooray/Fail | Rich editor | Admin |
| 23 | **Reports** | Export | Filters, export format, history | Admin/Auditor |
| 24 | **Audit Log** | Review changes | Filter by actor/entity/date | Super Admin/Auditor |
| 25 | **Admin Users** | (Super Admin only) Manage users & roles | CRUD, reset password | Super Admin |
| 26 | **My Profile** | Change password, MFA toggle | Form | Any admin |

Each admin page includes: breadcrumb, role-guarded visibility, standard toast for success/error, confirm dialogs for destructive actions.

---

## 17. API Design

Base URL: `/api/v1`. All admin endpoints require session cookie + CSRF header. All candidate endpoints require a short-lived `candidate_session_token` after OTP verification.

### 17.1 Candidate APIs

| Method | Path | Purpose | Request | Response | Auth | Codes |
|---|---|---|---|---|---|---|
| POST | `/candidates/init` | Create candidate + consent | `{ mobile, countryCode, consent: true }` | `{ candidateId }` | none | 201, 400, 429 |
| POST | `/otp/send` | Send OTP | `{ candidateId }` | `{ otpRequestId, expiresAt, resendAfter }` | none | 201, 429, 503 |
| POST | `/otp/resend` | Resend OTP | `{ otpRequestId }` | same as send | none | 201, 429 |
| POST | `/otp/verify` | Verify OTP | `{ otpRequestId, code }` | `{ sessionToken, captchaRequired }` | none | 200, 400, 410, 429 |
| GET | `/captcha/new` | New challenge | — | `{ challengeId, prompt }` | session | 200 |
| POST | `/captcha/verify` | Verify captcha | `{ challengeId, answer }` | `{ ok: true }` | session | 200, 400 |
| GET | `/assignment/next` | Fetch assigned question | — | `{ attemptId, question: { id, stem, options[], media? } }` | session | 200, 404 (no-active), 409 (already attempted) |
| POST | `/attempts/submit` | Submit answer | `{ attemptId, optionId, clientNonce, clientStartAt }` | `{ resultId }` | session | 201, 400, 409 (duplicate), 410 |
| GET | `/attempts/:resultId/result` | Fetch result | — | `{ status: CORRECT\|WRONG, template, correctOption?, timings }` | session | 200, 404 |

### 17.2 Admin Auth

| Method | Path | Purpose | Request | Response | Auth | Codes |
|---|---|---|---|---|---|---|
| POST | `/admin/auth/login` | Admin login | `{ username, password, mfaCode? }` | `{ adminId, roles[], csrfToken }` + cookie | none | 200, 401, 423 |
| POST | `/admin/auth/logout` | Logout | — | — | session | 204 |
| POST | `/admin/auth/change-password` | Rotate password | `{ oldPassword, newPassword }` | — | session | 204, 400 |

### 17.3 Admin Resource APIs

| Method | Path | Purpose | Auth Role | Notes |
|---|---|---|---|---|
| GET/POST/PATCH/DELETE | `/admin/questions[/:id]` | Question CRUD | admin | `PATCH /activate`, `/deactivate` |
| GET/POST/PATCH/DELETE | `/admin/categories[/:id]` | Category CRUD | admin | |
| POST | `/admin/media` | Upload image | admin | multipart/form-data, returns `{ mediaId, url }` |
| GET | `/admin/media/:id` | Get metadata | admin | |
| DELETE | `/admin/media/:id` | Soft delete | admin | rejected if in-use unless `force=true` |
| GET | `/admin/attempts` | List attempts | admin/ops/auditor | filters |
| GET | `/admin/attempts/:id` | Attempt detail | admin/ops/auditor | |
| POST | `/admin/attempts/reset` | Reset by mobile | admin | `{ mobile, reason }` |
| GET/PATCH | `/admin/settings/otp` | OTP settings | super_admin | |
| GET/PATCH | `/admin/settings/app` | App settings | super_admin | |
| GET/PATCH | `/admin/settings/assignment` | Assignment rules | admin | |
| GET/PATCH | `/admin/settings/result-templates` | Result templates | admin | |
| POST | `/admin/reports/export` | Start export | admin/auditor | `{ type, filters, format }` → `{ jobId }` |
| GET | `/admin/reports/jobs/:id` | Job status + download URL | admin/auditor | |
| GET | `/admin/audit-logs` | Audit list | super_admin/auditor | filters |
| GET | `/admin/dashboard/summary` | KPIs | admin | |

Typical status codes across admin APIs: `200/201/204` on success; `400` validation; `401` unauth; `403` forbidden; `404` not found; `409` conflict; `422` business rule; `429` rate-limited; `500` server.

### 17.4 Cross-cutting
- **Idempotency**: `Idempotency-Key` header supported on submit and on admin mutation endpoints.
- **Versioning**: URL path `/api/v1`; future `/api/v2`.
- **Errors**: standard envelope `{ code, message, details?, correlationId }`.

---

## 18. Data Model / Database Design

### 18.1 Entity-Relationship (Mermaid)

```mermaid
erDiagram
    admin_users ||--o{ admin_user_roles : has
    roles ||--o{ admin_user_roles : in
    roles ||--o{ role_permissions : grants
    permissions ||--o{ role_permissions : in
    candidates ||--o{ otp_requests : requests
    candidates ||--o{ candidate_sessions : opens
    candidate_sessions ||--o{ attempts : produces
    questions ||--o{ question_options : has
    questions }o--|| categories : in
    questions ||--o{ question_media : uses
    attempts }o--|| questions : shows
    attempts }o--|| question_options : selected
    attempts ||--|| result_records : yields
    candidates ||--o{ candidate_question_assignments : assigned
    admin_users ||--o{ audit_logs : writes
    admin_users ||--o{ exports : requests
```

### 18.2 Tables

#### 18.2.1 `admin_users`
- Purpose: admin-portal login identities.
- Columns: `id PK`, `username UQ`, `email UQ`, `password_hash`, `mfa_secret NULL`, `is_active`, `last_login_at`, `created_at`, `updated_at`.
- Indexes: `ux_username`, `ux_email`.

#### 18.2.2 `roles`, `permissions`, `role_permissions`, `admin_user_roles`
- Classic RBAC tables.
- Seed roles: `super_admin`, `admin`, `ops`, `auditor`.
- `permissions` examples: `question:create`, `question:update`, `question:delete`, `attempt:read`, `settings:update`, `audit:read`, `export:create`.

#### 18.2.3 `candidates`
- Purpose: mobile-identity record.
- Columns: `id PK`, `mobile_e164 UQ`, `country_code`, `consent_at`, `consent_ip`, `first_seen_at`, `last_seen_at`, `is_blocked bool`, `notes`.
- Indexes: `ux_mobile_e164`, `idx_last_seen_at`.

#### 18.2.4 `otp_requests`
- Columns: `id PK`, `candidate_id FK`, `otp_hash`, `otp_salt`, `generated_at`, `expires_at`, `verify_attempts`, `max_verify_attempts`, `resend_count`, `delivery_status` (`PENDING|SENT|DELIVERED|FAILED`), `provider`, `provider_message_id`, `ip`, `ua`, `status` (`ACTIVE|EXPIRED|CONSUMED|LOCKED`).
- Indexes: `idx_candidate_status`, `idx_expires_at`.

#### 18.2.5 `candidate_sessions`
- Columns: `id PK`, `candidate_id FK`, `session_token_hash UQ`, `issued_at`, `expires_at`, `captcha_verified bool`, `ip`, `ua`.
- Indexes: `ux_token_hash`, `idx_expires_at`.

#### 18.2.6 `categories`
- Columns: `id PK`, `name UQ`, `slug UQ`, `parent_id NULL FK(categories)`, `description`, `is_active`, timestamps.

#### 18.2.7 `questions`
- Columns: `id PK`, `title` (admin-only), `stem_markdown`, `type` (`TEXT|IMAGE|MIXED`), `difficulty` (`EASY|MEDIUM|HARD`), `category_id FK`, `primary_media_id FK NULL`, `is_active`, `version`, `tags text[]`, `created_by FK admin_users`, timestamps.
- Indexes: `idx_active_category`, `idx_tags_gin`, `idx_created_at`.

#### 18.2.8 `question_options`
- Columns: `id PK`, `question_id FK`, `order_index`, `text_markdown`, `media_id NULL FK`, `is_correct bool`, `created_at`.
- Constraint: exactly one `is_correct=true` per `question_id` (DB trigger or app-level validated on save).

#### 18.2.9 `question_media`
- Columns: `id PK`, `question_id FK`, `media_id FK`, `role` (`PRIMARY|OPTION|SUPPORT`), `created_at`.

#### 18.2.10 `media_assets`
- Columns: `id PK`, `storage_key`, `original_name`, `mime_type`, `size_bytes`, `width`, `height`, `checksum_sha256`, `alt_text`, `is_deleted`, `created_by`, timestamps.

#### 18.2.11 `candidate_question_assignments`
- Purpose: bookkeeping when mode is `MANUAL_BY_MOBILE` or to record "what was effectively assigned" for audit.
- Columns: `id PK`, `candidate_id FK`, `question_id FK`, `assigned_at`, `mode`, `assigned_by FK admin_users NULL`, `active bool`.

#### 18.2.12 `attempts`
- Purpose: each single-question attempt by a candidate.
- Columns: `id PK`, `candidate_id FK`, `session_id FK`, `question_id FK`, `question_version`, `selected_option_id FK NULL`, `status` (`IN_PROGRESS|SUBMITTED|EXPIRED|ABANDONED`), `is_correct bool NULL`, `started_at`, `question_shown_at`, `answer_submitted_at`, `time_taken_ms int`, `captcha_time_ms int NULL`, `client_nonce UQ`, `ip`, `ua`, `result_template_used`, `created_at`, `updated_at`.
- Indexes: `idx_candidate_status`, `idx_started_at`, `idx_question_id`.

#### 18.2.13 `result_records`
- Purpose: normalized result with rendered template.
- Columns: `id PK`, `attempt_id UQ FK`, `pass bool`, `template_id FK`, `content_snapshot JSONB`.

#### 18.2.14 `result_templates`
- Columns: `id PK`, `key` (`HOORAY_DEFAULT`, `FAIL_DEFAULT`, `HOORAY_CAT_<slug>`…), `headline`, `body_markdown`, `media_id NULL`, `reveal_correct_on_fail bool`, `is_active`, timestamps.

#### 18.2.15 `app_settings`
- Columns: `key PK`, `value_json`, `type`, `updated_by`, `updated_at`.

#### 18.2.16 `audit_logs`
- Columns: `id PK`, `actor_id FK admin_users NULL` (nullable for system), `actor_type` (`ADMIN|SYSTEM|CANDIDATE`), `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip`, `ua`, `correlation_id`, `created_at`.
- Indexes: `idx_entity`, `idx_actor_created`.

#### 18.2.17 `exports`
- Columns: `id PK`, `requested_by FK`, `report_type`, `filters_json`, `format` (`CSV|XLSX`), `status` (`QUEUED|RUNNING|DONE|FAILED`), `file_key`, `rows_count`, `error`, `created_at`, `completed_at`.

#### 18.2.18 `sms_provider_logs`
- Columns: `id PK`, `otp_request_id FK`, `provider`, `request_payload_json`, `response_payload_json`, `status`, `latency_ms`, `created_at`.

### 18.3 Suggested Indexes Summary

| Table | Index |
|---|---|
| candidates | `mobile_e164` unique |
| otp_requests | `(candidate_id, status)`, `expires_at` |
| attempts | `(candidate_id, status)`, `started_at desc`, `question_id` |
| questions | `(is_active, category_id)`, tags GIN |
| audit_logs | `(entity_type, entity_id)`, `(actor_id, created_at desc)` |
| candidate_sessions | `session_token_hash` unique, `expires_at` |

---

## 19. Question Assignment Design

### 19.1 Supported Modes

| Mode | Description | Data Needed | Use Case |
|---|---|---|---|
| `ALL_SAME` | Everyone gets the same designated question | `active_question_id` in settings | Campaign / single-question promo |
| `RANDOM_ACTIVE` | Uniform random from all `is_active=true` | question pool | General quiz, broad pool |
| `RANDOM_BY_CATEGORY` | Uniform random from a selected category | category filter | Theme-of-the-week, topical event |
| `MANUAL_BY_MOBILE` | Exact question preassigned to a mobile | `candidate_question_assignments` | VIP interviews, targeted tests |
| `ONE_TIME_USE_POOL` *(future)* | Each question served at most once globally | consumption tracking | Fair raffles, unique-question events |

### 19.2 Algorithm for V1 Default (`RANDOM_ACTIVE`)
1. On `GET /assignment/next`:
   - If per-mobile policy is `SINGLE_LIFETIME` and candidate has a prior `SUBMITTED` attempt → `409 Conflict`.
   - Else fetch question IDs where `is_active = true` (cached in Redis for 30s with invalidation on admin writes).
   - Apply exclusion list: questions this candidate already saw (from `attempts`).
   - If pool empty → `404 Dry Dock`.
   - Pick uniform random ID.
   - Create `attempt` row in `IN_PROGRESS` with `question_shown_at = now()`.
   - Return sanitized payload (no `is_correct` flag).

### 19.3 Trade-offs

| Mode | Pros | Cons |
|---|---|---|
| `ALL_SAME` | Simple, consistent experience | Zero variety; low reuse value |
| `RANDOM_ACTIVE` | Variety; easy to grow pool | Difficulty may vary unpredictably |
| `RANDOM_BY_CATEGORY` | Curated feel | Need good category coverage |
| `MANUAL_BY_MOBILE` | Full control for curated events | Ops overhead |
| `ONE_TIME_USE_POOL` | Fairness, scarcity | Pool depletion risk |

**Recommended for V1: `RANDOM_ACTIVE`**, with `ALL_SAME` supported via a single active question. `RANDOM_BY_CATEGORY` is a small config delta and should ship in V1 if timeline permits.

---

## 20. OTP Design

### 20.1 Generation Flow
1. Validate mobile (E.164).
2. Enforce rate-limits via Redis token buckets: 1 send / 60 s, ≤ 3 sends / 15 min per mobile, ≤ 100 sends / hour per IP.
3. Generate 6-digit OTP using `crypto.randomInt(0, 1_000_000)` (zero-padded).
4. Hash: `sha256(otp + salt)` with per-request salt; store `(hash, salt)` — **never plaintext**.
5. Dispatch via `SmsProvider.send({ to, message })`.
6. Persist `otp_requests` row with `expires_at = now + otp_expiry_seconds` (default 300).

### 20.2 Expiry, Resend, Retry
- Expiry default **5 minutes** (configurable 60–900 s).
- Resend cooldown **60 s**; max 3 resends / 15 min.
- Verify attempts max **5**; on reach → `status = LOCKED`; candidate must restart.

### 20.3 Rate Limiting
- Per mobile: Redis key `otp:send:<mobile>`.
- Per IP: `otp:send:ip:<ip>`.
- Per session: `otp:verify:<otpRequestId>`.

### 20.4 Secure Storage
- Hash at rest, short TTL.
- Purge expired OTPs nightly via `otp-cleanup` job.
- Never log OTP in non-dev envs; dev mode gated by `OTP_DEV_MODE=true` env.

### 20.5 SMS Provider Abstraction

```ts
interface SmsProvider {
  name: string;
  send(req: { to: string; text: string; templateId?: string }): Promise<SmsResult>;
  isHealthy(): Promise<boolean>;
}
```
Default: **MSG91** (DLT-registered, India) with Twilio fallback. Config: `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID`.

### 20.6 Delivery Logging
- `sms_provider_logs` captures payloads (with mobile masked) and latency.
- Delivery-report webhook endpoint (optional) updates `otp_requests.delivery_status`.

### 20.7 Failure Scenarios
| Scenario | Response | UI Message |
|---|---|---|
| Provider 5xx | Retry 2× with backoff; mark `FAILED` | "We couldn't send your code. Try again." |
| Invalid mobile region | 400 | "This mobile isn't supported yet." |
| Rate-limit hit | 429 | "Too many attempts. Come back in 15 minutes." |
| DLT template mismatch | log + alert | Generic failure to user |

### 20.8 Security Controls
- Constant-time compare on verify.
- CSRF on admin mutations.
- Correlation ID on every OTP lifecycle event.
- IP + UA logged for forensic review.

### 20.9 Development-Mode OTP on Localhost
- If `OTP_DEV_MODE=true` (never in prod), **skip SMS send** and:
  - Write OTP to server log with a prominent banner.
  - Store OTP plaintext in a dev-only field (feature flag gated).
  - Optionally expose `GET /dev/last-otp?mobile=...` (localhost-only bind).
- When a real SMS provider key is also present, prefer real send; dev mode is the fallback.

---

## 21. Captcha / Random-Number Challenge Design

- **Purpose**: prevent automation/bots from consuming OTPs or questions.
- **Toggle**: `app_settings.captcha.enabled` (default **false** in V1).
- **Placement**: after successful OTP verification, before the question is assigned.
- **Challenge types**:
  - `ARITHMETIC` — e.g., "What is 7 + 5?"
  - `RANDOM_DIGIT` — "Enter the 4-digit number shown".
- **Verification**: hashed expected answer stored in Redis under `challengeId`; 3 attempts; 60-s TTL.
- **Abuse prevention**: rate-limited per session & IP; fail 3× → kick back to mobile entry; log.
- **Recommendation for V1**: ship the module, default **OFF**; enable only if abuse observed. (Google reCAPTCHA can be integrated later as an alternative provider.)

---

## 22. Timing and Analytics Design

### 22.1 Timestamps Captured (server-authoritative)

| Field | Source | Table |
|---|---|---|
| `candidates.first_seen_at` | on `POST /candidates/init` | candidates |
| `otp_requests.generated_at` / `expires_at` | OTP service | otp_requests |
| OTP verified at | on successful verify | candidate_sessions.issued_at |
| `captcha_time_ms` | server-measured between challenge issued & verified | attempts |
| `attempts.question_shown_at` | on `/assignment/next` | attempts |
| `attempts.answer_submitted_at` | on submit | attempts |
| `attempts.time_taken_ms` | computed `submitted - shown` | attempts |
| `attempts.total_flow_time_ms` *(optional)* | `submitted - candidate first_seen` | attempts |

### 22.2 Analytics / KPIs (admin dashboard)

| KPI | Definition |
|---|---|
| Attempts (today / 7d / 30d) | count(attempts) filtered |
| Success rate | correct / submitted |
| Avg time-to-answer | avg(time_taken_ms) for submitted |
| OTP success rate | verified / sent |
| OTP send failure rate | failed / sent |
| Abandonment rate | (attempts — submitted) / attempts |
| Per-question correctness % | per `question_id` |
| Per-category correctness % | per `category_id` |
| Peak hours | histogram by hour |

Stored in DB; dashboard uses cached queries with 60-s TTL.

---

## 23. Reporting and Export Design

### 23.1 Reports

| Report | Columns (representative) |
|---|---|
| **Candidate Attempts** | attempt_id, masked_mobile, country, category, question_id, result, time_taken_ms, started_at, submitted_at |
| **Question Performance** | question_id, title, total_shown, total_correct, correctness_pct, avg_time_ms, is_active |
| **Category Performance** | category, total_attempts, avg_correctness_pct, avg_time_ms |
| **OTP Report** | date, sent, delivered, failed, provider, avg_latency_ms |
| **Audit Export** | audit_id, actor, action, entity, timestamp, ip |

### 23.2 Filters
- Date range, category, result, mobile prefix, difficulty, tag.
- Mobile masking by default (`+91 ******4321`); unmask requires elevated role.

### 23.3 Formats & Delivery
- **CSV** for large jobs (streamed).
- **XLSX** for formatted reports (ExcelJS).
- Generated via BullMQ worker; download link signed, 24-h TTL.

### 23.4 Access Control
- `admin` can export attempts; `super_admin`/`auditor` can export audit; `ops` read-only dashboards.

---

## 24. Validation Rules

### 24.1 Mobile Number
- E.164 with country code; total length 8–15.
- Numeric only after country code.
- Reject known premium/toll-free prefixes (configurable list).
- Normalize to E.164 before persisting.

### 24.2 OTP
- 6 digits, numeric, leading-zero allowed.
- Must match hashed server value; constant-time compare.
- Rejected if expired, locked, or consumed.

### 24.3 Captcha / Random Challenge
- Answer length per challenge type (1–6 chars).
- Must match case-insensitively.
- Single challenge per session unless refreshed.

### 24.4 Question Creation
- Title: 3–140 chars.
- Stem: 1–2000 chars markdown-light.
- Options: 2–6 items; each 1–300 chars.
- Exactly one `is_correct = true`.
- Category required.
- Tags: lowercase, kebab-case, max 10.

### 24.5 Option Creation
- Unique text within question.
- Media optional; if set, must exist and not be deleted.

### 24.6 Image Upload
- MIME: `image/png`, `image/jpeg`, `image/webp` only.
- Max size: 2 MB.
- Max dimensions: 3000×3000.
- Dimension min: 200×200.
- Magic-byte sniff + MIME match; reject mismatches.
- Scan via ClamAV (cloud mode).
- Alt text mandatory for question images used in candidate UI.

### 24.7 Answer Submission
- `attemptId` belongs to this session.
- `optionId` belongs to the assigned question.
- Attempt is `IN_PROGRESS`.
- `clientNonce` unique per attempt — replays rejected.

### 24.8 Admin Auth
- Password: ≥ 12 chars, at least 1 upper, 1 lower, 1 digit, 1 symbol.
- Lockout after 5 consecutive failures (15-min cool-off).
- MFA code when enabled — 6 digits TOTP.

### 24.9 Settings Forms
- Typed validation per key; numeric ranges enforced (e.g., `otp.expiry_seconds` ∈ [60, 900]).
- Dry-run preview before save for assignment rules.

---

## 25. Security Architecture

- **Authentication**: admins — credentials (Argon2id hashed) + optional TOTP MFA; candidates — mobile + OTP → short-lived session cookie (SameSite=Lax, HttpOnly, Secure in prod).
- **Authorization**: RBAC at API; deny-by-default; per-route guard annotations.
- **Session Handling**: signed tokens; rotation on privilege change; idle timeout 30 min (admin), 15 min (candidate); CSRF token required for mutating admin endpoints.
- **Admin Password Hashing**: Argon2id (`m=64MB, t=3, p=1`) with per-user salt.
- **CSRF**: double-submit cookie + header token.
- **XSS**: React escaping + strict CSP (`default-src 'self'; img-src 'self' data: <s3-domain>; script-src 'self';`).
- **SQL Injection**: parameterized queries via Prisma; no raw string concat.
- **Rate Limiting**: IP-based global; per-mobile OTP; per-session submit; sliding windows in Redis.
- **OTP Abuse Prevention**: caps, lockouts, `X-Forwarded-For` parsing with allowlisted proxies.
- **Audit Trails**: `audit_logs` for every admin mutation and sensitive read.
- **Secret Management**: `.env` in dev (git-ignored); Docker secrets or AWS Secrets Manager in prod; never commit.
- **HTTPS**: enforced in LAN/cloud; HSTS; TLS 1.2+.
- **File Upload Security**: MIME+magic sniffing; virus scan; random storage keys; no execution directory.
- **Input Sanitization**: server-side validators; markdown rendered through DOMPurify + whitelist.
- **Replay/Double-submit Prevention**: `Idempotency-Key` + `client_nonce`; attempts state machine `IN_PROGRESS → SUBMITTED` is terminal.
- **Headers**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`.
- **Dependency security**: weekly `npm audit`, Dependabot, SBOM in CI.

---

## 26. Privacy and Compliance Considerations

- **Mobile number collection**: minimal — only number + country code + consent. No name, email, address in V1.
- **Consent notice**: explicit checkbox with link to privacy policy; stored timestamp + IP.
- **Retention**: default **180 days** for candidate PII (configurable); anonymize after.
- **Masking**: mobile masked in all admin screens and exports by default; unmask requires explicit role (`attempt:unmask`) and logged.
- **Access control**: minimum-privilege roles; audit on unmask.
- **Log handling**: logs scrub phone numbers (replace middle 6 digits); 30-day log retention by default.
- **Deletion/archive**: candidates may request deletion via ops email → `POST /admin/candidates/:id/erase` (soft delete + scrub); cryptographic erasure in backups after retention window.
- **Regulatory notes (India focus)**: DLT registration for SMS templates; DPDP Act 2023 — consent, purpose limitation, data principal rights. GDPR comparable controls ready for EU candidates.

---

## 27. Error Handling Strategy

| Scenario | HTTP | Error Code | UI Behavior |
|---|---|---|---|
| Invalid mobile | 400 | `MOBILE_INVALID` | Inline field error |
| OTP send fail | 503 | `OTP_SEND_FAILED` | Toast, allow retry |
| OTP verify fail | 400 | `OTP_INVALID` | Decrement attempts, inline |
| OTP expired | 410 | `OTP_EXPIRED` | Prompt resend |
| Rate limited | 429 | `RATE_LIMITED` | Show cooldown timer |
| No active question | 404 | `NO_ACTIVE_QUESTION` | Dry-Dock page |
| Image load fail | — | client-side | Themed placeholder + retry |
| Submit fail (network) | — | — | Keep selection, auto-retry, idempotent |
| Duplicate submission | 409 | `ATTEMPT_ALREADY_SUBMITTED` | Redirect to result |
| Admin upload fail | 400 / 413 | `UPLOAD_INVALID` / `UPLOAD_TOO_LARGE` | Reason shown |
| Export generation fail | — | `EXPORT_FAILED` | Red banner, retry button |
| Session expired | 401 | `SESSION_EXPIRED` | Redirect to login / restart |

All errors use a common envelope `{ code, message, correlationId }` for support traceability.

---

## 28. Logging, Monitoring, and Auditability

- **Application logs**: pino JSON; levels `debug/info/warn/error`; shipped to stdout → collected by the platform (CloudWatch/Loki).
- **Security logs**: login success/failure, role change, sensitive reads (unmask), export generated.
- **OTP logs**: send/verify/resend events + provider responses (payloads scrubbed).
- **Admin action logs**: `audit_logs` table (primary) + mirrored to security log stream.
- **Operational dashboards (Grafana)**: request rate/latency, error rate, OTP funnel, DB connections, queue depth.
- **Alerts**: p95 API > 800 ms for 5 min; OTP failure % > 10%; DB > 80% CPU; queue backlog > 100; Sentry new errors.
- **Traceability**: `correlation_id` on every request; propagated into logs and audit entries.

---

## 29. Performance and Scalability Considerations

- **V1 load**: ~500 concurrent users, 10k attempts/day; single small API instance handles this easily.
- **Concurrent users**: horizontal scale stateless API behind ALB; session in Redis/JWT so no sticky sessions.
- **SMS bottlenecks**: provider is the bottleneck; implement queue + backoff + multiple providers failover.
- **Image delivery**: CDN in front of S3; pre-generated thumbnail (max 800 px) for mobile.
- **DB indexing**: see §18.3; partition `attempts` by month when > 50M rows.
- **Caching opportunities**: active-question pool (30 s TTL), settings (5 min), result templates (5 min).
- **Async jobs (future)**: exports, cleanup, webhook delivery reports, nightly analytics aggregates.
- **Read replica**: when read load > 500 rps on `attempts`.
- **Graceful degradation**: if SMS provider is down, surface message and queue retry.

---

## 30. Accessibility and UX Considerations

- **Mobile responsiveness**: mobile-first layouts; breakpoints 360/480/768/1024/1440.
- **Typography**: 16 px base; line-height 1.5; headline weight contrast.
- **Contrast**: WCAG AA minimum (4.5:1) on text; 3:1 on large text.
- **Touch targets**: ≥ 44×44 px.
- **Keyboard navigation**: full tab order in admin; visible focus rings; Esc closes modals.
- **Image alt text**: mandatory on question media; enforced at upload.
- **Loading states**: skeletons + marine-themed spinners; avoid unbounded loaders.
- **Error messaging**: plain language, marine metaphors (e.g., "Rough seas ahead — retry").
- **Reduced motion**: respect `prefers-reduced-motion`.
- **ARIA**: labels on inputs, roles on radio groups, live regions for result announcement.

---

## 31. Marine & Naval Architecture Theme Guidelines

### 31.1 Color Palette

| Token | Hex | Use |
|---|---|---|
| `deep-sea` | `#0B2540` | Primary surfaces, nav |
| `hull-navy` | `#123A5C` | Cards, headers |
| `blueprint-cyan` | `#2FB6C6` | Accents, links |
| `anchor-steel` | `#6B7E8F` | Secondary text |
| `sail-white` | `#F4F7FA` | Background |
| `brass-gold` | `#C59D5F` | Success accents, medals |
| `coral-red` | `#D9534F` | Error, fail states |
| `foam-green` | `#3DB27D` | Success confirmation |

### 31.2 Iconography
- Custom SVGs: anchor, compass rose, ship silhouette, propeller, lighthouse, buoy, wave lines, blueprint grid.
- Stroke-based icons, 1.5 px, for a technical/blueprint feel.

### 31.3 Typography
- **Display**: "IM Fell English" or "Cinzel" (classical nautical, used sparingly on heroes and Hooray page).
- **Headings**: "Inter" or "Space Grotesk" — modern engineering feel.
- **Body**: "Inter" 400/500.
- **Mono / technical**: "JetBrains Mono" on admin forms and IDs.

### 31.4 Imagery Style
- Blueprint grid backgrounds (low-opacity lines).
- Technical drawings of hulls, stability curves, propellers (watermarked).
- Hero imagery: stylized ships, dry-dock, compass roses.

### 31.5 Page Mood
- **Candidate**: calm, confident, exploratory. Gentle wave animation header.
- **Admin**: utilitarian shipyard-office — dense data, clear hierarchy, monospace accents.

### 31.6 Hooray / Fail Creative Direction
- **Hooray**: golden brass medal with compass rose, confetti of anchor icons, copy like *"Course set true — you've navigated this one perfectly!"*
- **Fail**: lighthouse in mist with warm-tone recovery message, copy like *"Rough seas today — every captain learns the charts. Try again soon."* (optionally reveal correct answer per admin settings).

---

## 32. Testing Strategy

### 32.1 Unit Tests
- OTP generation, hash/compare, rate-limit counters.
- Assignment algorithm edge cases (empty pool, exclusion).
- Validation schemas (mobile, question, options).
- Role/permission guards.

### 32.2 Integration Tests
- API flows through real Postgres+Redis (via testcontainers).
- SMS provider adapter with sandbox.
- Export job end-to-end.

### 32.3 API Tests
- Supertest contract tests per endpoint (happy + edge).
- Idempotency replay tests.
- Rate-limit tests.

### 32.4 UI Tests (Playwright)
- Candidate happy path mobile/desktop.
- OTP expired/resend paths.
- Captcha-enabled path.
- Admin login → create question → activate → see on candidate side.

### 32.5 Security Tests
- OWASP ZAP baseline scan in CI.
- Authn bypass, IDOR, SSRF attempts on media upload.
- CSRF and XSS probes.
- Brute-force OTP simulation → verify lockouts.

### 32.6 OTP Flow Tests
- Matrix: valid, invalid, expired, locked, rate-limited, resend, provider-failed.

### 32.7 Image Question Tests
- Large image rejection, alt-text enforcement, broken-media fallback.

### 32.8 Report Tests
- Small and large exports; mobile masking; concurrent jobs.

### 32.9 Admin Workflow Tests
- Role-scoped access, audit-log emission correctness.

### 32.10 Edge Cases
- Clock skew, DST, network flap mid-submit, duplicate nonce, candidate refreshing on question screen.

### 32.11 Performance Tests
- k6 scripts: 500 concurrent users, 100 RPS assignment, 50 RPS submit.

---

## 33. DevOps and Release Considerations

- **Environments**: `dev` (local), `staging`, `production`.
- **Config management**: 12-factor env vars; config schema in code validated at boot.
- **Secrets**: dev `.env` (git-ignored), prod via AWS Secrets Manager / Render env.
- **CI/CD**: GitHub Actions — steps: install, typecheck, lint, unit, integration, build Docker, push ECR, deploy to staging, Playwright smoke, approval gate, deploy to prod.
- **Backups**: nightly PG snapshots (7 daily, 4 weekly, 12 monthly); S3 bucket versioning for media.
- **Restore**: quarterly restore drill; RTO 2 h, RPO 24 h (V1).
- **Migrations**: Prisma Migrate; `migrate deploy` in release pipeline; blue/green for schema changes with feature flags.
- **Rollback**: container image tag rollback via pipeline; DB rollback via forward-migrations (preferred) or from snapshot for catastrophic cases.
- **Feature flags**: simple env-driven flags in V1 (`CAPTCHA_ENABLED`, `OTP_DEV_MODE`).
- **Release cadence**: weekly staging, bi-weekly prod (V1).

---

## 34. Risks and Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R-01 | SMS delivery failure / high latency | High (blocks candidate) | Medium | Provider abstraction + failover; async retry; health alerts |
| R-02 | Localhost misunderstanding (demo expected on other devices) | Medium | High | Doc LAN mode; provide `LAN_MODE=true` helper script and firewall guide |
| R-03 | Admin misuse / data exposure | High | Low | RBAC, audit logs, mobile masking, MFA-ready |
| R-04 | No active questions configured | Medium | Medium | "Dry Dock" page + admin dashboard warning + seed data |
| R-05 | Image upload abuse (malware, oversize) | Medium | Medium | MIME+magic sniff, size caps, AV scan, random keys |
| R-06 | Privacy breach of mobile numbers | High | Low | Masking, retention policy, restricted unmask role |
| R-07 | OTP abuse / bot floods | Medium | Medium | Rate limits, captcha toggle, IP reputation |
| R-08 | SMS cost spike (attacker-driven) | Medium | Low | Per-IP/mobile caps + daily global cap with alert |
| R-09 | Clock skew on candidate device | Low | Medium | Server-authoritative timings |
| R-10 | Data loss | High | Low | Backups + restore drills |
| R-11 | Vendor lock-in (SMS provider) | Low | Medium | Provider abstraction |
| R-12 | DLT/regulatory compliance lapse (India) | High | Low | Pre-register templates; ops checklist before go-live |

---

## 35. Open Questions / Decision Log

1. **Default per-mobile policy** — SINGLE_LIFETIME vs SINGLE_PER_DAY? *(Assumption: SINGLE_LIFETIME.)*
2. Should **correct answer be revealed** on failure page by default? *(Assumption: configurable, default OFF.)*
3. **Supported country codes** at launch? *(Assumption: India +91 default; configurable allowlist.)*
4. Is **captcha** required for launch? *(Assumption: OFF in V1.)*
5. **SMS provider** final choice — MSG91 vs Twilio vs Fast2SMS? *(Assumption: MSG91 primary with DLT; Twilio fallback for international.)*
6. **MFA** for admins required at V1 or V1.1? *(Assumption: schema-ready, mandatory from V1.1.)*
7. **Retention period** for candidate PII — 90 / 180 / 365 days? *(Assumption: 180 days.)*
8. Who owns the **privacy policy URL**? *(Placeholder.)*
9. Is a **public-facing domain** chosen (e.g., `oceandraft.app`)?
10. Do stakeholders want **branding per campaign** (multi-theme)? *(Assumption: single brand V1.)*
11. Will there be **Hindi/regional language** content in V1 for SMS templates?
12. **Hosting budget envelope** (Render vs AWS)?
13. Should there be an **admin "impersonate candidate" tool** for support? *(Security review required.)*

---

## 36. Recommended Implementation Roadmap

### Phase 1 — MVP (Weeks 1–6)
1. Week 1: Repo bootstrap, Docker Compose, schema + migrations, RBAC seed, CI skeleton.
2. Week 2: Auth (admin), Admin shell, Questions CRUD, Media upload, Categories.
3. Week 3: Candidate flow (mobile entry, OTP send/verify, session), SMS provider abstraction.
4. Week 4: Assignment engine (RANDOM_ACTIVE), Attempt lifecycle, Result pages (Hooray/Fail) with marine theme.
5. Week 5: Settings module, Attempts list, CSV/XLSX export, Audit logs, Dashboard KPIs.
6. Week 6: Hardening — rate limits, security headers, E2E tests, performance pass, staging deploy, UAT.

**Why this order:** unblocks admin content authoring early so the candidate experience can be demoed with real questions by Week 4.

### Phase 2 (Weeks 7–10)
- Captcha module (enable in settings).
- RANDOM_BY_CATEGORY, MANUAL_BY_MOBILE modes.
- Advanced reports (question/category performance).
- MFA for admins.
- Cloud production deployment.
- Full WCAG AA audit.

### Phase 3 (Weeks 11+)
- Multi-question tests.
- Localization.
- ONE_TIME_USE_POOL.
- Webhooks & CRM integration.
- Proctoring-lite (device fingerprint, tab-switch detection).

---

## 37. Appendix

### 37.1 Glossary

| Term | Definition |
|---|---|
| **OTP** | One-Time Password delivered via SMS for mobile verification. |
| **Attempt** | A single candidate session in which exactly one question is shown and answered. |
| **Assignment** | The process of selecting which question to show to a candidate. |
| **Dry Dock** | Maintenance-mode page shown when no active questions are available. |
| **RBAC** | Role-Based Access Control. |
| **DLT** | Distributed Ledger Template registration (India SMS compliance). |
| **E.164** | International telephone numbering format, e.g., `+919876543210`. |

### 37.2 Acronyms

| Acronym | Meaning |
|---|---|
| **MCQ-SC** | Multiple Choice Question, Single-Correct |
| **NA** | Naval Architecture |
| **CDN** | Content Delivery Network |
| **DPDP** | Digital Personal Data Protection (Act, India) |
| **WCAG** | Web Content Accessibility Guidelines |
| **RTO / RPO** | Recovery Time / Point Objective |
| **TOTP** | Time-based One-Time Password (for MFA) |
| **SBOM** | Software Bill of Materials |

### 37.3 Sample Configuration (`.env`)
```env
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000
DATABASE_URL=postgres://ocean:ocean@localhost:5432/oceandraft
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=oceandraft-media
S3_KEY=minio
S3_SECRET=miniosecret
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=__set_in_prod__
MSG91_SENDER_ID=OCNDFT
MSG91_TEMPLATE_ID=__set_in_prod__
OTP_LENGTH=6
OTP_EXPIRY_SECONDS=300
OTP_RESEND_COOLDOWN=60
OTP_MAX_RESENDS_PER_15M=3
OTP_DEV_MODE=true
CAPTCHA_ENABLED=false
ATTEMPT_POLICY=SINGLE_LIFETIME
ASSIGNMENT_MODE=RANDOM_ACTIVE
ADMIN_SESSION_IDLE_MIN=30
CANDIDATE_SESSION_IDLE_MIN=15
```

### 37.4 Sample App Settings Keys

| Key | Type | Example | Notes |
|---|---|---|---|
| `otp.length` | int | 6 | 4–8 |
| `otp.expiry_seconds` | int | 300 | 60–900 |
| `otp.max_resends_per_15m` | int | 3 | |
| `captcha.enabled` | bool | false | |
| `captcha.type` | enum | ARITHMETIC | ARITHMETIC, RANDOM_DIGIT |
| `attempt.policy` | enum | SINGLE_LIFETIME | SINGLE_LIFETIME, SINGLE_PER_DAY, UNLIMITED |
| `assignment.mode` | enum | RANDOM_ACTIVE | |
| `result.reveal_correct_on_fail` | bool | false | |
| `branding.product_name` | string | OceanDraft | |
| `privacy.policy_url` | url | https://… | |

### 37.5 Sample Status Enums

- **AttemptStatus**: `IN_PROGRESS`, `SUBMITTED`, `EXPIRED`, `ABANDONED`.
- **OtpStatus**: `ACTIVE`, `EXPIRED`, `CONSUMED`, `LOCKED`.
- **OtpDelivery**: `PENDING`, `SENT`, `DELIVERED`, `FAILED`.
- **QuestionType**: `TEXT`, `IMAGE`, `MIXED`.
- **AssignmentMode**: `ALL_SAME`, `RANDOM_ACTIVE`, `RANDOM_BY_CATEGORY`, `MANUAL_BY_MOBILE`, `ONE_TIME_USE_POOL`.
- **ExportStatus**: `QUEUED`, `RUNNING`, `DONE`, `FAILED`.
- **ExportFormat**: `CSV`, `XLSX`.
- **Result**: `CORRECT`, `WRONG`.

### 37.6 Sample Report Columns — Candidate Attempts CSV
`attempt_id, candidate_id, masked_mobile, country_code, category, question_id, question_title, result, is_correct, time_taken_ms, question_shown_at_utc, answer_submitted_at_utc, ip, ua`

### 37.7 Sample Seed Questions (marine theme)

| # | Stem | Options | Correct |
|---|---|---|---|
| 1 | What does the metacentric height (GM) primarily indicate? | A) Propeller efficiency · B) Ship's initial stability · C) Fuel consumption · D) Hull fouling | B |
| 2 | Which curve plots righting arm vs heel angle? | A) Bonjean · B) GZ curve · C) Froude curve · D) Load line | B |
| 3 | [Image: hull cross-section] Identify the waterline. | A · B · C · D | *(admin-defined)* |
| 4 | Primary purpose of bilge keels? | A) Speed · B) Roll damping · C) Cooling · D) Cathodic protection | B |
| 5 | SOLAS stands for? | A) Safety of Life at Sea · B) Ship Oil & Liquid Assay System · C) Sea Operations & Landing Accords · D) None | A |

---

*End of document — OceanDraft V1 System Design Specification.*
