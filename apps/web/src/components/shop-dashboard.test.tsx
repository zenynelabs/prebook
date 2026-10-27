import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Order, Product } from "@/lib/shops";
import ShopDashboard, { affiliateNote, buildProductInput, comboItems, filterOrders, filterProducts, type ProductFields, toInput, whatsappLink } from "./shop-dashboard";

const base = { description: "", image: null, in_stock: true, sort: 0, items: [], created_at: "2026-10-27T10:00:00Z", updated_at: null };
const rows: Product[] = [
  { ...base, id: 1, kind: "product", name: "Sunflower oil", category: "Oils", size: "1 L bottle", price_paise: 14500, mrp_paise: 16000 },
  { ...base, id: 2, kind: "product", name: "Toor dal", category: "Pulses & dals", size: "1 kg", price_paise: 16250, mrp_paise: null },
];

test("the shop dashboard asks for the shop link name and password before showing anything", () => {
  const html = renderToStaticMarkup(<ShopDashboard />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain('for="shop-slug"');
  expect(html).toContain('for="shop-password"');
  expect(html).toMatch(/<input\b[^>]*id="shop-password"[^>]*type="password"|<input\b[^>]*type="password"[^>]*id="shop-password"/);
  expect(html).toContain("<form");
  expect(html).not.toContain("<table");
});

test("product search matches name, category and size", () => {
  expect(filterProducts(rows, "").map((row) => row.id)).toEqual([1, 2]);
  expect(filterProducts(rows, "  OIL ").map((row) => row.id)).toEqual([1]);
  expect(filterProducts(rows, "dals").map((row) => row.id)).toEqual([2]);
  expect(filterProducts(rows, "1 kg").map((row) => row.id)).toEqual([2]);
  expect(filterProducts(rows, "rice")).toEqual([]);
});

test("product forms become integer paise and explain each problem", () => {
  const fields: ProductFields = { name: " Sunflower oil ", category: "Oils", size: "1 L bottle", description: "", price: "145.5", mrp: "160", sort: "", image: "k.webp", in_stock: true };
  expect(buildProductInput("product", fields, [])).toEqual({
    input: { kind: "product", name: "Sunflower oil", category: "Oils", size: "1 L bottle", description: "", price_paise: 14550, mrp_paise: 16000, image: "k.webp", in_stock: true, sort: 0, items: [] },
  });
  const errors = (change: Partial<ProductFields>) => {
    const result = buildProductInput("product", { ...fields, ...change }, []);
    return "errors" in result ? result.errors : {};
  };
  expect(errors({ price: "abc" }).price).toMatch(/245/);
  expect(errors({ price: "" }).price).toBeDefined();
  expect(errors({ mrp: "x" }).mrp).toMatch(/245/);
  expect(errors({ mrp: "100" }).mrp).toMatch(/lower than the price/);
  expect(errors({ mrp: "" })).toEqual({});
  expect(errors({ sort: "1.5" }).sort).toBeDefined();
});

test("a combo needs between 1 and 20 products and keeps only those quantities", () => {
  const fields: ProductFields = { name: "Kitchen kit", category: "", size: "", description: "", price: "300", mrp: "", sort: "2", image: null, in_stock: true };
  const items = comboItems({ 1: 2, 2: 0, 3: 150, 4: Number.NaN });
  expect(items).toEqual([{ id: 1, qty: 2 }, { id: 3, qty: 99 }]);
  expect(buildProductInput("combo", fields, items)).toMatchObject({ input: { kind: "combo", price_paise: 30000, sort: 2, items } });
  expect(buildProductInput("combo", fields, [])).toMatchObject({ errors: { items: expect.stringMatching(/at least one/) } });
  const many = Array.from({ length: 21 }, (_, index) => ({ id: index + 1, qty: 1 }));
  expect(buildProductInput("combo", fields, many)).toMatchObject({ errors: { items: expect.stringMatching(/up to 20/) } });
});

test("a quick stock toggle sends the product back without its server-owned fields", () => {
  const input = toInput(rows[0]);
  expect(input).not.toHaveProperty("id");
  expect(input).not.toHaveProperty("created_at");
  expect(input).not.toHaveProperty("updated_at");
  expect(input).toMatchObject({ kind: "product", name: "Sunflower oil", price_paise: 14500, mrp_paise: 16000, in_stock: true });
});

test("order filters and WhatsApp links", () => {
  const order = (id: number, status: Order["status"]) => ({ id, status }) as Order;
  const list = [order(1, "new"), order(2, "delivered")];
  expect(filterOrders(list, "all")).toHaveLength(2);
  expect(filterOrders(list, "delivered").map((row) => row.id)).toEqual([2]);
  expect(whatsappLink("+91 98765-43210")).toBe("https://wa.me/919876543210");
  expect(whatsappLink("12345")).toBeNull();
});

test("an order brought in by an affiliate names them and the commission fixed at checkout", () => {
  const order = (affiliate: string | null, commission_paise: number) => ({ affiliate, commission_paise }) as Order;
  expect(affiliateNote(order("Ravi", 4550))).toBe("via Ravi · ₹45.50 commission");
  expect(affiliateNote(order("Ravi", 0))).toBe("via Ravi · ₹0 commission");
  expect(affiliateNote(order(null, 0))).toBeNull();
});
