# Prebook — Design Specification

> **Scope of this document:** the visual system for **preebooking.com**, and a
> complete, build-ready specification for the landing page (`index.html`).
>
> [`INVOICE-SUMMARY.txt`](INVOICE-SUMMARY.txt) remains the source of truth for
> **what gets built and what it costs**. This file only governs **how it
> looks**. Where the two touch — which sections exist, what is in scope — the
> plan wins.

---

## 1. Design direction

**Quiet, light, and confident.** The page should feel like a well-made index —
lots of white, one accent colour, hairline borders instead of heavy shadows,
and type doing most of the work. Nothing bounces, nothing glows, nothing
competes for attention except the category grid.

The landing page has exactly one job: **get the visitor into the right
section in one click.** Everything else on the page is secondary to that.

Three principles, in priority order:

1. **Whitespace over decoration.** If a divider, shadow, or background panel
   can be replaced by empty space, replace it.
2. **One accent.** Blue marks what is clickable and nothing else. A second
   colour must earn its place; six competing colours is what makes a page
   look cheap.
3. **Restraint in motion.** Movement confirms an action or reveals content on
   scroll. It never decorates.

**Rejected alternatives**, recorded so they don't get re-proposed: notched /
clipped corners (too loud against minimalism), dark theme (client asked for
light; not built), per-vertical coloured backgrounds (turns the grid into a
fruit salad — accent is confined to a small dot and the hover border),
decorative pill/chip badges (a glass eyebrow badge over the hero, a row of
pill-shaped "feature" tags — the generic AI-template tell; removed from the
hero in favour of a plain uppercase label and no tag row).

**Pills are a state, not a decoration.** The only two pills on the page are
`.pill-soon` ("Soon" — a real state, mandated by §5.3/§5.9) and the cart-count
`.badge` (a real number, mandated by §8). No other element gets a pill,
chip, or glass-badge treatment — not an eyebrow label, not a category tag,
not a stat. If it doesn't carry a live count or a lifecycle state, it's plain
text.

**Colour is provisional.** The client has not supplied a logo or a colour
preference — that is Section 11 item 2 of the plan, due at kickoff. Blue below
is the working default. If the client supplies a brand colour, change the six
`--accent-*` tokens in §2.1 and nothing else in this document needs to move.

---

## 2. Design tokens

Declare all of these as CSS custom properties on `:root`. Never hard-code a hex
value anywhere else in the stylesheet.

### 2.1 Colour

```css
:root {
  /* surfaces — the page is white, panels are a barely-there grey */
  --bg: #ffffff;
  --surface: #f7f9fc; /* section bands, input fills, disabled cards */
  --surface-2: #f1f4f9; /* pressed / hovered surface */
  --border: #e6eaf2; /* hairline — the default separator */
  --border-strong: #d3dae8; /* input borders, stronger dividers */

  /* text */
  --text: #0f1729; /* headings and body */
  --text-2: #5a6478; /* secondary copy, descriptions */
  --text-3: #8a93a6; /* meta, captions, counts */
  --text-disabled: #9aa3b5;

  /* accent — the only colour that means "you can click this" */
  --accent: #1550e8;
  --accent-hover: #1240b8;
  --accent-press: #0e35a0;
  --accent-wash: #eef3fe; /* tint fills, hover backgrounds */
  --accent-border: #c7d9ff;
  --accent-text: #0e3fbf; /* accent text on white — passes AA at 14px */

  /* status */
  --success: #12924f;
  --warning: #b4690e;
  --danger: #d92d20;

  /* per-vertical marks — used ONLY for the 8px dot on a category card
     and the card's hover border. Never as a background or a text colour. */
  --v-crackers: #e11d2e;
  --v-clothing: #8b4be8;
  --v-property: #0e9e7e;
}
```

**Coming-soon verticals get no colour at all.** Their dot is `--text-disabled`.
That greyness is the signal — do not give them a tinted dot.

**Contrast floor:** body text ≥ 4.5:1, large text and UI ≥ 3:1. `--text-3` on
`--bg` is 4.6:1 — it is the lightest text permitted. `--text-disabled` is
below the floor and is therefore only ever used on non-interactive,
non-essential content that is duplicated by a visible "Coming soon" label.

