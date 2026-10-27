import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import AffiliateDashboard, { totals } from "./affiliate-dashboard";

test("the affiliate page asks for mobile number and password before showing anything", () => {
  const html = renderToStaticMarkup(<AffiliateDashboard />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain('for="affiliate-phone"');
  expect(html).toContain('for="affiliate-password"');
  expect(html).not.toContain('for="affiliate-name"');
  expect(html).not.toContain("<table");
});

test("totals add up every shop's orders and commission", () => {
  const stats = { sales_paise: 0 };
  const shops = [
    { ...stats, orders: 2, earned_paise: 1500, pending_paise: 500 },
    { ...stats, orders: 1, earned_paise: 250, pending_paise: 0 },
  ] as Parameters<typeof totals>[0];
  expect(totals(shops)).toEqual({ orders: 3, earned_paise: 1750, pending_paise: 500 });
  expect(totals([])).toEqual({ orders: 0, earned_paise: 0, pending_paise: 0 });
});
