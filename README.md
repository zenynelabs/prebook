# Prebook.

Built for Mr. Nambi, Tirunelveli, by Zenyne Labs. The current deliverable is a
global business networking community landing page in
`apps/web/`, using the confirmed domain **www.prebookingpbkworld.com**.
On 13 October 2026, the user authorized repositioning this landing page around
business connections, referrals and shared learning. This supersedes the previous
retail/property landing presentation; the original agreed business scope and
commercial facts below remain unchanged. Membership, chapters and referral
databases are not part of this landing-page work.
The public brand is **PreBooking**, as corrected by the user on 13 October 2026.
The supplied email address retains its existing spelling.

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
Motion, GSAP, Lenis and self-hosted Plus Jakarta Sans Variable. Exact dependency versions and
the root `bun.lock` make workspace installs reproducible. Native Flutter starter
code in `apps/app/` is separate from this website and has been left intact.

Development and builds use Next.js's Webpack option because Turbopack's CSS
worker hits a local port-permission error in this environment.

The page provides community information, an audience guide, a practical referral
example, shared-learning prompts, community values, section navigation, a mobile
menu, a three-step contact journey and native FAQs. Enquiry links call PreBooking at
**7397167111** or **7397197111**, or email **prebookingpbkworld1@gmail.com**. The footer groups
exploration, community links and contact details alongside the brand, with a
back-to-top link in its bottom row. The email appears in the footer.
There is no online signup, membership system or referral tracking.
Catalogues, checkout, accounts, seller submissions and admin functions are
**not implemented**.
These public business numbers are separate from private property seller contacts.
No credentials or database are needed to run this landing page.

### Helicopter ride pre-registration

Added at the user's request on 27 October 2026. It sits outside the agreed
product scope below; quote or confirm it separately with the client. The ride's
date, fare and boarding point were not supplied and no public listing was
found, so the page says "to be announced" and the team confirms by phone.

- `/#events` on the homepage links to `/events/helicopter-ride`, which uses
  the same tokens, Lenis and GSAP and has the registration form: name, mobile,
  optional email, address and 1–6 passengers. No payment is taken.
- `/admin` is a noindex dashboard, behind staff email and password sign-in, with a sidebar,
  totals, status/payment dropdown filters, search and client-side pagination
  (10/25/50 per page) on the registrations and affiliate tables. Staff set each registration's
  status (new, contacted, confirmed, cancelled) and payment (unpaid, paid)
  inline, and edit contact details and notes in a side panel through the admin
  `PUT /registrations/:id`. Payment is tracked offline only: there is no
  gateway, and no amount is stored because the fare is not set yet.
- `apps/api/` is a Hono Cloudflare Worker, `prebook-api`, deployed to
  `https://prebook-api.programmer-rasla.workers.dev`, backed by the D1 database
  `prebook-events` (APAC). It is deliberately separate from the original
  MongoDB/Prisma plan. One mobile number registers once per event. Public POSTs
  are rate-limited per IP, and CORS allows only `ALLOWED_ORIGINS` in
  `apps/api/wrangler.jsonc`.
- Affiliate links: staff create an affiliate (name plus an optional link code)
  under "Affiliate links" in the dashboard and share
  `/events/helicopter-ride?ref=<code>`. The form sends the `ref`; unknown codes
  still register, just unattributed. The browser remembers the last `ref`, so a
  later visit without it still credits that affiliate. The dashboard ranks
  affiliates by registrations, seats, confirmed and paid; staff can rename an
  affiliate (the code and link stay fixed) or delete one, which keeps its
  registrations but unattributes them. Also outside the agreed scope.
- Staff accounts live in the D1 `admins` table (`migrations/0005_admins.sql`)
  with PBKDF2-SHA256 password hashes. There is no account screen: create a
  login, or reset its password and sign it out everywhere, with
  `bun run add-admin <email> "<name>" --remote` from `apps/api` (omit
  `--remote` for local D1). The password is typed hidden. Add `--no-shops`
  for a login without the Shops area: its sidebar hides Shops and the API
  refuses everything under `/admin/` with 403 (`migrations/0008_admin_shops.sql`). Sessions are random
  tokens stored hashed in D1 for 7 days and kept in the browser tab's
  sessionStorage; sign-in shares the public form's 10/minute limit.
- The Worker secret `ADMIN_TOKEN` is still accepted as a bearer token for
  scripts, but the dashboards no longer ask for it. Locally it is in the
  gitignored `apps/api/.dev.vars`. Rotate it with `wrangler secret put ADMIN_TOKEN`.
- The web app reads the API URL from `NEXT_PUBLIC_EVENTS_API` and falls back to
  the workers.dev URL above.

```sh
cd apps/api
bun run test
bun run migrate    # apply D1 migrations remotely
bun run deploy
```

