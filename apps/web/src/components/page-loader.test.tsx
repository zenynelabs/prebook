import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import PageLoader from "./page-loader";

describe("page loader public contract", () => {
  test("server renders an accessible indeterminate loader without browser globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = renderToStaticMarkup(<PageLoader />);

    expect(html).toContain('data-state="loading"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Loading Prebook"');
    expect(html).toContain('aria-valuetext="Loading page"');
    expect(html).not.toContain("aria-valuenow=");
  });

  test("does not introduce focus controls or block access to the page", () => {
    const html = renderToStaticMarkup(<PageLoader />);

    expect(html).not.toMatch(/<(?:a|button|input|select|textarea|dialog)\b/);
    expect(html).not.toMatch(/\b(?:tabindex|autofocus|contenteditable|inert|aria-modal)=/);
    expect(html).toContain('aria-hidden="true"');
  });
});