### 2.2 Typography

**One typeface.** `Inter` (variable), weights 400 / 500 / 600 only. No second
family, no display face. Minimalism means the type scale carries the hierarchy,
not a font pairing.

```css
font-family:
  Inter,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

| Role                 | Size / line-height                | Weight | Tracking                |
| -------------------- | --------------------------------- | ------ | ----------------------- |
| Display (hero h1)    | `clamp(40px, 6vw, 60px)` / 1.05   | 600    | `-0.035em`              |
| Section heading (h2) | `clamp(26px, 3.2vw, 34px)` / 1.15 | 600    | `-0.025em`              |
| Card title (h3)      | 18px / 1.3                        | 600    | `-0.015em`              |
| Subheading / lede    | `clamp(16px, 1.6vw, 18px)` / 1.55 | 400    | `-0.005em`              |
| Body                 | 15px / 1.6                        | 400    | 0                       |
| Small / meta         | 13px / 1.45                       | 400    | 0                       |
| Micro / label        | 11.5px / 1.2                      | 600    | `0.08em`, uppercase     |
| Price                | 18px / 1.2                        | 600    | `-0.02em`, tabular-nums |

Headings use `text-wrap: balance`. Paragraphs cap at `65ch`. Body text never
drops below 15px, on any breakpoint.

### 2.3 Spacing

4px base unit. Use only these steps: **4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96, 128**.

| Token                      | Desktop | Mobile |
| -------------------------- | ------- | ------ |
| Section padding (vertical) | 96px    | 56px   |
| Container max-width        | 1200px  | —      |
| Container gutter           | 24px    | 16px   |
| Grid gap (cards)           | 20px    | 16px   |
| Card padding               | 24px    | 20px   |

Generosity is the whole look. When unsure between two spacing steps, take the
larger one.

### 2.4 Shape

```css
--r-card: 12px; /* cards, panels, images */
--r-btn: 10px; /* buttons */
--r-input: 10px;
--r-chip: 8px; /* small tags */
--r-pill: 999px; /* status badges only */
```

Soft, not round. Nothing is a circle except avatars and icon buttons.

### 2.5 Elevation

Minimalism prefers **borders to shadows**. The default card is
`background: var(--bg); border: 1px solid var(--border);` with no shadow at all.

```css
--shadow-sm: 0 1px 2px rgba(15, 23, 41, 0.04);
--shadow-md: 0 6px 20px rgba(15, 23, 41, 0.07); /* hover only */
--shadow-lg: 0 16px 40px rgba(15, 23, 41, 0.1); /* dropdown / overlay only */
```

Never stack a shadow on a coloured background. Never use more than one shadow
level on a single surface.

### 2.6 Motion

```css
--ease: cubic-bezier(0.4, 0, 0.2, 1);
--t-fast: 120ms; /* colour, border, opacity */
--t-base: 180ms; /* transform, hover lift */
--t-slow: 420ms; /* scroll reveal */
```

Permitted movement, exhaustively: hover lift of **2px maximum**, colour and
border transitions, arrow nudge of 4px, scroll-reveal fade-and-rise, dropdown
fade-and-drop of 6px. Nothing else. No parallax, no counters, no typewriters,
no auto-playing carousels, no infinite marquees.

---

## 3. Layout

```css
.container {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 24px;
}
```

| Breakpoint | Width      | Category grid | Store / product grid               |
| ---------- | ---------- | ------------- | ---------------------------------- |
| Mobile     | < 640px    | 1 column      | 1 column (or 1.2-wide scroll rail) |
| Tablet     | 640–1023px | 2 columns     | 2 columns                          |
| Desktop    | ≥ 1024px   | 3 columns     | 4 columns                          |

The page body must never scroll horizontally. Only deliberate scroll rails do,
each inside its own `overflow-x: auto` container.

---

## 4. Information architecture

This is what the landing page is a map of. **Three sections are live; three are
placeholders.**

```
preebooking.com  (landing — index.html)
│
├── 🔴 Crackers          LIVE
│      └── stores        →  store page  →  products  →  cart  →  checkout
├── 🟣 Clothing          LIVE
│      └── stores        →  store page  →  products  →  cart  →  checkout
├── 🟢 Real Estate       LIVE
│      └── listings      →  listing page  →  request a site visit
│
├── ⚪ Hotels            COMING SOON   — disabled, not clickable
├── ⚪ Restaurants       COMING SOON   — disabled, not clickable
└── ⚪ Gym & Fitness     COMING SOON   — disabled, not clickable
```

**Crackers and Clothing both contain stores.** A visitor picks a section, sees
the stores in it, opens a store, and buys from that store's products. Real
Estate has no stores — it is a listings-and-enquiry flow, not a shop, and the
seller's phone number is never shown to a buyer.

> **Scope note.** Stores-inside-a-section is a multi-vendor marketplace and goes
> beyond Section 4 of the plan, which describes a single catalogue. It needs a
> Store model, store owners, store pages and per-store order routing. Price it
> before building it. The three coming-soon tiles are presentational only and
> cost nothing now; each one going live later is a PART E module.

---

## 5. Page structure — `index.html`

Eleven blocks, in this order. **Sections 1–4 and 10–11 are required**; 5–9 can
ship later without the page feeling unfinished.

| #   | Block             | Required | Purpose                          |
| --- | ----------------- | -------- | -------------------------------- |
| 1   | Skip link         | ✅       | Accessibility                    |
| 2   | Header / nav      | ✅       | Move between sections            |
| 3   | Hero              | ✅       | One sentence on what this is     |
| 4   | **Category grid** | ✅       | **The centrepiece — 6 tiles**    |
| 5   | Featured stores   | —        | Proof the sections have contents |
| 6   | Featured products | —        | Price and stock made concrete    |
| 7   | Real Estate strip | —        | Different card, different CTA    |
| 8   | How it works      | —        | Three steps, reassurance         |
| 9   | Trust row         | —        | COD, GST invoice, support        |
| 10  | Footer            | ✅       | Navigation and legal             |
| 11  | Scripts           | ✅       | Smooth scroll, reveal, menu      |

### 5.1 Header

Sticky, 72px tall, `background: rgba(255,255,255,.85)` with
`backdrop-filter: blur(12px)`. **Transparent bottom border at the top of the
page; the border fades in to `--border` once `scrollY > 8`.** This one detail
does more for a minimal page than any amount of decoration.

- **Left:** wordmark. Text only — "Preebooking" at 18px/600, `-0.03em`. No logo
  file exists yet (plan, Section 11 item 1).
- **Centre** (desktop only): `Crackers` · `Clothing` · `Real Estate` · `More ▾`
  at 14.5px/500 in `--text-2`, becoming `--text` on hover. The active section
  gets `--text` plus a 2px `--accent` underline.
  - **`More ▾`** opens a dropdown containing the three coming-soon sections,
    each greyed with a "Soon" pill and **not focusable**.
- **Right:** search icon button, account icon button, cart icon button with a
  count badge. 40×40px hit areas, `--r-btn`, hover fills `--surface`.
- **Mobile (< 1024px):** centre nav is replaced by a hamburger that opens a
  full-height panel sliding in from the right. Use `<details>`/`<summary>` or a
  12-line JS toggle — do not pull in a library for this.

### 5.2 Hero

Full-viewport commercial showcase (`images/hero.jpg`) taking the entire screen (`100vh` / `100dvh`), extending completely underneath the fixed frosted glass navigation bar.

- **Image composition:** Bespoke luxury commercial scene featuring a gold celebration gift box with sparklers (_Festive Crackers_), rich royal blue and champagne handloom silk (_Clothing_), and an illuminated modern villa model (_Real Estate_) on studio marble with warm lighting.
- **Visual styling:**
  - **Blurred:** Soft cinematic blur (`filter: blur(10px) brightness(0.66) saturate(1.15); transform: scale(1.08)`).
  - **Vignette:** Elliptical radial vignette darkening the perimeter (`rgba(15, 23, 42, 0.18)` to `0.92`) with inset shadow for dramatic depth and focus.
  - **Rounded:** Curved bottom edges (`border-radius: 0 0 36px 36px; box-shadow: 0 20px 50px rgba(0,0,0,0.25)`).
- **Navbar integration:** The fixed header is fully transparent over the hero — no fill, no blur, white text sitting directly on the image — so it reads as part of the hero rather than a bar laid over it. It transitions to crisp white frosted glass (`rgba(255,255,255,.85)` + `blur(12px)`) only once scrolled past the hero.
- **Centred typography, no eyebrow or badges** — plain text only, per the
  no-decorative-pills rule in §1:
  - **H1:** High-impact bold display type (`font-weight: 800; clamp(34px, 5.2vw, 56px)`): _Exquisite Craft. Everything you need, in one place._ with dual-tone gradient highlight.
  - **Lede:** Readable, high-contrast descriptive lede, centred under the H1.
  - **Actions:** Bold primary CTA button + frosted glass _How it works_ button, centred.
- **Stats band** sits directly below the hero as its own full-width section
  (not embedded in the hero) — see §5.2a.

### 5.2a Stats band

A plain white band, hairline border below, directly under the hero. Four
stats in a row on desktop separated by vertical hairlines, 2-up on tablet,
stacked with horizontal hairlines on mobile. Numbers are large
(`clamp(32px, 5vw, 44px)`, 600 weight) with a 15px `--text-2` label under
each — no card, no background tint, no icon: _100% Cash on delivery ·
24+ Verified stores · 580+ Curated items · ₹0 Online advance_.

### 5.3 Category grid — the centrepiece

Six cards. 3 columns desktop / 2 tablet / 1 mobile, `gap: 20px`.

Give the section a heading (_Choose a section_) and a one-line subheading
(_Three are open now. Three are on the way._).

**Live card** — `<a href="/crackers">`:

```
┌──────────────────────────────────┐
│ ●                                │   8px dot, --v-crackers
│                                  │
│ Crackers                         │   h3, 18px/600
│ Gift boxes, sparklers and        │   14px, --text-2, 2 lines max
│ aerial shots from Sivakasi.      │
│                                  │
│ 12 stores · 240 items        →   │   13px --text-3   |   16px arrow
└──────────────────────────────────┘
   1px --border · --r-card · 24px padding · min-height 180px
