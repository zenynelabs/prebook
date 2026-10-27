import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import EventPage, { affiliateRef } from "./event-page";
import RegistrationsDashboard, { affiliateLink, type Filters, filterRegistrations, rankAffiliates, type Registration, summarise } from "./registrations-dashboard";

test("event page ships its details and a complete registration form in HTML", () => {
  const html = renderToStaticMarkup(<EventPage />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toMatch(/Tirunelveli/);
  expect(html).toContain('id="register"');
  const control = (name: string) => html.match(new RegExp(`<(?:input|textarea)\\b[^>]*name="${name}"[^>]*>`))?.[0];
  for (const field of ["name", "phone", "address"]) expect(control(field)).toContain('required=""');
  expect(control("email")).not.toContain("required");
  expect(html.match(/<option\b/g)).toHaveLength(6);
  for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g))
    expect(["#main", "#register", "/", "/#events", "tel:7397167111", "tel:7397197111", "https://zenyne.com"]).toContain(href);
});

test("dashboard asks for the access token before showing any registrations", () => {
  const html = renderToStaticMarkup(<RegistrationsDashboard />);
  expect(html).toContain('type="password"');
  expect(html).not.toContain("<table");
});

test("dashboard filters combine status, payment and search, and totals skip cancelled seats", () => {
  const base = { email: null, notes: "", ref: null, created_at: "2026-10-27T10:00:00Z", updated_at: null };
  const rows: Registration[] = [
    { ...base, id: 1, name: "Arun Kumar", phone: "9876543210", address: "Palayamkottai 627002", passengers: 2, status: "confirmed", payment_status: "paid", notes: "Paid by UPI" },
    { ...base, id: 2, name: "Meena", phone: "9123456780", email: "meena@example.com", address: "Town, Tirunelveli", passengers: 1, status: "new", payment_status: "unpaid" },
    { ...base, id: 3, name: "Ravi", phone: "9000000003", address: "Junction, Tirunelveli", passengers: 4, status: "cancelled", payment_status: "paid" },
  ];
  const all: Filters = { query: "", status: "all", payment: "all" };
  const ids = (filters: Partial<Filters>) => filterRegistrations(rows, { ...all, ...filters }).map((row) => row.id);
  expect(ids({})).toEqual([1, 2, 3]);
  expect(ids({ query: "  arun " })).toEqual([1]);
  expect(ids({ query: "98765 43210" })).toEqual([1]);
  expect(ids({ query: "example.com" })).toEqual([2]);
  expect(ids({ query: "upi" })).toEqual([1]);
  expect(ids({ query: "Town 98" })).toEqual([]);
  expect(ids({ status: "new" })).toEqual([2]);
  expect(ids({ payment: "paid" })).toEqual([1, 3]);
  expect(ids({ payment: "paid", status: "confirmed", query: "tirunelveli" })).toEqual([]);
  expect(summarise(rows)).toEqual({ registrations: 3, seats: 3, confirmed: 1, paid: 1 });

  const affiliates = [
    { code: "quiet", name: "Quiet", created_at: base.created_at },
    { code: "selvi", name: "Selvi", created_at: base.created_at },
  ];
  const referred = rows.map((row) => ({ ...row, ref: row.id === 2 ? null : "selvi" }));
  expect(rankAffiliates(affiliates, referred).map(({ code, registrations, seats }) => [code, registrations, seats])).toEqual([
    ["selvi", 2, 2],
    ["quiet", 0, 0],
  ]);
  expect(affiliateLink("selvi")).toBe("https://www.prebookingpbkworld.com/events/helicopter-ride?ref=selvi");
});

test("the affiliate ref is remembered for later visits, and a newer link replaces it", () => {
  const store = new Map<string, string>();
  globalThis.localStorage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) } as unknown as Storage;
  expect(affiliateRef("")).toBeNull();
  expect(affiliateRef("?ref=selvi")).toBe("selvi");
  expect(affiliateRef("?utm=x")).toBe("selvi");
  expect(affiliateRef("?ref=ravi")).toBe("ravi");
});