### Shops

Added at the user's request on 27 October 2026. Multi-vendor shops are
explicitly outside the agreed scope below; quote or confirm them separately
with the client. Products focus on groceries, oils and bottled goods. There is
no online payment: orders are Cash on Delivery only.

- The Shops view of the `/admin` dashboard (also opened directly by
  `/admin/shops`) creates a shop with a
  permanent link name (slug), owner name, owner mobile and a password, shown
  once to share. Staff can switch a shop off, reset its password (which signs
  the owner out everywhere) or delete it with its products and images.
- `/shop-admin` is the owner's dashboard: sign in with the shop link name and
  password, then manage products, combos (bundles of the shop's own products
  that show their saving), logo, up to five banners, one of five colour themes
  and the password. Photos are downscaled in the browser to WebP and stored in
  the R2 bucket `prebook-shop-images`.
- `/shops/<slug>` is the public, server-rendered storefront for active shops.
  `/shops` lists every active shop, each card in its shop's theme colour, and
  is linked as "Shops" from the homepage navbar and mobile menu.
  The owner's mobile number never leaves the admin API.
- API: `apps/api/src/shops.ts` in the same Worker and D1 database
  (`migrations/0004_shops.sql`). Passwords are PBKDF2-SHA256 hashes; owner
  sessions are random tokens stored hashed in D1 for 30 days. Prices are
  integer paise. Shop sign-in shares the public form's 10/minute limit.
- Before first deploy: `wrangler r2 bucket create prebook-shop-images`, then
  `bun run migrate` and `bun run deploy` from `apps/api`.

### Shop affiliates

Added at the user's request on 27 October 2026, on top of Shops; equally
outside the agreed scope, so quote or confirm it separately.

- `/affiliate`: anyone registers once with name, mobile and password, then
  applies to a shop through its storefront footer link (`/affiliate?shop=<slug>`).
  The dashboard shows each shop's status and commission %, a link per product
  to share (`/shops/<slug>?ref=<code>#p-<id>`), totals and recent orders. It
  never shows customer details or the owner's mobile.
- The shop owner's Affiliates view approves, rejects or revokes applicants,
  shows each one's mobile and totals, and sets one whole-number commission
  (0–50%) for the shop. Orders show which affiliate brought them.
- The storefront keeps a `?ref=` for 30 days per shop (last click wins) and
  sends it with the order. The API credits the order only for an affiliate
  that shop approved, never for the affiliate's own mobile, and fixes the
  commission in paise (rounded down) at checkout. It counts as earned once the
  order is delivered; cancelled orders don't count. Payout is settled offline.