```

- **Rest:** `--bg`, 1px `--border`, no shadow.
- **Hover:** border → the vertical's own colour at 40% (`color-mix`), `--shadow-md`,
  `translateY(-2px)`, arrow nudges 4px right. 180ms.
- **Focus-visible:** 2px `--accent` outline, 3px offset. Never remove it.
- Whole card is one link — no nested links, no separate button inside it.

**Coming-soon card** — a `<div>`, **not** a link:

```
┌──────────────────────────────────┐
│ ●                    ┌─────────┐ │   dot: --text-disabled
│                      │  Soon   │ │   pill, --surface-2 bg, --text-3
│ Hotels               └─────────┘ │   h3, --text-disabled
│ Rooms and stays, opening later.  │   14px, --text-disabled
│                                  │
│                                  │   no count, no arrow
└──────────────────────────────────┘
   --surface background · 1px --border · no shadow
```

Rules for these three, all of which matter:

- **Not a link and not a button.** A plain `<div>`. Nothing to click, nothing
  to tab to, no `href="#"`, no `onclick`, no `pointer-events: none` hack.
- Add `aria-disabled="true"` for assistive tech, and make sure the words
  "Coming soon" are **visible text**, not a `title` tooltip or colour alone.
- **No hover state at all** — no lift, no border change, no cursor change.
  `cursor: default`.
- Content sits at ~60% visual weight via the token colours, **not**
  `opacity: .6` on the card — opacity would wash out the border too.
- Order them after the three live cards. Never interleave.

Content for all six:

| Card          | State | Description                                           | Meta                  |
| ------------- | ----- | ----------------------------------------------------- | --------------------- |
| Crackers      | Live  | Gift boxes, sparklers and aerial shots from Sivakasi. | 12 stores · 240 items |
| Clothing      | Live  | Sarees, shirts and kidswear from local stores.        | 8 stores · 316 items  |
| Real Estate   | Live  | Plots, houses and apartments. Book a site visit.      | 58 listings           |
| Hotels        | Soon  | Rooms and stays, opening later.                       | —                     |
| Restaurants   | Soon  | Food and table booking, opening later.                | —                     |
| Gym & Fitness | Soon  | Memberships and classes, opening later.               | —                     |

### 5.4 Featured stores

Heading _Stores on Preebooking_, subheading _Shops across Crackers and
Clothing._ Four cards, 4 / 2 / 1 columns.

Store card: 16:9 cover placeholder (`--surface` with a centred monogram — no
stock photography, the client has supplied none), then store name (h3), a
13px `--text-3` line reading `Crackers · Sivakasi`, and a bottom row with
`⭐ 4.8` and `· 42 items`. Whole card is one link. Same hover as a category
card, minus the coloured border.

### 5.5 Featured products

Heading _Popular right now_. Four cards, 4 / 2 / 1.2-scroll.

- **1:1 image area**, fixed aspect ratio, `--surface` fill. Fixed ratio is not
  optional — it is what stops the page jumping as images load.
- Title, 2 lines maximum, `text-overflow: ellipsis`.
- 12px `--text-3` store attribution: _from Ganesh Crackers_.
- **Price row:** `₹1,899` at 18px/600, MRP struck through at 13px `--text-3`,
  then `27% off` in `--success`.
- **Stock line:** `In stock` (`--success`) / `Only 6 left` (`--warning`) /
  `Out of stock` (`--text-3`). A 6px dot plus the words — never colour alone.
- **Action:** full-width secondary button, _Add to cart_. When out of stock it
  becomes a genuinely `disabled` button reading _Notify me_.

### 5.6 Real Estate strip

Three cards, visually distinct from product cards so nobody mistakes a property
for something you put in a cart: **16:10 image**, locality line with a pin
icon, price as `₹18.5 L`, then a 3-column facts row (`1,200 sqft` · `DTCP` ·
`East facing`) separated by a hairline. CTA reads **Book site visit**, not "Buy".

Never render a seller's phone number here or anywhere else on a buyer-facing
page.

### 5.7 How it works

Three steps, equal columns, no cards — just a number, a heading, and two lines
of `--text-2` on plain background. The number is 15px/600 in `--accent-text`
above a hairline rule.

1. **Pick a section** — Choose crackers, clothing or property, and browse the
   stores in it.
2. **Reserve it** — Add to cart or request a site visit. Nothing is charged
   online.
3. **Pay on delivery** — Cash or UPI at the door, with a GST invoice in the box.

### 5.8 Trust row

Four items across one `--surface` band: _Cash on delivery_ · _GST invoice_ ·
_Tamil support_ · _Verified stores_. 20px icon, 15px/600 label, 13px
`--text-2` line. No borders between them — spacing separates them.

### 5.9 Footer

`--surface` background, 1px `--border` top, 64px padding. Four columns on
desktop collapsing to two then one: wordmark + one-line description, then
Sections, then Company, then Support. Bottom bar with a hairline above it:
`© 2026 Preebooking · Tirunelveli` on the left, small print on the right.

**List the coming-soon sections in the footer as plain grey text with "Soon"
beside them — not as links.** Consistency with the grid matters; a dead link
in the footer is the classic place this slips.

---

## 6. Component states

Every interactive element needs all five. Missing states are the most common
reason a generated page feels unfinished.

| State             | Rule                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rest**          | As specified above.                                                                                                                             |
| **Hover**         | Border and/or background shift, ≤2px lift, 180ms. Pointer devices only — wrap in `@media (hover: hover)`.                                       |
| **Focus-visible** | `outline: 2px solid var(--accent); outline-offset: 3px`. Required on every link, button and input. Never `outline: none` without a replacement. |
| **Active**        | `translateY(1px)` or `--accent-press`.                                                                                                          |
| **Disabled**      | `--surface` fill, `--text-disabled` text, `cursor: not-allowed`, real `disabled` attribute on buttons.                                          |

**Buttons**

| Variant      | Rest                                                                | Hover                                            |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------ |
| Primary      | `--accent` fill, white text, 14px/600, 12px 22px padding, `--r-btn` | `--accent-hover`                                 |
| Secondary    | `--bg` fill, 1px `--border-strong`, `--text`                        | `--surface` fill, `--border` → `--border-strong` |
| Quiet / link | No fill, `--accent-text`, no underline                              | Underline appears                                |

Minimum hit target **44×44px** including padding. Inputs are 48px tall on
mobile.

---

## 7. Motion and smooth scroll

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 88px;
}
```

