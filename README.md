<<<<<<< HEAD
# Prebook — Client Project

**Client:** Mr. Nambi, Prebooking, Pattamalai, Tirunelveli
**Domain:** preebooking.com
**Service Provider:** Roriri Software Solutions (Ragupathi, Kalakad)

---

## Repository Layout

This is a **Bun workspace monorepo**. Web code lives in `apps/`, planning and
proposal material lives in `docs/`.

```
prebook/
├── apps/
│   └── web/                    # TanStack Start + shadcn/ui (this phase)
│       ├── src/
│       │   ├── routes/         # file-based routes (TanStack Router)
│       │   ├── components/     # app components + components/ui (shadcn)
│       │   ├── lib/            # utils
│       │   ├── router.tsx
│       │   └── styles.css      # Prebook design tokens (see docs/design.md)
│       ├── components.json     # shadcn configuration
│       └── vite.config.ts
│   ├── api/                    # Hono API (planned)
│   └── mobile/                 # Flutter app (future)
│
├── docs/
│   ├── plan.md                 # client proposal / scope
│   ├── design.md               # design system & UI plan
│   ├── INVOICE-SUMMARY.txt
│   ├── V1/                     # original real-estate proposal
│   ├── V3/                     # multi-vertical proposal assets
│   ├── scripts/                # proposal PDF render script
│   └── archive/                # superseded plans (Next.js build plan)
│
├── AGENTS.md                   # agent orchestration guide
├── package.json                # workspace root
└── README.md
```

---

## Tech Stack

| Area      | Choice                                          |
| --------- | ----------------------------------------------- |
| Web       | TanStack Start (React 19, Vite), TypeScript     |
| Styling   | Tailwind CSS v4 + shadcn/ui                     |
| API       | Hono (planned, `apps/api`)                      |
| Mobile    | Flutter (future)                                |
| Runtime   | Bun workspaces                                  |

---

## Getting Started

Requires **Bun ≥ 1.4.2** and **Node ≥ 20**.

```bash
bun install                 # install all workspaces
bun run dev                 # start apps/web on http://localhost:3000
bun run build               # production build
bun run lint                # eslint
bun run typecheck           # tsc --noEmit
```

Add a shadcn component:

```bash
cd apps/web
bunx shadcn@latest add <component>
```

---

## Version History

| Version | Date         | Description                                                           |
| ------- | ------------ | --------------------------------------------------------------------- |
| **V1**  | Jul-Aug 2026 | Original real estate listing platform proposal (₹1L, 45 days)         |
| **V2**  | TBD          | Evolved real estate module (if needed separately)                     |
| **V3**  | Sep 2026     | Multi-vertical platform: crackers, real estate, clothing — subdomains |

---

## V3 Platform Overview

**preebooking.com** is a multi-vertical platform:

- `crackers.preebooking.com` — E-commerce for crackers/festive goods
- `realestate.preebooking.com` — Property listing & site visits
- `clothing.preebooking.com` — Fashion & apparel
- More verticals plug in via subdomains

**Tech Stack:** TanStack Start + Hono + PostgreSQL + Prisma + Better Auth + Razorpay
**Timeline:** 12 weeks (3 phases × 4 verticals + foundation + payments + launch)

---

## Key Decisions Needed

1. Which verticals launch first?
2. Payment flow — platform or direct?
3. Inventory management responsibility?
4. Delivery logistics?
5. Seller onboarding process?
6. Confirmed budget for V3 scope?
7. Domain & hosting ownership?

---

_Last updated: September 11, 2026_
=======
# Zenyne Store!

Give a local business a beautiful online store in minutes, and turn store
visits into WhatsApp orders.

The app lives in [`store/`](store/) - see [`store/README.md`](store/README.md)
to run it. [`plan.md`](plan.md) is the product spec, [`design.md`](design.md)
is the design system, [`AGENTS.md`](AGENTS.md) describes how this repo is
built with sub-agent orchestration.
>>>>>>> 80f86d07790fb50e0a83a8b13fb5370bc71624fe
# prebook
