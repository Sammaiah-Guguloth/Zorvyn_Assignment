# Thought Process — Zorvyn Assignment

> This document walks through my thinking from the moment I read the assignment to the final implementation. Every decision here has a reason — and I've tried to be honest about the tradeoffs, the dead ends, and the choices I made along the way.

---

## Step 1 — Reading the Assignment

The first thing I did was read the assignment carefully, twice. Not to start coding, but to understand what was actually being asked.

A few things stood out immediately:

- There are **three distinct roles** — each with different levels of trust and access.
- The system is fundamentally about **financial records** — meaning data integrity and audit trails matter.
- There's an expectation of **email communication** between the system and users.
- Analytics is a first-class concern, not an afterthought.

Once I had a mental model of the domain, I moved on to breaking down each role individually before touching any code or folder structure.

---

## Step 2 — Defining the Roles

This was genuinely the most important step. Getting the roles wrong would cascade into bad API design, bad middleware logic, and bad data models. So I spent time here.

### Admin
The Admin is the root of the system. They are the only ones who can create users, manage them, and write financial records. I noted that the Admin itself can't self-register — there needs to be a **bootstrapping mechanism**. The clean solution is a seed script that reads credentials from `.env` and creates the initial Admin on first run. This avoids hardcoding credentials in the codebase and keeps it environment-specific.

When the Admin creates a new user, a **temporary password** should be sent to that user's email automatically — that's where Nodemailer comes in.

### Analyst
The Analyst is a read-heavy role. They can log in, change their password, view records with filters, and access summary-level analytics. They cannot write or delete records, and they cannot see deep financial stats (which felt more sensitive and admin-facing).

### Viewer
The Viewer is the most restricted role. They can log in, change their password, and view records — but they cannot access any analytics at all. They're purely a data reader, not an interpreter.

This three-tier structure made the permission matrix very clear in my head before I wrote a single line of middleware.

---

## Step 3 — Designing the API Endpoints

With roles defined, API design became a mechanical process of asking: *"who does what?"*

I grouped endpoints into four categories:

**Auth (Public)**
- `POST /auth/login` — All roles. Validates status is `active` before issuing a token.
- `POST /auth/change-password` — Required especially for Analysts and Viewers on first login with a temporary password.

**Admin (Admin Only)**
- `POST /admin/users` — Create a user and trigger an email with credentials.
- `GET /admin/users` — List all users.
- `PATCH /admin/users/:id/status` — Toggle a user's active/inactive state.
- `DELETE /admin/users/:id` — Remove a user.

**Records**
- `POST /records` — Create a financial entry. Admin only.
- `PATCH /records/:id` — Update an entry. Admin only.
- `DELETE /records/:id` — Soft delete. Admin only.
- `GET /records` — List with filters. Admin, Analyst, and Viewer can all read.

**Analytics**
- `GET /analytics/summary` — Net balance, total income, total expenses. Admin and Analyst.
- `GET /analytics/stats` — Category-wise breakdown and monthly trends. Admin only, given data sensitivity.

The separation of `summary` and `stats` was deliberate — summary is high-level enough to share with Analysts, but detailed statistical breakdowns felt like something only an Admin should see.

---

## Step 4 — Brainstorming the Problems

Before writing any code, I paused to think about what could go wrong. This is a habit I've built — anticipate edge cases early, even if you don't solve all of them immediately.

### Problem 1 — Token Validity After Account Deactivation

If an Admin deactivates a user's account, that user might still hold a valid JWT for hours or days. That's a security hole.

Two approaches I considered:

**Option A — Token Blacklist:** Create a `BlacklistedToken` schema in MongoDB and check every request against it. Very secure, but adds a DB lookup on every authenticated request, which felt heavy for this scale.

**Option B — Status Check on Every Request:** Simply check `user.status === 'active'` inside the auth middleware on every request. If the Admin deactivates someone, their next request will be denied — no blacklist needed.

I went with Option B. It's simpler, still secure, and avoids the overhead of an extra collection. The trade-off is a small window between deactivation and the user's current request — but for this use case, that's acceptable.

### Problem 2 — Soft-Deleted Records in Analytics

Once I decided on soft delete, I had to make sure deleted records are **never counted** in analytics aggregations or record listings. This needs to be enforced globally and consistently — not left to individual queries.

My solution: every query adds `deletedAt: null` to the filter by default. This is enforced at the query level across both the record controller and the analytics service.

### Problem 3 — Restore Feature

Financial systems are unforgiving. A user might delete a transaction by mistake, and you can't just "undo" that with a hard delete. Soft delete opens the door to a restore endpoint:

```
PATCH /records/:id/restore
```

I noted this as a potential improvement. For the scope of this assignment I focused on getting the core right, but the schema already supports it — `deletedAt` and `deletedBy` are both stored.

### Problem 4 — How to Implement Soft Delete

Three options I considered:

1. **Boolean flag** (`isDeleted: true/false`) — Simple, but loses the audit trail of when it happened.
2. **Cron job pruning** — Mark for deletion, clean up with a scheduled job. Adds operational complexity.
3. **Timestamp + audit fields** (`deletedAt`, `deletedBy`) — Richer, preserves history, supports restore logic.