`scroll-padding-top` is what stops the sticky header covering the heading you
just jumped to. It is skipped more often than not — do not skip it.

**Scroll reveal.** Section content fades in and rises 16px, once, as it
enters the viewport. Use `IntersectionObserver` with
`threshold: 0.12, rootMargin: '0px 0px -10% 0px'`, add a class, and
`unobserve` after firing. About 12 lines — no animation library, no AOS.

Stagger children by **60ms**, and cap the stagger at 6 items so the last card
in a row never lags visibly behind.

**Elements start hidden only when JS is available.** Set the hidden state from
a `.js` class that the script adds to `<html>` on its first line. Otherwise
readers with JS disabled get a blank page — this is the single most common way
scroll-reveal breaks a site.

**Reduced motion is not optional:**

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .reveal {
    opacity: 1 !important;
    transform: none !important;
  }
}
```

---

## 8. Accessibility

Non-negotiable, all of it:

- Skip link to `#main` as the first focusable element.
- One `<h1>`. Heading levels descend without skipping.
- Landmarks: `<header>`, `<nav>`, `<main id="main">`, `<footer>`.
- Every icon-only button has an `aria-label`; decorative SVGs get
  `aria-hidden="true"`.
- Every image has meaningful `alt`, or `alt=""` when decorative.
- Colour is never the only signal — stock, status and "coming soon" all carry
  text.
