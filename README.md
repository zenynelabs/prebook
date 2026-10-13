# Prebooking

Built for Mr. Nambi, Tirunelveli, by Zenyne Labs. The current deliverable is a
business networking community landing page in
`apps/web/`, using the user-requested domain **prebooking.com**. The original
proposal spelled it `preebooking.com`; confirm the actual domain before launch.
On 13 October 2026, the user authorized repositioning this landing page around
business connections, referrals and shared learning. This supersedes the previous
retail/property landing presentation; the original agreed business scope and
commercial facts below remain unchanged. Membership, chapters and referral
databases are not part of this landing-page work.

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
Motion, GSAP, Lenis and self-hosted Inter Variable. Exact dependency versions and
the root `bun.lock` make workspace installs reproducible. Native Flutter starter
code in `apps/app/` is separate from this website and has been left intact.

Development and builds use Next.js's Webpack option because Turbopack's CSS
worker hits a local port-permission error in this environment.

The page provides community information, section navigation, a mobile menu,
a three-step contact journey and native FAQs. Enquiry links call Prebooking at
**7397167111**. There is no online signup, membership system or referral tracking.
Catalogues, checkout, accounts, seller submissions and admin functions are
**not implemented**.
This public business number is separate from private property seller contacts.
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

Reference: [BNI](https://www.bni.com/). Its photographic introduction,
clear navigation, alternating image/text sections and three-step guide inform
the composition. Prebooking has its own content, palette and images; no BNI
branding, customer statements or business statistics are copied.

The visual system is white `#ffffff`, blue accent `#1550e8`, navy text `#0f1729`,
Inter Variable, generous spacing and fine borders. Tokens live in
`apps/web/src/styles.css`. Buttons use 10px corners; image sections remain plain
rectangles. A large text/photo hero introduces the community; an alternating
editorial section, divided benefits list and numbered contact journey follow.
A five-metric community panel uses user-requested illustrative preview figures,
visibly labelled as unverified. Replace them with verified Prebooking statistics
and their reporting period before launch.
Desktop pairs images with text; mobile stacks the sections. The mobile menu uses shadcn/Radix focus trapping
and Escape handling. FAQs use native disclosures that also work without JavaScript.
Lenis smooths wheel and section-link scrolling through GSAP's animation clock;
touch gestures stay native. GSAP handles the hero entrance, paired community
and relationship introductions, the three contact steps and closing CTA.
Scroll sequences play once. The mobile menu pauses background scrolling and
hands keyboard focus to the destination after closing. Motion provides press
feedback. Reduced-motion preferences disable decorative movement and smooth
scrolling, including when the preference changes while the page is open.
Main copy and FAQ answers are present in server-rendered HTML. The mobile menu
requires JavaScript; section links also appear in
the footer.

## Photograph credits

These are illustrative stock photographs, not actual Prebooking members or
events. Images are local optimized WebP files.

- Hero: [Edmond Dantès, people at a business meeting](https://www.pexels.com/photo/people-at-the-business-meeting-4342126/).
- Community: [Thirdman, a group discussing together](https://www.pexels.com/photo/group-of-people-discussing-together-5256999/).

All are under the [Pexels License](https://www.pexels.com/license/).
