import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { mobileDigits, phoneKeys, validateRegistration } from "@/lib/registration";
import EventPage, { affiliateRef, BoardingPass } from "./event-page";
import { rideTime, TimePicker } from "./ui/time-picker";
import RegistrationsDashboard, { affiliateLink, type Filters, filterRegistrations, linkCode, paginate, rankAffiliates, type Registration, summarise } from "./registrations-dashboard";

test("the event card heading has its label without an icon", () => {
  const html = renderToStaticMarkup(<BoardingPass />);
  const heading = html.match(/<div class="pass-head">(.*?)<\/div>/s)?.[1];
  expect(heading).toContain("Helicopter ride");
  expect(heading).not.toContain("<svg");
});

test("event page ships its details and a complete registration form in HTML", () => {
  const html = renderToStaticMarkup(<EventPage />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toMatch(/Tirunelveli/);
  expect(html).toContain('id="register"');
  const control = (name: string) => html.match(new RegExp(`<(?:input|textarea)\\b[^>]*name="${name}"[^>]*>`))?.[0];
  for (const field of ["name", "phone", "address"]) expect(control(field)).toContain('required=""');
  expect(control("email")).not.toContain("required");
  expect(html.match(/<select\b[^>]*name="passengers"[^>]*>[\s\S]*?<\/select>/)?.[0].match(/<option\b/g)).toHaveLength(6);
  for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g))
    expect(["#main", "#register", "/", "/#events", "tel:7397167111", "tel:7397197111", "https://zenyne.com"]).toContain(href);
});

test("the helicopter form uses shadcn controls with labels and mobile help", () => {
  const html = renderToStaticMarkup(<EventPage />);
  const form = html.match(/<form\b[\s\S]*?<\/form>/)?.[0] ?? "";
  expect(html).toContain('data-slot="card"');
  expect(form).toContain('aria-busy="false"');
  expect(form).toContain('noValidate=""');
  expect(form.match(/data-slot="field"/g)).toHaveLength(7);
  expect(form.match(/data-slot="input"/g)).toHaveLength(4);
  expect(form).toContain('data-slot="textarea"');
  expect(form).toContain('data-slot="native-select"');
  expect(form).toContain('data-slot="button"');
  for (const field of ["name", "phone", "email", "address", "passengers", "ride_date", "ride_time"])
    expect(form).toContain(`for="${field}"`);
  expect(form).toMatch(/<input\b[^>]*aria-describedby="phone-description"/);
  expect(form).toContain('id="phone-description"');
  expect(form).toContain('name="passengers"');
  expect(form.match(/data-slot="native-select"/g)).toHaveLength(4);
  expect(form).not.toContain('role="alert"');
});

