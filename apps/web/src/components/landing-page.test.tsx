import { describe, expect, mock, test } from "bun:test";
import type Lenis from "lenis";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { helicopterRide } from "@/lib/site";
import LandingPage, { formatStatNumber, navigateToSection } from "./landing-page";

const html = renderToStaticMarkup(<LandingPage />);

test("stat counters format whole and decimal display units without decimal drift", () => {
  expect(formatStatNumber(79111)).toBe("79,111");
  expect(formatStatNumber(1499)).toBe("1,499");
  expect(formatStatNumber(0, 1)).toBe("0.0");
  expect(formatStatNumber(149, 1)).toBe("14.9");
  expect(formatStatNumber(408.8, 1)).toBe("40.9");
});

test("section scrolling preserves history and focus, with native and instant fallbacks", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const location = { hash: "" };
  const pushState = mock((_state: unknown, _title: string, hash: string) => { location.hash = hash; });
  const focus = mock();
  const scrollIntoView = mock();
  const scrollTo = mock();
  const target = { id: "community", focus, scrollIntoView } as unknown as HTMLElement;
  const lenis = { scrollTo } as unknown as Lenis;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location, history: { pushState } } });
  try {
    navigateToSection(target, lenis);
    expect(pushState).toHaveBeenCalledWith(null, "", "#community");
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollTo).toHaveBeenLastCalledWith(target, { immediate: false });
    expect(scrollIntoView).not.toHaveBeenCalled();

    navigateToSection(target, lenis, true);
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith(target, { immediate: true });

    navigateToSection(target, null);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "auto" });
    navigateToSection(target, null, true);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "instant" });
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

