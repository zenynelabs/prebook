import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Product, Shop } from "@/lib/shops";
import RegistrationsDashboard from "./registrations-dashboard";
import ShopsPanel, { generatePassword, loginDetails, whatsappLink } from "./shops-admin";
import Storefront, { ShopsDirectory } from "./storefront";
import { cartTotal, cleanCart, freshRef } from "./storefront-cart";

const shop: Shop = {
  slug: "nellai-oil-mart",
  name: "Nellai Oil Mart",
  tagline: "Fresh oils and groceries",
  theme: "saffron",
  logo: null,
  banners: [{ image: "banner.jpg", title: "Diwali offers", subtitle: "Up to 20% off oils" }],
  faqs: [{ question: "Do you deliver to Palayamkottai?", answer: "Yes, every day." }],
};

const base: Omit<Product, "id" | "name" | "price_paise"> = { kind: "product", category: "", description: "", size: "", mrp_paise: null, image: null, in_stock: true, sort: 0, items: [], created_at: "2026-10-27T10:00:00Z", updated_at: null };
const products: Product[] = [
  { ...base, id: 1, name: "Sunflower oil", category: "Oils", size: "1 L bottle", price_paise: 14500, mrp_paise: 16000 },
  { ...base, id: 2, name: "Toor dal", category: "Pulses & dals", size: "1 kg", price_paise: 16050 },
  { ...base, id: 3, name: "Groundnut oil", category: "Oils", size: "1 L bottle", price_paise: 21000, in_stock: false },
  { ...base, id: 4, name: "Tea powder", price_paise: 9000 },
  { ...base, id: 5, kind: "combo", name: "Kitchen starter", price_paise: 28000, image: "combo.jpg", items: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }, { id: 99, qty: 1 }] },
];

test("storefront renders the whole shop as plain HTML with the theme applied", () => {
  const html = renderToStaticMarkup(<Storefront shop={shop} products={products} />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain("--accent:#b4530a");
  expect(html).toContain("Diwali offers");
  expect(html).toContain('href="#combos"');
  expect(html).toContain('href="#cat-oils"');
  expect(html).toContain("More products");
  expect(html).toContain("₹145");
  expect(html).toContain("₹160.50");
  expect(html).toContain("<s>");
  expect(html).toContain("9% off");
  expect(html).toContain("Out of stock");
  expect(html).toContain("More shops on PreBooking");
  expect(html).toContain("https://zenyne.com");
  expect(html).not.toMatch(/\d{10}|tel:/);
});

test("every in-stock product gets an add button, the FAQ merges shop and ordering answers", () => {
  const html = renderToStaticMarkup(<Storefront shop={shop} products={products} />);
  expect(html.match(/to cart<\/span>/g)).toHaveLength(4);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Out of stock/);
  expect(html).toContain("Do you deliver to Palayamkottai?");
  expect(html).toContain("How do I pay?");
  expect(html).toContain('id="how-to-order"');
  expect(html).toContain('aria-roledescription="carousel"');
});

test("a shop without banners gets a hero that links to its first section", () => {
  const html = renderToStaticMarkup(<Storefront shop={{ ...shop, banners: [], tagline: "" }} products={products} />);
  expect(html).toContain("Order from Nellai Oil Mart online");
  expect(html).toContain('href="#combos">Start shopping');
});

test("the cart drops sold-out or missing products and totals in paise", () => {
  const lines = cleanCart([{ id: 1, qty: 2 }, { id: 3, qty: 1 }, { id: 42, qty: 1 }, { id: 2, qty: 500 }, { id: 4, qty: 0 }], products);
  expect(lines).toEqual([{ id: 1, qty: 2 }, { id: 2, qty: 99 }]);
  expect(cartTotal(lines, products)).toBe(2 * 14500 + 99 * 16050);
});

test("a combo lists what it includes, skips unknown items and shows the saving", () => {
  const html = renderToStaticMarkup(<Storefront shop={shop} products={products} />);
  expect(html).toContain("Includes 2 × Sunflower oil 1 L bottle, 1 × Toor dal 1 kg");
  // 2 × 145 + 160.50 = 450.50 separately, 280 as a combo
  expect(html).toContain("Saves ₹170.50 vs buying separately");
});

test("an empty shop says products are coming soon", () => {
  const html = renderToStaticMarkup(<Storefront shop={{ ...shop, banners: [] }} products={[]} />);
  expect(html).toContain("Products are coming soon.");
  expect(html).not.toContain("store-banners");
});

test("/admin/shops opens the shared admin sign-in before listing shops", () => {
  const html = renderToStaticMarkup(<RegistrationsDashboard initialView="shops" />);
  expect(html).toMatch(/<label\b[^>]*for="admin-email"[^>]*>Email/);
  expect(html).toContain('type="password"');
  expect(html).not.toContain("<table");
});

test("the shops panel keeps the create form in a dialog and waits for its first load", () => {
  const html = renderToStaticMarkup(<ShopsPanel token="t" onSessionEnd={() => {}} />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain("New shop");
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).not.toContain('name="owner_phone"');
  expect(html).not.toContain("No shops yet");
  expect(html).not.toContain("admin-shell");
});

test("generated passwords are readable and the shared details carry the login", () => {
  const password = generatePassword();
  expect(password).toMatch(/^[A-HJKMNP-Za-km-z2-9]{10}$/);
  expect(loginDetails({ name: "Nellai Oil Mart", slug: "nellai-oil-mart", owner_phone: "9876543210" }, password)).toContain(
    "Login: https://www.prebookingpbkworld.com/shop-admin",
  );
  expect(whatsappLink("9876543210", "a b\nc")).toBe("https://wa.me/919876543210?text=a%20b%0Ac");
});

test("the shops directory links each active shop in its theme, with a calm empty state", () => {
  const html = renderToStaticMarkup(<ShopsDirectory shops={[shop, { ...shop, slug: "murugan-oils", name: "Murugan Oils", theme: "green", tagline: "" }]} />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain('href="/shops/nellai-oil-mart"');
  expect(html).toContain('href="/shops/murugan-oils"');
  expect(html).toContain("--accent:#1f6b3a");
  expect(html).not.toMatch(/\d{10}/);
  expect(renderToStaticMarkup(<ShopsDirectory shops={[]} />)).toContain("Shops are coming soon.");
});

test("an affiliate ref is sent only while it is a valid code under 30 days old", () => {
  const now = Date.UTC(2026, 9, 27);
  expect(freshRef({ code: "0a1b2c3d", at: now - 29 * 864e5 }, now)).toBe("0a1b2c3d");
  expect(freshRef({ code: "0a1b2c3d", at: now - 31 * 864e5 }, now)).toBeUndefined();
  expect(freshRef({ code: "XYZ", at: now }, now)).toBeUndefined();
  expect(freshRef(null, now)).toBeUndefined();
});

test("products carry #p-<id> anchors for affiliate links and the footer invites affiliates", () => {
  const html = renderToStaticMarkup(<Storefront shop={shop} products={products} />);
  expect(html).toContain('id="p-1"');
  expect(html).toContain('id="p-5"');
  expect(html).toContain('href="/affiliate?shop=nellai-oil-mart">Become an affiliate');
});