test("dashboard asks staff to sign in with email and password before showing any registrations", () => {
  const html = renderToStaticMarkup(<RegistrationsDashboard />);
  expect(html).toMatch(/<label\b[^>]*for="admin-email"[^>]*>Email/);
  expect(html).toMatch(/<input\b[^>]*type="email"[^>]*autoComplete="username"/);
  expect(html).toMatch(/<input\b[^>]*type="password"[^>]*autoComplete="current-password"/);
  expect(html).not.toContain("Access token");
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

test("affiliate link codes are filled from the name the way the API saves them", () => {
  expect(linkCode("Selvi Travels")).toBe("selvi-travels");
  expect(linkCode("  Nambi & Sons, Nellai! ")).toBe("nambi-sons-nellai");
  expect(linkCode("தமிழ்")).toBe("");
  expect(linkCode("x".repeat(40))).toHaveLength(32);
});

test("pagination slices pages, clamps out-of-range pages and reports the visible range", () => {
  const items = Array.from({ length: 57 }, (_, index) => index + 1);
  expect(paginate(items, 1, 25)).toMatchObject({ page: 1, pages: 3, from: 1, to: 25, total: 57 });
  expect(paginate(items, 3, 25)).toMatchObject({ page: 3, from: 51, to: 57, items: [51, 52, 53, 54, 55, 56, 57] });
  expect(paginate(items, 9, 25).page).toBe(3);
  expect(paginate(items, 0, 25).page).toBe(1);
  expect(paginate([], 1, 25)).toMatchObject({ page: 1, pages: 1, from: 0, to: 0, items: [] });
});

test("registration validation explains each problem and accepts real Indian details", () => {
  const ok = { name: "Arun Kumar", phone: "98765 43210", email: "", address: "12 North Car Street, Tirunelveli 627006", passengers: "2", ride_date: "2026-11-06", ride_time: "10:30" };
  expect(validateRegistration(ok)).toEqual({});
  expect(validateRegistration({ ...ok, name: "முருகன்", phone: "+91 98765-43210", email: "arun@example.com" })).toEqual({});
  expect(validateRegistration({ ...ok, phone: "09876543210" })).toEqual({});
  expect(Object.keys(validateRegistration({ ...ok, name: "", phone: "", email: "", address: "" }))).toEqual(["name", "phone", "address"]);
  expect(validateRegistration({ ...ok, name: "Rasla 99" }).name).toMatch(/letters only/);
  expect(validateRegistration({ ...ok, phone: "99948" }).phone).toMatch(/10-digit/);
  expect(validateRegistration({ ...ok, phone: "5876543210" }).phone).toMatch(/start with 6, 7, 8 or 9/);
  expect(validateRegistration({ ...ok, email: "arun@" }).email).toMatch(/valid email/);
  expect(validateRegistration({ ...ok, address: "1234567890 12" }).address).toMatch(/street and area/);
  expect(validateRegistration({ ...ok, passengers: "7" }).passengers).toMatch(/1 and 6/);
  expect(validateRegistration({ ...ok, ride_date: "2026-11-04" }).ride_date).toMatch(/November 6/);
  for (const ride_time of ["", "24:00", "12:60", "9:00", "10:30:00"])
    expect(validateRegistration({ ...ok, ride_time }).ride_time).toMatch(/preferred ride time/);
  for (const ride_time of ["00:00", "09:00", "23:59"])
    expect(validateRegistration({ ...ok, ride_time })).toEqual({});
});

test("ride form preselects November 6 and asks for a preferred time in IST", () => {
  const html = renderToStaticMarkup(<EventPage />);
  const date = html.match(/<input\b[^>]*name="ride_date"[^>]*>/)?.[0];
  const time = html.match(/<input\b[^>]*name="ride_time"[^>]*>/)?.[0];
  expect(date).toContain('type="hidden"');
  expect(date).toContain('value="2026-11-06"');
  expect(html).toContain('value="November 6, 2026"');
  expect(time).toContain('type="hidden"');
  const hour = html.match(/<select\b[^>]*id="ride_time"[^>]*>/)?.[0];
  expect(hour).toContain('required=""');
  expect(hour).toContain('aria-describedby="ride-time-description"');
  expect(html).toContain("Preferred ride time (IST)");
});

test("time picker converts 12-hour choices without losing noon or midnight", () => {
  expect(rideTime("12", "00", "AM")).toBe("00:00");
  expect(rideTime("12", "22", "PM")).toBe("12:22");
  expect(rideTime("01", "05", "PM")).toBe("13:05");
  expect(rideTime("09", "30", "AM")).toBe("09:30");
  for (const [hour, minute, period] of [["", "00", "AM"], ["13", "00", "AM"], ["10", "60", "PM"], ["10", "00", ""]])
    expect(rideTime(hour, minute, period)).toBe("");
  const html = renderToStaticMarkup(<TimePicker id="ride_time" invalid describedBy="ride_time-error" onChange={() => {}} onBlur={() => {}} />);
  for (const label of ["Hour", "Minute", "AM or PM"])
    expect(html).toContain(`aria-label="${label}"`);
  expect(html.match(/aria-invalid="true"/g)).toHaveLength(3);
  expect(html.match(/aria-describedby="ride_time-error"/g)).toHaveLength(3);
  expect(html).not.toContain('type="time"');
  const minutes = html.match(/<select\b[^>]*aria-label="Minute"[^>]*>(.*?)<\/select>/s)?.[1] ?? "";
  expect([...minutes.matchAll(/value="([^"]+)"/g)].map((match) => match[1])).toEqual(["00", "15", "30", "45"]);
});

test("the mobile field drops letters as they are typed and normalises prefixes", () => {
  expect(phoneKeys("99948dadada")).toBe("99948");
  expect(phoneKeys("+91 98765-43210 ext")).toBe("9876543210");
  expect(phoneKeys("99946556778099")).toBe("9994655677");
  expect(mobileDigits("+91 98765-43210")).toBe("9876543210");
  expect(mobileDigits("09876543210")).toBe("9876543210");
});