I went with option 3. It gives you a full audit trail, supports the restore pattern, and costs almost nothing extra in storage. In financial systems, you almost always want to know *who* deleted something and *when*.

---

## Step 5 — Choosing the Tech Stack

Every choice here was intentional.

### Node.js + Express
Fast to build with, well-suited for JSON APIs, and non-blocking I/O handles concurrent requests cleanly. Express 5 gives async error propagation out of the box, which simplifies the global error handler. This wasn't about using the trendiest tool — it was about picking something that lets the architecture breathe.

### MongoDB + Mongoose
Two reasons: **schema flexibility** and **aggregation pipelines**.

Financial records tend to evolve — new fields, new categories, new metadata. A document model handles that more gracefully than rigid SQL tables. More importantly, MongoDB's aggregation pipeline is a natural fit for the analytics requirements — grouping by category, summing by type, and computing monthly trends are all things it handles natively without complex joins.

MongoDB Atlas was also a factor — easy to deploy, no infrastructure management needed.

### Zod
I needed request validation that was schema-first, composable, and lived close to the route layer — not scattered through controller logic. Zod gives you that. It also gives detailed, structured error messages which plug cleanly into the global error handler.

### JWT + bcryptjs
JWT for stateless authentication — no session state to manage, scales easily. HTTP-only cookies for delivery rather than `Authorization` headers, which protects against XSS. `bcryptjs` with a cost factor of 12 for password hashing — strong enough for production without being prohibitively slow.

### Nodemailer
Straightforward SMTP email delivery. Used specifically for the user creation flow where the Admin creates a new account and the system emails that user their temporary credentials. Configured via environment variables so it works with any SMTP provider (Gmail, SendGrid, etc.).

### Jest + Supertest + mongodb-memory-server
Jest is the testing standard for Node.js. Supertest lets you make real HTTP requests against the app without spinning up a live server. `mongodb-memory-server` spins up an in-memory MongoDB instance for tests — no external database required, tests are fast and isolated, and CI is trivial to set up. This combination covers auth flows, role enforcement, record operations, and analytics in a clean, reproducible way.

---

## Step 6 — Data Modelling

I kept models intentionally lean — only two: `User` and `Record`.

I considered a separate `Analytics` model to cache computed results, but dropped it. It would have introduced cache invalidation complexity and a stale data problem. MongoDB's aggregation pipelines run fast enough at this scale that computing on the fly is the right call.

**User model highlights:**
- `role` as an enum (`admin`, `analyst`, `viewer`) — controlled vocabulary, no freeform strings.
- `status` as an enum (`active`, `inactive`) — drives the auth gate.
- `isPasswordReset` boolean — tracks whether the user has changed their temporary password. Useful for enforcing a first-login flow.
- `password` with `select: false` — never returned in queries by default.

**Record model highlights:**
- `deletedAt` and `deletedBy` for the soft-delete audit trail.
- `createdBy` reference to User — every record knows who created it.
- A compound index on `{ deletedAt, type, date }` — this was a deliberate performance decision. The most common query pattern is filtering active records by type and sorting by date. The index makes that fast without a full collection scan.

---

## Step 7 — Folder Structure

I wanted the folder structure to communicate the architecture at a glance. Anyone opening this repo should immediately understand the separation of concerns.

```
src/
├── config/        → External connections (DB, Mailer)
├── models/        → Mongoose schemas
├── controllers/   → HTTP layer — parse request, call service or model, send response
├── services/      → Business logic that doesn't belong in a controller (analytics aggregations)
├── routes/        → Express routers — wiring endpoints to controllers and middleware
├── middlewares/   → Cross-cutting concerns (auth, role guard, validation, error handling)
├── validations/   → Zod schemas — one file per domain
└── utils/         → Shared primitives (AppError, catchAsync, constants)
```

The key architectural decision here is the **controller → service split**. Controllers are thin — they handle the HTTP contract (parse request, send response). Services contain the logic that's complex enough to warrant its own layer and its own tests. Analytics aggregation pipelines live in `analytics.service.js` for exactly this reason.

Middleware is also split by concern rather than lumped together — `auth.middleware.js` handles token verification and user loading, `role.middleware.js` handles the RBAC check, `validate.middleware.js` runs Zod schemas. Each one does exactly one thing.

---

## Step 8 — Implementation Plan

With everything above clear, I broke the build into stages:

1. Project setup — Express app, MongoDB connection, environment config
2. User model + Auth (login, JWT, cookie delivery)
3. Admin routes — user management + Nodemailer email trigger
4. Record model + CRUD with soft delete
5. Analytics — aggregation pipelines for summary and stats
6. Global error handling + AppError utility
7. Input validation with Zod across all write endpoints
8. Test suites — auth, admin, records, analytics
9. Seed script for initial Admin
10. Final review — security hardening (Helmet, CORS, rate limiting)

Staging it this way meant I could verify each layer before building on top of it.


> Building this was a good exercise in thinking before typing. The time spent on roles, API design, and problem anticipation up front made the actual implementation feel straightforward — because the hard decisions were already made.
