# Prebooking!

Crackers, Clothing and Real Estate — one website for Mr. Nambi, Tirunelveli.
Built by Zenyne Labs. The current deliverable is the public landing page in
`apps/web/`, using the user-requested domain **prebooking.com**. The original
proposal spelled it `preebooking.com`; confirm the actual domain before launch.

## Run

Requires Bun 1.4.2+ and Node.js 20.9+. Run these commands from the repository root.

```sh
bun install --frozen-lockfile
bun run dev        # http://localhost:3000
bun run typecheck
bun run test
bun run build      # Next.js production build
bun run start      # Next.js production server after building
```

`apps/web/` is a Next.js App Router app with React, Tailwind CSS, shadcn components,
Motion, GSAP and self-hosted Inter Variable. Exact dependency versions and
the root `bun.lock` make workspace installs reproducible. Native Flutter starter
code in `apps/app/` is separate from this website and has been left intact.

Development and builds use Next.js's Webpack option because Turbopack's CSS
worker hits a local port-permission error in this environment.

The page provides section navigation, a mobile menu, product/property guides,
FAQs and disabled coming-soon sections. Catalogues, checkout, accounts, seller
submissions and admin functions are **not implemented**. Every page CTA stays
inside this landing page. The launch note and FAQ explain availability.
No credentials or database are needed to run this landing page.

## Agreed product scope

The original invoice summary was read before the user-requested cleanup on
12 October 2026. `docs/` and its old photographs have been removed. The original
documents and root metadata were backed up to
`/private/tmp/prebook-cleanup-2026-10-12.zip` before deletion. Keep a permanent
copy of that archive if the exact original invoice wording is needed later.

The original Section 4 defines the full product, independently of this landing
page task:

- One responsive, server-rendered website with Crackers, Clothing and Real
  Estate, shared customer accounts, basic SEO and one role-based admin area.
- Crackers and Clothing: separate catalogues and categories, search and filters,
  image galleries, descriptions, prices, crackers safety information, clothing
  sizes/colours/variants and size charts, festival bundles, cart, delivery
  address, order confirmation, live stock and customer-visible order status.
- Real Estate: sellers manage land/house/apartment listings and photos;
  listings stay hidden pending admin review. Buyers browse only approved
  listings with type/district/price filters and request a preferred visit time.
  Admin tracks new/confirmed/completed/cancelled visits.
- Customer accounts: email/password or Google, orders, saved addresses,
  profile and site-visit requests.
- Admin: owner/staff permissions, products/photos/prices/stock/variants, order
  pipeline, listing review, visits, customers and order/visit alerts.
- All money is integer paise. Stock is decremented on order placement.
  Seller contact details remain server-side and never enter buyer-facing
  payloads or markup. Property publication requires admin approval.
- Cash on Delivery/offline payments only. Orders keep `paymentMethod` and
  `paymentStatus`; there is no payment gateway. Customer WhatsApp/SMS alerts
  require a separately billed third-party service.
- Original agreed stack: TanStack Start, Hono/Bun, MongoDB Atlas through Prisma,
  Better Auth and Cloudflare R2. **Keep Prisma at 6.19.3** when adding MongoDB support.

The user requested switching the landing page framework to Next.js App Router
on 12 October 2026. The business scope and commercial facts remain unchanged.

Multi-vendor stores are outside the agreed scope. Hotels, Restaurants and
Gym & Fitness are presentation-only coming-soon sections. Online payments,
mobile apps, logistics, Tamil translation, migration, photography/copywriting/
logo design, analytics/accounting, map search, buyer–seller chat and additional
business modules require separate agreements. Hosting/storage/messaging/domain
charges are paid by the client.

## Commercial facts

- Client: Mr. Nambi, Prebooking, Tirunelveli. Provider: Zenyne Labs.
- Proposal: ZL/2026/008, dated 11 September 2026, originally valid 30 days.
- Total: ₹21,000. Delivery: four weeks from kickoff, subject to timely data,
  credentials, feedback and confirmation.
- Payments: ₹10,500 on signing; ₹6,300 on store/admin core completion;
  ₹4,200 at delivery and handover. Invoices payable within seven days.
- Fifteen days of bug-fix support from handover; new work and third-party
  issues excluded. Manual and training included in the full engagement.
- The platform collects, processes, holds and verifies no payments. Seller
  contact-data handling belongs to the client. Jurisdiction: Tirunelveli.
- GSTIN, final proposal number and Pattamalai/Pattamadai spelling remain open.

The full platform still needs MongoDB Atlas, Google OAuth and Cloudflare R2
credentials, client branding/contact details, genuine products/photos/prices/
stock, property types/districts and delivery areas. None are configured here.

## Design

Reference: [BNI](https://www.bni.com/). Its full-width photographic introduction,
clear navigation, alternating image/text sections and three-step guide inform
the composition. Prebooking has its own content, palette and images; no BNI
branding, customer statements or business statistics are copied.

The visual system is a white ground, blue accent `#1550e8`, dark navy text,
Inter Variable, generous spacing and fine borders. Tokens live in
`apps/web/src/styles.css`. Buttons use 10px corners; image sections remain plain
rectangles. Desktop alternates image and text; mobile always places images
first and stacks the sections. The mobile menu uses shadcn/Radix focus trapping
and Escape handling. FAQs use native disclosures that also work without JavaScript. GSAP animates only the
hero entrance; Motion provides selection/press feedback. Reduced-motion
preferences disable the entrance, feedback transforms and smooth scrolling.
Main copy and FAQ answers are present in server-rendered HTML. Interactive
guides and the mobile menu require JavaScript; section links also appear in
the footer.

## Photograph credits

These are illustrative category photographs, not actual customers, products
or approved property listings. Images are local optimized WebP files, with a
separate mobile hero crop. Source metadata accompanies each asset.

- Hero: [Yan Krukau, people holding sparklers](https://www.pexels.com/photo/people-holding-sparkler-fireworks-8818585/).
- Crackers: [RDNE Stock project, a group holding sparklers](https://www.pexels.com/photo/group-of-happy-people-holding-sparklers-7686379/).
- Clothing: [Lara Jameson, choosing fabric in an Indian shop](https://www.pexels.com/photo/woman-in-an-indian-shop-choosing-a-fabric-8886959/).
- Property: [NJ socialmedia, a house in Kerala](https://www.pexels.com/photo/large-country-style-house-with-balcony-under-blue-sky-20445164/).

All are under the [Pexels License](https://www.pexels.com/license/).
