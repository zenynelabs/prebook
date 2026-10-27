"use client";

import { Check, Copy, LogOut } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AFFILIATE_TOKEN_KEY,
  type AffiliateDashboard as Dashboard,
  affiliateLink,
  affiliatePath,
  affiliateStatuses,
  formatRupees,
  orderStatuses,
  shopPath,
  shopSlug,
  shopsPath,
  themeStyle,
} from "@/lib/shops";
import { eventsApi } from "@/lib/site";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const OFFLINE = "Couldn’t reach the server. Check your connection and retry.";
const SESSION_ENDED = "Your session has ended. Sign in again.";

const orderDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function storage(action: (store: Storage) => string | null | void) {
  try {
    return action(sessionStorage) ?? null;
  } catch {
    return null;
  }
}

/** Totals across every shop the affiliate has applied to. */
export function totals(shops: Dashboard["shops"]) {
  return shops.reduce(
    (sum, shop) => ({
      orders: sum.orders + shop.orders,
      earned_paise: sum.earned_paise + shop.earned_paise,
      pending_paise: sum.pending_paise + shop.pending_paise,
    }),
    { orders: 0, earned_paise: 0, pending_paise: 0 },
  );
}

function Brand() {
  return (
    <Link className="brand admin-brand" href="/" aria-label="PreBooking home">
      <img
        src="/brand/navbar-logo-transparent.png"
        alt=""
        width="192"
        height="192"
      />
      <span className="brand-copy">
        <strong>PreBooking</strong>
        <span>Affiliate</span>
      </span>
    </Link>
  );
}

