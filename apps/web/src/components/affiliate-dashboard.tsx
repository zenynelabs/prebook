"use client";

import {
  Check,
  Copy,
  Globe,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AFFILIATE_TOKEN_KEY,
  type AffiliateDashboard as Dashboard,
  affiliateLink,
  affiliatePath,
  affiliateStatuses,
  formatRupees,
  imageUrl,
  orderStatuses,
  shopPath,
  shopSlug,
  shopsPath,
  themeStyle,
} from "@/lib/shops";
import { mobileInput } from "@/lib/registration";
import { eventsApi } from "@/lib/site";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
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

type View = "shops" | "earnings";

const views: [View, string, typeof Store][] = [
  ["shops", "My shops", Store],
  ["earnings", "Earnings", Wallet],
];

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

function SidebarNav({
  view,
  onView,
  onSignOut,
}: {
  view: View;
  onView: (view: View) => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <nav className="admin-nav" aria-label="Dashboard">
        <p>Affiliate</p>
        {views.map(([value, label, Icon]) => (
          <Button
            key={value}
            variant="ghost"
            type="button"
            aria-current={view === value ? "page" : undefined}
            onClick={() => onView(value)}
          >
            <Icon aria-hidden="true" />
            {label}
          </Button>
        ))}
        <p>Website</p>
        <Button variant="ghost" asChild>
          <Link href={shopsPath}>
            <ShoppingBag aria-hidden="true" />
            Browse shops
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">
            <Globe aria-hidden="true" />
            Homepage
          </Link>
        </Button>
      </nav>
      <Button
        variant="ghost"
        type="button"
        className="admin-signout"
        onClick={onSignOut}
      >
        <LogOut aria-hidden="true" />
        Sign out
      </Button>
    </>
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
function CopyLink({ link, label }: { link: string; label?: string }) {
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
      <Button
        variant="outline"
        size={label ? "icon" : "sm"}
        type="button"
        className={label ? "affiliate-copy-icon" : undefined}
        onClick={copy}
      >
        {state === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        {label ? (
          <span className="sr-only">
            {state === "copied" ? "Copied" : label}
          </span>
        ) : state === "copied" ? (
          "Copied"
        ) : (
          "Copy link"
        )}
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

const PREVIEW = 6;

type DashboardShop = Dashboard["shops"][number];

function ShopCard({ shop, code }: { shop: DashboardShop; code: string }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const link = (id?: number) =>
    affiliateLink(location.origin, shop.slug, code, id);
  const wanted = query.trim().toLowerCase();
  const matches = wanted
    ? shop.products.filter((product) =>
        product.name.toLowerCase().includes(wanted),
      )
    : shop.products;
  const shown = all || wanted ? matches : matches.slice(0, PREVIEW);

  return (
    <Card
      className="affiliate-shop gap-0 py-0 shadow-none"
      style={themeStyle(shop.theme)}
    >
      <div className="affiliate-shop-head">
        {shop.logo ? (
          <img className="store-logo" src={imageUrl(shop.logo)} alt="" width={48} height={48} />
        ) : (
          <span className="store-logo" aria-hidden="true">
            {shop.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h2>
            <Link href={shopPath(shop.slug)}>{shop.name}</Link>
          </h2>
          <p>
            {shop.commission_percent}% commission · {shop.orders}{" "}
            {shop.orders === 1 ? "order" : "orders"} ·{" "}
            {formatRupees(shop.earned_paise)} earned ·{" "}
            {formatRupees(shop.pending_paise)} pending
          </p>
        </div>
        <span className="affiliate-status" data-status={shop.status}>
          {affiliateStatuses[shop.status]}
        </span>
      </div>

      {shop.status !== "approved" ? (
        <p className="affiliate-hint affiliate-shop-note">
          {shop.status === "pending"
            ? "The shop owner hasn’t approved you yet. Your links appear here once they do."
            : "The shop owner didn’t approve your application."}
        </p>
      ) : (
        <>
          <div className="affiliate-shop-link">
            <span>Shop link</span>
            <code>{link()}</code>
            <CopyLink link={link()} />
          </div>

          {shop.products.length > 0 && (
            <div className="affiliate-products-block">
              <div className="affiliate-products-head">
                <h3>
                  Product links <span>{shop.products.length}</span>
                </h3>
                {shop.products.length > PREVIEW && (
                  <label className="affiliate-search">
                    <Search aria-hidden="true" />
                    <span className="sr-only">Search {shop.name} products</span>
                    <Input
                      type="search"
                      placeholder="Search products"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                )}
              </div>
              {shown.length === 0 ? (
                <p className="affiliate-hint">No products match “{query.trim()}”.</p>
              ) : (
                <ul className="affiliate-products">
                  {shown.map((product) => (
                    <li key={product.id} data-stock={product.in_stock ? undefined : "out"}>
                      <span className="affiliate-thumb">
                        {product.image ? (
                          <img src={imageUrl(product.image)} alt="" width={48} height={48} loading="lazy" />
                        ) : (
                          <span aria-hidden="true">
                            {product.name.trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="affiliate-product-copy">
                        <strong>{product.name}</strong>
                        <span>
                          {product.in_stock
                            ? [product.size, formatRupees(product.price_paise)]
                                .filter(Boolean)
                                .join(" · ")
                            : "Out of stock"}
                        </span>
                      </span>
                      {product.in_stock && (
                        <CopyLink
                          link={link(product.id)}
                          label={`Copy link for ${product.name}`}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!wanted && matches.length > PREVIEW && (
                <Button
                  type="button"
                  variant="ghost"
                  className="affiliate-more"
                  onClick={() => setAll(!all)}
                >
                  {all ? "Show fewer" : `Show all ${matches.length} products`}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function AffiliateDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [apply, setApply] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("shops");
  const [menuOpen, setMenuOpen] = useState(false);

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
                {...mobileInput}
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
  const nav = (
    <SidebarNav
      view={view}
      onView={(next) => {
        setView(next);
        setMenuOpen(false);
      }}
      onSignOut={logout}
    />
  );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        {nav}
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <Brand />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu size={24} aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="admin-sidebar admin-menu-sheet"
              closeLabel="Close menu"
            >
              <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
              <SheetDescription className="sr-only">
                Affiliate sections and links
              </SheetDescription>
              <Brand />
              {nav}
            </SheetContent>
          </Sheet>
        </header>

        <main className="admin-content affiliate-content">
          <div className="admin-head">
            <div>
              <p className="admin-eyebrow">{data.affiliate.name}</p>
              <h1>{view === "shops" ? "My shops" : "Earnings"}</h1>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="admin-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {view === "shops" ? (
            data.shops.length === 0 ? (
              <p className="affiliate-hint">
                Open a shop’s page and use “Become an affiliate” to apply.{" "}
                <Link className="text-(--accent-text) font-medium" href={shopsPath}>
                  Browse shops
                </Link>
              </p>
            ) : (
              <div className="affiliate-shops">
                {data.shops.map((shop) => (
                  <ShopCard key={shop.slug} shop={shop} code={data.affiliate.code} />
                ))}
              </div>
            )
          ) : (
            <>
              <Card className="admin-stats-panel gap-0 py-0 shadow-none">
                <dl className="admin-stats">
                  {[
                    ["Earned", formatRupees(sum.earned_paise)],
                    ["Pending", formatRupees(sum.pending_paise)],
                    ["Orders", sum.orders],
                    ["Approved shops", data.shops.filter((shop) => shop.status === "approved").length],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
