<div align="center">

# Fenwick

**A real-time ticket booking platform built to go deep on backend engineering — not just another CRUD app.**

Fenwick is deliberately structured to surface real concurrency, caching, and scaling problems (like double-booking under load) — and then solve them the way production systems do.

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)

</div>

---

> **Fun fact:** the name has nothing to do with ticketing — a **Fenwick tree** (Binary Indexed Tree) is a classic data structure for fast prefix-sum queries and updates. Felt like a fitting nod to a project all about efficient, correct updates under load.

---

## Why This Project Exists

Most side projects stop at CRUD. Fenwick is built specifically to hit the problems that show up once real concurrency enters the picture:

- What happens when 500 people try to book the same seat at the same second?
- How do you keep a hot event page fast without serving stale data?
- How do you stop a flash-sale spike from taking down your database?

Each of these is built **broken first, then fixed** — with load-tested, documented before/after results at every stage.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | PostgreSQL + Prisma |
| Cache / Locking / Pub-Sub | Redis |
| Queueing | BullMQ |
| Auth | NextAuth.js (Google OAuth) |
| Load Testing | k6 |
| Styling | Tailwind CSS |

---

## Core Features

- 🔐 Google OAuth login
- 🔍 Browse, search, and filter events by city, date, and category
- 🪑 Interactive seat map per event
- 🔒 Race-condition-safe seat booking via Redis distributed locking
- ⚡ Cached hot event pages with proper cache invalidation
- 📡 Live seat map updates across clients via Redis pub/sub
- 🎟️ Flash-sale waiting room queue (BullMQ)
- 📜 Booking history with cursor-based pagination

---

## What This Project Demonstrates

| Concept | Where It's Applied |
|---|---|
| DB schema design & CRUD | Events, venues, seats, bookings |
| Bulk data seeding | Tens of thousands of rows for realistic load testing |
| OAuth | Login flow |
| Concurrency control | Double-booking bug reproduced and fixed |
| Distributed locking | Redis `SETNX` / Redlock pattern |
| Caching | Cache-aside strategy with invalidation on writes |
| DB indexing | Search/filter performance, verified with `EXPLAIN ANALYZE` |
| Connection pooling | Surfaced and fixed under flash-sale load |
| N+1 query resolution | Event → venue → seat → booking relations |
| Cursor pagination | Event listings and booking history at scale |
| Pub/sub | Real-time seat map sync across connected clients |
| Queueing | Waiting room for high-demand events, async jobs (confirmation emails, expired-lock cleanup) |
| Load testing | k6, p95/p99 latency tracking, before/after metrics at every phase |

---

## Build Phases

1. **Foundation** — schema design, bulk seeding, core CRUD
2. **Auth** — Google OAuth, protected routes
3. **Booking v1 (broken)** — naive booking flow, proven to double-book under load
4. **Redis Locking** — distributed lock fix, re-tested and verified
5. **Caching** — cache-aside on hot reads, invalidation on writes
6. **Search & Indexing** — filterable event search, index-backed
7. **Scaling Fixes** — connection pooling, N+1 fixes, cursor pagination
8. **Pub/Sub** — live seat map updates
9. **Queueing** — waiting room + async job processing
10. **Final Load Test** — full flash-sale simulation, end-to-end metrics

> Docker, Kubernetes, Kafka, and Grafana are intentionally out of scope for this phase — planned as a follow-up devops layer once the backend foundation is solid.

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/ANUBHAVSINGH30/Fenwick.git
cd Fenwick
npm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET

# Run migrations
npx prisma migrate dev

# Seed the database
npm run seed

# Start the dev server
npm run dev
```

---

## Load Testing

Load test scripts live in `/load-tests` and use [k6](https://k6.io/).

```bash
k6 run load-tests/booking-race.js
```

Each phase's before/after results are documented in `/docs/results`.

---

## Status

🚧 **In active development** — follow along on [Twitter/X](https://x.com/anubhavSingh_30) for build-log updates as each phase ships.

---

## License

MIT