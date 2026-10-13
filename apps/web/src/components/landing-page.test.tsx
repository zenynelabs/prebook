import { describe, expect, mock, test } from "bun:test";
import type Lenis from "lenis";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import LandingPage, { navigateToSection } from "./landing-page";

const html = renderToStaticMarkup(<LandingPage />);

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
      "community",
      "why-prebooking",
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
    expect(new Set(images).size).toBe(2);
    for (const image of images)
      expect(
        existsSync(resolve(import.meta.dir, "../../public", `.${image}`)),
      ).toBe(true);
  });

  test("section destinations can receive keyboard focus after navigation", () => {
    for (const destination of html.matchAll(
      /<(?:main|section)\b[^>]*\bid="(?:main|community|why-prebooking|how-it-works|questions|connect)"[^>]*>/g,
    )) {
      expect(destination[0]).toContain('tabindex="-1"');
    }
  });

  test("renders the community introduction and useful content without JavaScript", () => {
    const text = html.replace(/<[^>]+>/g, " ");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Skip to content");
    const introduction = html.match(/<h1\b[^>]*>(.*?)<\/h1>/)?.[1];
    expect(introduction).toMatch(/business|connect|community/i);
    for (const concept of [/community/i, /referral/i, /learn/i, /business/i]) {
      expect(text).toMatch(concept);
    }
  });

  test("preview statistics are clearly labelled as illustrative", () => {
    const section = html.match(
      /<section\b[^>]*\bid="community-numbers"[^>]*>(.*?)<\/section>/s,
    )?.[1];
    expect(section).toBeDefined();
    const text = section!.replace(/<[^>]+>/g, " ");
    expect(text).toContain(
      "Illustrative figures for this preview, not verified Prebooking results.",
    );
    expect(section).toContain('aria-describedby="statistics-note"');
    expect(section).toContain('id="statistics-note"');
    const values = [...section!.matchAll(/<dd\b[^>]*>(.*?)<\/dd>/gs)];
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(value[1]).toMatch(/\d/);
    }
  });

  test("links use on-page navigation, the public contact or the safe provider credit", () => {
    for (const anchor of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
      const destination = anchor[1];
      expect(
        destination.startsWith("#") ||
          destination === "tel:7397167111" ||
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

  test("shows the public enquiry contact and keeps location out of the header", () => {
    const contacts = [...html.matchAll(/href="(tel:[^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(contacts.length).toBeGreaterThanOrEqual(3);
    for (const contact of contacts) expect(contact).toBe("tel:7397167111");
    const header = html.match(/<header\b[^>]*>.*?<\/header>/)?.[0];
    expect(header).toBeDefined();
    expect(header).not.toContain("Tirunelveli");
    expect(header).toContain('href="tel:7397167111"');
    const footer = html.match(/<footer\b[^>]*>.*?<\/footer>/)?.[0];
    expect(footer).toContain("Tirunelveli, Tamil Nadu");
    expect(footer).toContain('href="tel:7397167111"');
    expect(footer).toContain("73971 67111");
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