- Visible focus on everything focusable.
- Coming-soon cards are out of the tab order entirely (see §5.3).
- Cart count is announced: `aria-label="Cart, 3 items"`.
- Test the whole page with the keyboard alone before calling it done.

---

## 9. Performance

- **No layout shift.** Every image box has a fixed `aspect-ratio` or explicit
  `width`/`height`. Target CLS 0.
- Fonts: `display=swap`, preconnect to the font host, 400/500/600 only.
- `loading="lazy"` + `decoding="async"` on everything below the fold; the hero
  is eager.
- No jQuery, no Bootstrap, no animation library, no icon font. Inline SVG
  icons as a `<symbol>` sprite and `<use>` them.
- Target: under 150KB on first load excluding images.

---

## 10. Content placeholders

**The client has supplied no photography** (plan, Section 5). Do not paste in
stock photos and do not hotlink an image CDN. Use a plain `--surface` block
with a centred 24px monogram or icon in `--text-3`. An honest placeholder reads
as "awaiting content"; a stock photo of someone else's shop reads as a lie, and
someone will ship it to the client by accident.

Prices, counts and store names in this document are realistic placeholders.
Replace them with real data at kickoff.

---

## 11. Build brief — paste this into your builder

> Build a single-file `index.html` landing page for **Preebooking**, an Indian
> multi-section marketplace in Tirunelveli, Tamil Nadu. Vanilla HTML, CSS and
> JavaScript only — no framework, no build step, no external libraries.
> Everything in one file: `<style>` in the head, `<script>` before `</body>`.
> Inter from Google Fonts is the only external request.
>
> **Look:** clean, minimal, light. White background, one blue accent
> (`#1550E8`), hairline `#E6EAF2` borders instead of shadows, generous
> whitespace, Inter only at weights 400/500/600. Quiet and confident — not
> flashy, not gradient-heavy, no dark mode.
>
> **CSS custom properties on `:root`** — use these and never hard-code a hex
> anywhere else:
> `--bg:#FFFFFF; --surface:#F7F9FC; --surface-2:#F1F4F9; --border:#E6EAF2;
--border-strong:#D3DAE8; --text:#0F1729; --text-2:#5A6478; --text-3:#8A93A6;
--text-disabled:#9AA3B5; --accent:#1550E8; --accent-hover:#1240B8;
--accent-wash:#EEF3FE; --accent-text:#0E3FBF; --success:#12924F;
--warning:#B4690E; --v-crackers:#E11D2E; --v-clothing:#8B4BE8;
--v-property:#0E9E7E;`
> Radii: cards 12px, buttons and inputs 10px. Container 1200px with 24px
> gutters. Section padding 96px desktop / 56px mobile.
>
> **Sections, in order:**
>
> 1. **Skip link** to `#main`.
> 2. **Sticky header**, 72px, white at 85% with `backdrop-filter: blur(12px)`.
>    Text wordmark "Preebooking" on the left; centre nav `Crackers · Clothing ·
Real Estate · More ▾`; right side search, account and cart icon buttons
>    with a count badge on the cart. The bottom border is transparent at the
>    top of the page and fades in once `scrollY > 8`. `More ▾` opens a dropdown
>    listing Hotels, Restaurants and Gym & Fitness, all greyed with a "Soon"
>    pill and not focusable. Below 1024px the centre nav becomes a hamburger
>    opening a right-side slide-in panel.
> 3. **Hero**, centred, no image. Eyebrow `PREEBOOKING.COM`; H1 "Everything you
>    need, in one place."; one-sentence lede; a primary button "Browse
>    sections" that smooth-scrolls to the category grid, plus a quiet text link
>    "How it works". Optionally one soft radial `--accent-wash` behind it.
> 4. **Category grid — the most important section.** Heading "Choose a
>    section", subheading "Three are open now. Three are on the way." Six
>    cards, 3 columns desktop / 2 tablet / 1 mobile, 20px gap, each 24px
>    padding and at least 180px tall.
>    - **Three live cards**, each a single `<a>`: an 8px coloured dot, a title,
>      a two-line description, and a footer row with a count and a `→` arrow.
>      **Crackers** (dot `--v-crackers`, "Gift boxes, sparklers and aerial
>      shots from Sivakasi.", "12 stores · 240 items"); **Clothing** (dot
>      `--v-clothing`, "Sarees, shirts and kidswear from local stores.",
>      "8 stores · 316 items"); **Real Estate** (dot `--v-property`, "Plots,
>      houses and apartments. Book a site visit.", "58 listings").
>      On hover: border takes the card's own colour, 2px lift, soft shadow,
>      arrow slides 4px right, 180ms.
>    - **Three coming-soon cards** — **Hotels**, **Restaurants**, **Gym &
>      Fitness** — placed after the live ones. Each is a plain `<div>`, **not**
>      a link or a button: grey `--surface` background, grey `--text-disabled`
>      dot and text, a visible "Soon" pill in the top-right, no count, no
>      arrow, `cursor: default`, **no hover effect of any kind**, and
>      `aria-disabled="true"`. They must not be focusable or clickable — no
>      `href="#"`, no `pointer-events` tricks. Descriptions: "Rooms and stays,
>      opening later." / "Food and table booking, opening later." /
>      "Memberships and classes, opening later."
> 5. **Featured stores** — four cards. 16:9 `--surface` placeholder with a
>    centred monogram, store name, a `Crackers · Sivakasi` meta line, and a
>    `⭐ 4.8 · 42 items` footer.
> 6. **Featured products** — four cards. 1:1 fixed-ratio `--surface` image
>    area, title (2 lines max), "from <store name>", price row (`₹1,899`, MRP
>    struck through, `27% off` in green), a stock line with a dot and words
>    (In stock / Only 6 left / Out of stock), and a full-width "Add to cart"
>    button that becomes a truly `disabled` "Notify me" when out of stock.
>    Include one low-stock and one out-of-stock card so those states are real.
> 7. **Real Estate strip** — three cards, visually different from products:
>    16:10 image area, locality with a pin icon, `₹18.5 L` price, a hairline
>    above a three-fact row (sqft · DTCP · facing), and a **"Book site visit"**
>    button. Never show a seller's phone number.
> 8. **How it works** — three numbered steps on plain background, no cards:
>    "Pick a section", "Reserve it", "Pay on delivery".
> 9. **Trust row** — four items on a `--surface` band: Cash on delivery, GST
>    invoice, Tamil support, Verified stores.
> 10. **Footer** — `--surface`, four columns collapsing to one. List Hotels,
>     Restaurants and Gym & Fitness as plain grey text with "Soon" beside them,
>     **not as links**. Bottom bar: "© 2026 Preebooking · Tirunelveli".
>
> **Interaction:**
>
> - `html { scroll-behavior: smooth; scroll-padding-top: 88px; }` — include the
>   `scroll-padding-top`, the sticky header covers headings without it.
> - Scroll reveal: sections fade in and rise 16px once via
>   `IntersectionObserver` (threshold 0.12), children staggered 60ms, capped at 6. Add a `.js` class to `<html>` from the script's first line and gate the
>   hidden state on it, so the page is fully readable with JavaScript off.
> - `@media (prefers-reduced-motion: reduce)`: disable smooth scroll, collapse
>   transitions to 0.01ms, and force revealed elements visible.
>
> **Accessibility:** one `<h1>`; `<header>`/`<nav>`/`<main id="main">`/
> `<footer>` landmarks; `aria-label` on every icon-only button; `aria-hidden`
> on decorative SVGs; visible `outline: 2px solid var(--accent)` with 3px
> offset on every focusable element; 44×44px minimum hit targets; colour never
> the only signal.
>
> **Images:** there is no photography. Every image area is a `--surface` block
> with a centred monogram or inline-SVG icon in `--text-3`. Do not use stock
> photos or placeholder image services. Icons are an inline `<symbol>` sprite
> referenced with `<use>` — no icon font, no icon CDN.
>
> **Do not add:** a carousel or slider, a newsletter popup, a chat widget, a
> cookie banner, a testimonials section, a counter that animates, a marquee,
> parallax, a dark-mode toggle, or any library (no Tailwind CDN, Bootstrap,
> jQuery, AOS, GSAP). Prices in ₹ with Indian digit grouping.

---

## 12. Rejection checklist

Regenerate if the result does any of these. Most builders will do at least
three on the first pass.

- [ ] A coming-soon card is clickable, focusable, hoverable, or an `<a href="#">`.
- [ ] "Coming soon" is conveyed only by grey colour, with no visible label.
- [ ] A library snuck in — Tailwind CDN, Bootstrap, jQuery, AOS, Font Awesome.
- [ ] Stock photography or a placeholder image service appears anywhere.
- [ ] A carousel, popup, chat bubble, cookie banner, or animated counter appears.
- [ ] `scroll-padding-top` is missing, so the sticky header covers the target heading.
- [ ] Scroll-reveal hides content with no `.js` guard — page is blank without JS.
- [ ] `prefers-reduced-motion` is not handled.
- [ ] `outline: none` anywhere without a visible replacement.
- [ ] Image areas have no fixed aspect ratio, so the page jumps while loading.
- [ ] More than one accent colour is used for interactive elements.
- [ ] The vertical colours are used as card backgrounds instead of small dots.
- [ ] Body text below 15px, or grey text lighter than `--text-3` on white.
- [ ] The page scrolls sideways at 375px width.
- [ ] Shadows on cards at rest, rather than hairline borders.
- [ ] A seller phone number is rendered on any buyer-facing card.
- [ ] Real Estate shows "Add to cart" instead of "Book site visit".
- [ ] Coming-soon sections appear as live links in the footer.
- [ ] A pill/chip/glass badge is used decoratively (eyebrow label, feature
      tags, stat markers) rather than for a real state or count.

---

_Colour and typography are provisional until the client supplies branding —
Section 11 item 2 of the plan. Last updated 12 September 2026._