/** Copies on click; if the clipboard is blocked, shows the link selected so it can be copied by hand. */
function CopyLink({ link }: { link: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "manual") field.current?.select();
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" type="button" onClick={copy}>
        {state === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        {state === "copied" ? "Copied" : "Copy link"}
      </Button>
      {state === "manual" && (
        <Input
          ref={field}
          readOnly
          value={link}
          aria-label="Link to copy"
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </>
  );
}

export default function AffiliateDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [apply, setApply] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signOut = useCallback((message = "") => {
    storage((store) => store.removeItem(AFFILIATE_TOKEN_KEY));
    setToken(null);
    setData(null);
    setError(message);
  }, []);

  // Applies to the shop that sent the visitor here (once), then loads the dashboard.
  const load = useCallback(
    async (value: string, shop: string | null) => {
      const headers = { Authorization: `Bearer ${value}` };
      setLoading(true);
      setError("");
      try {
        let problem = "";
        if (shop) {
          const applied = await fetch(`${eventsApi}/partner/shops/${shop}`, {
            method: "POST",
            headers,
          });
          if (applied.status === 401) return signOut(SESSION_ENDED);
          if (!applied.ok)
            problem =
              (await applied.json().catch(() => ({}))).error ??
              "Couldn’t apply to that shop.";
          history.replaceState(null, "", affiliatePath);
          setApply(null);
        }
        const response = await fetch(`${eventsApi}/partner/dashboard`, {
          headers,
          cache: "no-store",
        });
        if (response.status === 401) return signOut(SESSION_ENDED);
        if (!response.ok) throw new Error();
        const body: Dashboard = await response.json();
        storage((store) => store.setItem(AFFILIATE_TOKEN_KEY, value));
        setToken(value);
        setData(body);
        setError(problem);
      } catch {
        setError(OFFLINE);
      } finally {
        setLoading(false);
      }
    },
    [signOut],
  );

  useEffect(() => {
    const asked = new URLSearchParams(location.search).get("shop");
    const shop = asked && shopSlug(asked) === asked ? asked : null;
    setApply(shop);
    const saved = storage((store) => store.getItem(AFFILIATE_TOKEN_KEY));
    if (saved) load(saved, shop);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const register = mode === "register";
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${eventsApi}/partner-auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(register && { name: String(fields.get("name")) }),
            phone: String(fields.get("phone")),
            password: String(fields.get("password")),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (response.ok) return await load(body.token, apply);
      setError(body.error ?? "Couldn’t continue. Try again.");
    } catch {
      setError(OFFLINE);
    }
    setLoading(false);
  }

  async function logout() {
    await fetch(`${eventsApi}/partner-auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    signOut();
  }

  if (!token || !data) {
    const register = mode === "register";
    return (
      <main className="admin-gate">
        <Card className="register-card admin-card gap-0 shadow-none">
          <form className="flex flex-col gap-[22px]" onSubmit={submit}>
            <Brand />
            <h1>{register ? "Create account" : "Sign in"}</h1>
            {apply && (
              <p className="affiliate-hint">
                Sign in or create an account to apply to this shop.
              </p>
            )}
            {register && (
              <Field className="field">
                <FieldLabel htmlFor="affiliate-name">Name</FieldLabel>
                <Input
                  id="affiliate-name"
                  name="name"
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field className="field">
              <FieldLabel htmlFor="affiliate-phone">Mobile number</FieldLabel>
              <Input
                id="affiliate-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
              />
            </Field>
            <Field className="field">
              <FieldLabel htmlFor="affiliate-password">Password</FieldLabel>
              <Input
                id="affiliate-password"
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : undefined}
                required
              />
            </Field>
            <FieldError>{error}</FieldError>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Please wait…" : register ? "Create account" : "Sign in"}
            </Button>
            <button
              type="button"
              className="affiliate-switch"
              onClick={() => {
                setMode(register ? "signin" : "register");
                setError("");
              }}
            >
              {register ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        </Card>
      </main>
    );
  }

  const sum = totals(data.shops);
  return (
    <>
      <header className="affiliate-bar">
        <Brand />
        <Button variant="outline" size="sm" type="button" onClick={logout}>
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </header>

      <main className="admin-content affiliate-content">
        <div className="admin-head">
          <div>
            <p className="admin-eyebrow">{data.affiliate.name}</p>
            <h1>Affiliate dashboard</h1>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="admin-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <dl className="affiliate-totals">
          <div>
            <dt>Earned</dt>
            <dd>{formatRupees(sum.earned_paise)}</dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>{formatRupees(sum.pending_paise)}</dd>
          </div>
          <div>
            <dt>Orders</dt>
            <dd>{sum.orders}</dd>
          </div>
        </dl>

        {data.shops.length === 0 && (
          <p className="affiliate-hint">
            Open a shop’s page and use “Become an affiliate” to apply.{" "}
            <Link className="text-(--accent-text) font-medium" href={shopsPath}>
              Browse shops
            </Link>
          </p>
        )}

        {data.shops.map((shop) => {
          const link = (id?: number) =>
            affiliateLink(location.origin, shop.slug, data.affiliate.code, id);
          return (
            <Card
              key={shop.slug}
              className="shop-section affiliate-shop gap-0 py-0 shadow-none"
              style={themeStyle(shop.theme)}
            >
              <div className="affiliate-shop-head">
                <h2>
                  <Link href={shopPath(shop.slug)}>{shop.name}</Link>
                </h2>
                <p>
                  {affiliateStatuses[shop.status]} · {shop.commission_percent}%
                  commission
                </p>
              </div>
              <p className="affiliate-hint">
                {shop.orders} {shop.orders === 1 ? "order" : "orders"} · Earned{" "}
                {formatRupees(shop.earned_paise)} · Pending{" "}
                {formatRupees(shop.pending_paise)}
              </p>

              {shop.status === "approved" ? (
                <>
                  <div className="shop-link">
                    <span className="shop-url">{link()}</span>
                    <CopyLink link={link()} />
                  </div>
                  <ul className="affiliate-products">
                    {shop.products.map((product) => (
                      <li key={product.id}>
                        <div>
                          <strong className="admin-name">{product.name}</strong>
                          <span className="admin-sub">
                            {[product.size, formatRupees(product.price_paise)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        {product.in_stock ? (
                          <CopyLink link={link(product.id)} />
                        ) : (
                          <span className="admin-sub">Out of stock</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="affiliate-hint">
                  {shop.status === "pending"
                    ? "The shop owner hasn’t approved you yet. Your links appear here once they do."
                    : "The shop owner didn’t approve your application."}
                </p>
              )}
            </Card>
          );
        })}

        <h2 className="affiliate-section-title">Recent orders</h2>
        {data.orders.length === 0 ? (
          <p className="affiliate-hint">No orders through your links yet.</p>
        ) : (
          <Card
            className="affiliate-orders gap-0 py-0 shadow-none"
            role="region"
            tabIndex={0}
            aria-label="Recent orders"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Date</TableHead>
                  <TableHead scope="col">Shop</TableHead>
                  <TableHead scope="col">Order total</TableHead>
                  <TableHead scope="col">Commission</TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((order) => (
                  <TableRow key={order.id} data-status={order.status}>
                    <TableCell>{orderDate.format(new Date(order.created_at))}</TableCell>
                    <TableCell>{order.shop}</TableCell>
                    <TableCell>{formatRupees(order.total_paise)}</TableCell>
                    <TableCell>
                      {order.status === "cancelled"
                        ? "—"
                        : formatRupees(order.commission_paise)}
                    </TableCell>
                    <TableCell>{orderStatuses[order.status]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </>
  );
}