- API: `apps/api/src/partners.ts` (tables are `partners*` so they don't clash
  with the event's `affiliates`), owner routes in `shops.ts`,
  `migrations/0007_shop_affiliates.sql`. Run `bun run migrate` before deploying.
- Storefront cart and Cash-on-Delivery checkout: `POST /shops/<slug>/orders`
  prices every line from the shop's own products (never the browser), snapshots
  it into an `orders` row in integer paise and shares the tight 10/minute limit.
- The owner's Orders view (`/owner/orders`) lists the newest 200 orders and moves
  each through new, confirmed, delivered or cancelled; delivered marks it paid.
- Owners add up to 10 FAQs, shown on their storefront.
- `migrations/0006_shop_orders.sql` adds FAQs and orders: run `bun run migrate`
  (`wrangler d1 migrations apply DB --remote`) before deploying this API.

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
credentials, remaining client details, genuine products/photos/prices/
stock, property types/districts and delivery areas. None are configured here.

## Design

Reference: [BNI](https://www.bni.com/). Its photographic introduction,
clear navigation, alternating image/text sections and three-step guide inform
the composition. PreBooking has its own content, palette and images; no BNI
branding, customer statements or business statistics are copied.

The user supplied the **PBK1 Prebooking World 1 — Business Connect** logo on
13 October 2026. Its sampled palette is deep green `#09432b`, teal `#259194`,
orange `#f97602`, light gold `#edd374` and warm white `#f6f5f0`. Teal is darkened
to `#176f72` for accessible light-on-teal buttons; text uses the deeper green
`#062c1c`, including on the orange hero button. Plus Jakarta Sans Variable, generous spacing
and fine borders remain.
Tokens live in
`apps/web/src/styles.css`. Buttons use 10px corners; image sections remain plain
rectangles. A full-viewport photographic hero introduces the community, with a
deep-green shade, white and gold type, and a gentle GSAP opening zoom. The navbar
overlays the image and switches to a warm frosted background on scroll. An alternating
editorial section, divided benefits list and numbered contact journey follow.
A divided audience guide, a three-part referral example, a shared-learning
section with a deep-green question panel and a plain community-values list add depth
to the introduction. New section links appear in the mobile menu and footer.
Additional photographs show a one-to-one conversation, shared planning and a
coffee gathering across the introduction, learning section and closing invitation.
The statistics numbers use self-hosted Inter at weight 750 with a larger responsive scale; labels and other
text retain Plus Jakarta Sans. A five-metric community panel uses user-requested illustrative preview figures,
visibly labelled as unverified. Replace them with verified PreBooking statistics
and their reporting period before launch. Four divided metrics surround a
highlighted revenue row in normal document flow. A short GSAP entrance and
count-up play once on entering view. Final values ship in HTML and remain stable
for screen readers; reduced motion displays the final values immediately.
Desktop pairs images with text; mobile stacks the sections. The mobile menu uses shadcn/Radix focus trapping
and Escape handling. FAQs use native disclosures that also work without JavaScript.
Lenis smooths wheel and section-link scrolling through GSAP's animation clock;
touch gestures stay native. GSAP handles the hero entrance, paired community
and relationship introductions, the referral example, learning question,
three contact steps and closing CTA.
Scroll sequences play once. The mobile menu pauses background scrolling and
hands keyboard focus to the destination after closing. Motion provides press
feedback. Reduced-motion preferences disable decorative movement and smooth
scrolling, including when the preference changes while the page is open.
A minimal 2px teal loading bar moves across the top until the browser finishes loading,
then fades out. It stays static with reduced motion and never blocks content.
Main copy and FAQ answers are present in server-rendered HTML. The mobile menu
requires JavaScript; section links also appear in
the footer.

### Logo and sharing assets

The header uses the transparent `brand/navbar-logo-transparent.png` globe/PBK
emblem with readable brand text and a separate filename from the earlier cached
emblem export. The header, mobile menu and footer pair the emblem with **PreBooking**
brand text. The original full logo contains the earlier name and is preserved as
a source asset. The original upload is preserved byte-for-byte at
`apps/web/public/brand/logo-original.png`. The user requested background removal;
the built-in image tool produced the transparent cutout preserved at
`apps/web/public/brand/logo-transparent-source.png`. PNG/WebP logos, emblems and
browser icons preserve real alpha transparency, including the negative spaces
inside the artwork. Intentional narrow white letter outlines remain.

FFmpeg crops/resizes the transparent master; `cwebp` optimizes delivery copies
because the local FFmpeg build has no WebP encoder. The full-logo crop is
`crop=900:1050:305:20`, fitted without stretching onto a transparent 480×594
canvas. The emblem crop is `crop=900:700:305:20`, with only the isolated lower
text fragment removed at source coordinates `(985,690,100,30)`, then padded
to a transparent square. The delivered emblem is 256×256.

Browser icons include a 16/32/48px multi-image ICO, separate 16/32/48px PNGs,
a 180px Apple touch icon and 192/512px PNG icons. Next.js metadata references
them directly. The Apple icon composites the cutout onto the site's uniform warm
background for platform rendering. Open Graph and Twitter use the
1730×909 `brand/og-prebooking-global.png` card with the headline “Business networking
across borders.”, the PreBooking emblem and the confirmed website address. Organization structured
data uses the emblem. Browser icons and logo consumers retain the
`transparent-1` asset revision to refresh cached opaque logos.
`/robots.txt` and `/sitemap.xml` expose the homepage, the helicopter ride
page and `/shops` using the confirmed `https://www.prebookingpbkworld.com` canonical host.

SEO titles and descriptions focus on global business networking.
The canonical host and metadata share `apps/web/src/lib/site.ts`. The homepage renders `Organization` and
`WebSite` JSON-LD using the supplied logo and public business contact, without
unverified statistics. Preview statistics retain their visible disclosure and
use `data-nosnippet` to exclude them from Google search snippets. Search Console
verification and production performance measurements remain launch tasks.

## Photograph credits

These are illustrative stock photographs, not actual PreBooking members or
events. Images are local optimized WebP files.

- Hero: [Edmond Dantès, people at a business meeting](https://www.pexels.com/photo/people-at-the-business-meeting-4342126/).
- Community: [Thirdman, a group discussing together](https://www.pexels.com/photo/group-of-people-discussing-together-5256999/).
- Introduction: [Ketut Subiyanto, Indian partners discussing work](https://www.pexels.com/photo/happy-indian-partners-talking-while-working-on-project-using-laptop-4308104/).
- Learning: [Anna Shvets, professionals planning together](https://www.pexels.com/photo/businesspeople-preparing-schemes-on-papers-at-table-5324973/).
- Closing: [Alena Darmel, a coffee break in a conference room](https://www.pexels.com/photo/group-of-people-having-coffee-break-inside-conference-room-8134164/).

All are under the [Pexels License](https://www.pexels.com/license/).
