# Prebook — preebooking.com

**Crackers · Clothing · Real Estate — one website, one admin panel.**

| | |
| --- | --- |
| **Client** | Mr. Nambi · Prebooking · Pattamalai, Tirunelveli, Tamil Nadu |
| **Domain** | preebooking.com |
| **Service provider** | Zenyne Labs — Thinesh Rasla, Managing Director |
| **Contact** | +91 99946 27465 · hello@zenyne.com · zenyne.com |
| **Proposal** | ZL/2026/008 · issued 11 Sep 2026 · valid until 11 Oct 2026 |
| **Total cost** | **₹21,000** (Rupees Twenty-One Thousand Only) |
| **Timeline** | **4 weeks** from kickoff |
| **Payments in build** | Cash on Delivery / offline only — **no gateway** |

> **[`docs/INVOICE-SUMMARY.txt`](docs/INVOICE-SUMMARY.txt) is the single source of truth**
> for scope, quotation, timeline and terms. If anything in this README disagrees
> with it, that document wins.
>
> **[`docs/design.md`](docs/design.md)** governs how the site looks — tokens,
> layout, components, states — and carries a paste-ready build brief for the
> landing page. These two are the only standing documents; every earlier plan,
> proposal and design note has been removed.

---

## Scope

Three business sections on one site, one customer login, one admin panel.

**Crackers & Clothing — shops.** Catalogue with per-section categories, filters
(type / category / price), search, product detail with photo gallery, safety
information for crackers, size and colour variants with a size chart for
clothing, festival packs, cart, checkout with delivery address, order
confirmation, live stock indicators.

**Real Estate — a lead platform, not a shop.** Sellers post listings (land,
house, apartment) with photos; listings stay hidden until you approve them from
the verification queue; buyers browse approved listings and request a site visit
with a preferred time; you coordinate offline. **The seller's phone number is
never shown to buyers** — contact details are held server-side and never
serialised into a buyer-facing response.

**Customer accounts.** Email/password or Google sign-in, order history, saved
delivery address, profile, site-visit requests.

**Admin panel.** Role-based login for owner and staff. Products and stock,
order pipeline, real-estate approval and site-visit tracking, customer list,
alerts on new orders and visit requests.

**Core business logic.** All money stored and calculated as **integer paise** —
no floating-point rounding on totals, GST or discounts. Stock decremented on
order placement, with sold-out and low-stock states live on listing and product
pages.

### Not in this build

Online payment gateway · mobile app · delivery/courier integration · Tamil
content (structure kept ready) · data migration · photography, copywriting,
logo design · hosting and subscription charges · reports and analytics · map
search · buyer–seller chat. Each is quoted separately — see PART E of the plan.

---

## Stack

| Area | Choice |
| --- | --- |
| Website + admin | TanStack Start — server-rendered React, Tailwind CSS, mobile-first |
| API | Hono on the Bun runtime |
| Database | MongoDB Atlas via Prisma ORM |
| Auth | Better Auth — email/password + Google, role-based access |
| Media | Cloudflare R2 — presigned direct upload |
| Hosting | Cloudflare / Vercel with CDN |

**Prisma is pinned to 6.19.3.** Prisma 7 dropped MongoDB support. Keep the pin.

---

## Repository state

`docs/INVOICE-SUMMARY.txt` is currently the only content in this repository.
There is **no application code on disk** — `apps/` and the previous Next.js
`store/` build have both been removed, and git was re-initialised from scratch
on 12 Sep 2026: `main` holds a single commit containing only this README,
tracking `git@github.com:zenynelabs/prebook.git`. `package.json` still declares
a Bun workspace at `apps/*`, so `bun run dev` will not work until `apps/web` is
created.

The build starts from the Week 1 foundation described in the plan.

```
prebook/
├── docs/
│   ├── INVOICE-SUMMARY.txt     # the plan — scope, quotation, terms, build status
│   └── design.md               # the design system + build brief for index.html
├── AGENTS.md                   # how agents work in this repo
├── package.json                # Bun workspace root (expects apps/*)
└── README.md
```

---

## Timeline

| Week | Milestone |
| --- | --- |
| **1** | Kickoff, accounts and hosting, mockup sign-off. MongoDB schema, Hono API, Better Auth roles, R2 media, first staging deploy. |
| **2** | Crackers & Clothing storefront — catalogue, categories, filters, search, product detail, variants, festival packs. Admin: products and stock. |
| **3** | Cart, checkout, orders, customer accounts. Real Estate — seller listing, verification queue, public browse, site-visit requests. |
| **4** | Admin orders/stock/verification/visits, polish, testing, UAT, production launch, training and handover. |

Compressed schedule. It holds only if the Section 11 information — product
data, photos and credentials — arrives at kickoff.

## Payment schedule — ₹21,000

| Stage | Milestone | Share | Amount |
| --- | --- | --- | --- |
| 1 | On signing — advance to commence work | 50% | ₹10,500 |
| 2 | Store section and admin panel core (end of Week 3) | 30% | ₹6,300 |
| 3 | Final delivery, handover and go-live | 20% | ₹4,200 |

Invoices payable within 7 days. Free bug-fix support for **15 days** from
handover.

---

## Blocked on the client

Chase these at signing, not at kickoff — nothing can be deployed without them.

1. **`DATABASE_URL`** — MongoDB Atlas connection string. Never supplied; no
   schema has ever been pushed and no seed has ever run.
2. **Google OAuth** — client ID and secret.
3. **Cloudflare R2** — bucket name and public domain.
4. Logo file (or confirmation to use a text logo), colour preference, business
   details and GST number, product list with photos/price/stock, property types
   and districts to filter by, delivery areas and pincodes, confirmation that
   COD is acceptable and that Tamil can come later, domain and hosting
   ownership.

## Open items

| | |
| --- | --- |
| **C1 — GSTIN** | Blank on the template. Leave blank or supply. |
| **C2 — Proposal number** | Three refs in circulation: `ZL/2026/008`, `ZNL/2026/___`, `RSS/2026/___`. This repo uses **ZL/2026/008** — confirm or replace. |
| **C3 — Town spelling** | "Pattamalai" vs "Pattamadai". Confirm with Mr. Nambi. |

**Real Estate has no data model yet.** Property, PropertyImage, VisitRequest
and Seller do not exist anywhere. Budget real time for it in Weeks 1 and 3, not
just Week 3.

---

_All "Roriri Software Solutions" branding, the ₹10,000 / 14-day apparel-only
engagement, the ₹20,000 / 6-week V3 figure, and the PostgreSQL / NextAuth /
Next.js stack references are superseded and have been removed._

_Last updated: 12 September 2026._