describe("landing page public contract", () => {
  test("uses the corrected PreBooking name while preserving the supplied email", () => {
    expect(html).toContain('<strong>PreBooking</strong>');
    expect(html).not.toMatch(/\b(?:Prebook|Prebooking)\b|World 1|PBK1/);
    expect(html).not.toContain('/brand/logo.webp');
    expect(html).toContain('mailto:prebookingpbkworld1@gmail.com');
  });

  test("every navigation anchor leads to a section in the rendered page", () => {
    const ids = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
    );
    const anchors = [...html.matchAll(/\bhref="#([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) expect(ids.has(anchor)).toBe(true);
    for (const section of [
      "main",
      "events",
      "community",
      "why-prebooking",
      "who-its-for",
      "referrals",
      "shared-learning",
      "community-values",
      "how-it-works",
      "questions",
      "connect",
    ]) {
      expect(ids.has(section)).toBe(true);
      expect(anchors).toContain(section);
    }
  });

  test("all hero and section photographs resolve locally", () => {
    const images = [
      ...html.matchAll(/(?:src|srcSet|srcset)="(\/images\/[^" ]+)"/g),
    ].map((match) => match[1]);
    expect(new Set(images).size).toBe(6);
    for (const image of images)
      expect(
        existsSync(resolve(import.meta.dir, "../../public", `.${image}`)),
      ).toBe(true);
  });

  test("photographic backgrounds preserve page content and image semantics", () => {
    const hero = html.match(/<section\b[^>]*class="hero"[^>]*>(.*?)<\/section>/s)?.[1];
    expect(hero).toBeDefined();
    expect(hero).toMatch(/<img[^>]*class="hero-background"[^>]*alt=""[^>]*aria-hidden="true"/);
    expect(hero).toContain('fetchPriority="high"');
    expect(hero).toContain('id="hero-title"');
    expect(hero).toContain('href="#connect"');
    expect(hero).not.toContain("Discover what brings us together");
    for (const filename of ["community-introduction.webp", "community-learning.webp"]) {
      const image = [...html.matchAll(/<img\b[^>]*>/g)].find(([markup]) => markup.includes(filename))?.[0];
      expect(image).toMatch(/\balt="[^"]+"/);
      expect(image).toContain('loading="lazy"');
    }
  });

  test("section destinations can receive keyboard focus after navigation", () => {
    for (const destination of html.matchAll(
      /<(?:main|section)\b[^>]*\bid="(?:main|events|community|why-prebooking|who-its-for|referrals|shared-learning|community-values|how-it-works|questions|connect)"[^>]*>/g,
    )) {
      expect(destination[0]).toContain('tabindex="-1"');
    }
  });

  test("renders the community introduction and useful content without JavaScript", () => {
    const text = html.replace(/<[^>]+>/g, " ");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Skip to content");
    const hero = html.match(/<section\b[^>]*\bclass="hero"[^>]*>(.*?)<\/section>/s)?.[1];
    const title = hero?.match(/<h1\b[^>]*>(.*?)<\/h1>/)?.[1];
    expect(title?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).toBe("Business networking across borders.");
    const introduction = hero?.match(/<p\b[^>]*data-hero-copy[^>]*>(.*?)<\/p>/)?.[1];
    expect(introduction).toContain("PreBooking");
    for (const concept of [/business owners/i, /professionals/i, /ideas/i, /referrals/i]) {
      expect(introduction).toMatch(concept);
    }
    for (const concept of [/community/i, /referral/i, /learn/i, /business/i]) {
      expect(text).toMatch(concept);
    }
  });

  test("preview statistics are labelled as illustrative and excluded from search snippets", () => {
    const section = html.match(
      /<section\b[^>]*\bid="community-numbers"[^>]*>(.*?)<\/section>/s,
    )?.[1];
    expect(section).toBeDefined();
    expect(section).toMatch(/^<div\b[^>]*data-nosnippet=""[^>]*>.*<\/div>$/s);
    const text = section!.replace(/<[^>]+>/g, " ");
    expect(text).toContain(
      "Illustrative figures for this preview, not verified PreBooking results.",
    );
    expect(section).toContain('aria-describedby="statistics-note"');
    expect(section).toContain('id="statistics-note"');
    const values = [...section!.matchAll(/<dd\b[^>]*>(.*?)<\/dd>/gs)];
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(value[1]).toMatch(/\d/);
      expect(value[1]).toContain('aria-hidden="true"');
      expect(value[1]).toContain('class="sr-only"');
    }
  });

  test("links use on-page navigation, the event and shops pages, the public contact or the safe provider credit", () => {
    for (const anchor of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
      const destination = anchor[1];
      expect(
        destination.startsWith("#") ||
          destination === helicopterRide.path ||
          destination === "/shops" ||
          destination === "tel:7397167111" ||
          destination === "tel:7397197111" ||
          destination === "mailto:prebookingpbkworld1@gmail.com" ||
          destination === "https://zenyne.com",
      ).toBe(true);
      if (destination === "https://zenyne.com") {
        expect(anchor[0]).toMatch(/\brel="[^"]*\bnoopener\b[^"]*"/);
        expect(anchor[0]).toMatch(/\brel="[^"]*\bnoreferrer\b[^"]*"/);
      }
    }
    expect(html).not.toMatch(
      /<form\b|<input\b|href="\/(checkout|signup|register|membership)/,
    );
  });

  test("shows the public enquiry contact without limiting the community to one location", () => {
    const contacts = [...html.matchAll(/href="(tel:[^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(contacts.length).toBeGreaterThanOrEqual(3);
    for (const contact of contacts) {
      expect(["tel:7397167111", "tel:7397197111"]).toContain(contact);
    }
    expect(contacts).toContain("tel:7397197111");
    const header = html.match(/<header\b[^>]*>.*?<\/header>/)?.[0];
    expect(header).toBeDefined();
    expect(header).not.toContain("Tirunelveli");
    expect(header).toContain('href="tel:7397167111"');
    expect(header).not.toContain('href="mailto:prebookingpbkworld1@gmail.com"');
    const navigation = header!.match(/<nav\b[^>]*aria-label="Main navigation"[^>]*>(.*?)<\/nav>/s)?.[1];
    const links = [...(navigation ?? "").matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    expect(links).toEqual(["community", "why-prebooking", "how-it-works", "events", "questions"]);
    expect(navigation).toContain('<a href="/shops">Shops</a>');
    expect(header).not.toContain("coming soon");
    const footer = html.match(/<footer\b[^>]*>.*?<\/footer>/)?.[0];
    const events = html.match(/<section\b[^>]*\bid="events"[^>]*>.*?<\/section>/s)?.[0];
    expect(events).toContain(`href="${helicopterRide.path}"`);
    expect(html.replace(events!, "")).not.toMatch(/Tirunelveli|Tamil Nadu/i);
    expect(html).toContain("global business community");
    expect(footer).toContain('href="tel:7397167111"');
    expect(footer).toContain("73971 67111");
    expect(footer).toContain('href="tel:7397197111"');
    expect(footer).toContain("73971 97111");
    expect(footer).toContain('href="mailto:prebookingpbkworld1@gmail.com"');
    expect(footer).toContain('aria-label="Explore PreBooking"');
    expect(footer).toContain('aria-label="Community links"');
    expect(footer).toContain('href="#referrals"');
    expect(footer).toContain("Back to top");
    expect(html).not.toContain('class="closing-number"');
  });

  test("FAQ answers ship in HTML and can expand without JavaScript", () => {
    expect(html.match(/<details\b/g)).toHaveLength(5);
    expect(html.match(/<summary\b/g)).toHaveLength(5);
    for (const disclosure of html.matchAll(
      /<details\b[^>]*>(.*?)<\/details>/g,
    )) {
      expect(disclosure[1]).toMatch(/<summary\b[^>]*>.+?<\/summary>/);
      expect(disclosure[1]).toMatch(/<p\b[^>]*>.+?<\/p>/);
    }
  });
});
