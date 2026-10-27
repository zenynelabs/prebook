import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import EventPage from "./event-page";
import RegistrationsDashboard, { filterRegistrations, type Registration } from "./registrations-dashboard";

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

test("dashboard search matches text fields and formatted mobile numbers", () => {
  const rows: Registration[] = [
    { id: 1, name: "Arun Kumar", phone: "9876543210", email: null, address: "Palayamkottai 627002", passengers: 2, created_at: "2026-10-27T10:00:00Z" },
    { id: 2, name: "Meena", phone: "9123456780", email: "meena@example.com", address: "Town, Tirunelveli", passengers: 1, created_at: "2026-10-27T11:00:00Z" },
  ];
  expect(filterRegistrations(rows, "")).toHaveLength(2);
  expect(filterRegistrations(rows, "  arun ").map((row) => row.id)).toEqual([1]);
  expect(filterRegistrations(rows, "98765 43210").map((row) => row.id)).toEqual([1]);
  expect(filterRegistrations(rows, "example.com").map((row) => row.id)).toEqual([2]);
  expect(filterRegistrations(rows, "Palayam").map((row) => row.id)).toEqual([1]);
  expect(filterRegistrations(rows, "zzz")).toHaveLength(0);
  expect(filterRegistrations(rows, "Town 98")).toHaveLength(0);
});
