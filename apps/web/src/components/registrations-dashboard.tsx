"use client";

import {
  Check,
  ExternalLink,
  Globe,
  Helicopter,
  LogOut,
  Menu,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { eventsApi, helicopterRide } from "@/lib/site";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export type Status = "new" | "contacted" | "confirmed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid";

export type Registration = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  passengers: number;
  status: Status;
  payment_status: PaymentStatus;
  notes: string;
  created_at: string;
  updated_at: string | null;
};

export type Filters = {
  query: string;
  status: Status | "all";
  payment: PaymentStatus | "all";
};

const statuses: [Status, string][] = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["confirmed", "Confirmed"],
  ["cancelled", "Cancelled"],
];

const TOKEN_KEY = "prebook-admin-token";
const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function filterRegistrations(rows: Registration[], filters: Filters) {
  const needle = filters.query.trim().toLowerCase();
  const digits = /^[\d\s+-]+$/.test(needle) ? needle.replace(/\D/g, "") : "";
  return rows.filter(
    (row) =>
      (filters.status === "all" || row.status === filters.status) &&
      (filters.payment === "all" || row.payment_status === filters.payment) &&
      (!needle ||
        `${row.name} ${row.email ?? ""} ${row.address} ${row.notes}`
          .toLowerCase()
          .includes(needle) ||
        (digits.length > 0 && row.phone.includes(digits))),
  );
}

export function summarise(rows: Registration[]) {
  const active = rows.filter((row) => row.status !== "cancelled");
  return {
    registrations: rows.length,
    seats: active.reduce((sum, row) => sum + row.passengers, 0),
    confirmed: rows.filter((row) => row.status === "confirmed").length,
    paid: active.filter((row) => row.payment_status === "paid").length,
  };
}

function storage(action: (store: Storage) => string | null | void) {
  try {
    return action(sessionStorage) ?? null;
  } catch {
    return null;
  }
}

const formatPhone = (phone: string) => `${phone.slice(0, 5)} ${phone.slice(5)}`;

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
        <span>Admin</span>
      </span>
    </Link>
  );
}

function SidebarNav({ onSignOut }: { onSignOut: () => void }) {
  return (
    <>
      <nav className="admin-nav" aria-label="Dashboard">
        <p>Events</p>
        <a href="/admin/registrations" aria-current="page">
          <Helicopter aria-hidden="true" />
          Helicopter ride
        </a>
        <p>Website</p>
        <a href={helicopterRide.path} target="_blank" rel="noopener">
          <ExternalLink aria-hidden="true" />
          Event page
        </a>
        <Link href="/">
          <Globe aria-hidden="true" />
          Homepage
        </Link>
      </nav>
      <button type="button" className="admin-signout" onClick={onSignOut}>
        <LogOut aria-hidden="true" />
        Sign out
      </button>
    </>
  );
}

function EditPanel({
  row,
  onClose,
  onSave,
}: {
  row: Registration | null;
  onClose: () => void;
  onSave: (next: Registration) => Promise<string | null>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setError(""), [row?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    const problem = await onSave({
      ...row,
      ...fields,
      passengers: Number(fields.passengers),
    } as Registration);
    setSaving(false);
    if (problem) setError(problem);
    else onClose();
  }

  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="edit-sheet" closeLabel="Close editor">
        {row && (
          <form key={row.id} className="edit-form" onSubmit={submit}>
            <SheetHeader>
              <SheetTitle>{row.name}</SheetTitle>
              <SheetDescription>
                Registered {dateFormat.format(new Date(row.created_at))}
                {row.updated_at &&
                  ` · Updated ${dateFormat.format(new Date(row.updated_at))}`}
              </SheetDescription>
            </SheetHeader>
            <div className="edit-pair">
              <div className="field">
                <label htmlFor="edit-status">Status</label>
                <select id="edit-status" name="status" defaultValue={row.status}>
                  {statuses.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-payment">Payment</label>
                <select
                  id="edit-payment"
                  name="payment_status"
                  defaultValue={row.payment_status}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="edit-notes">Notes</label>
              <textarea
                id="edit-notes"
                name="notes"
                rows={3}
                maxLength={1000}
                defaultValue={row.notes}
                placeholder="Call outcome, payment reference, time slot…"
              />
            </div>
            <div className="field">
              <label htmlFor="edit-name">Full name</label>
              <input
                id="edit-name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                defaultValue={row.name}
              />
            </div>
            <div className="edit-pair">
              <div className="field">
                <label htmlFor="edit-phone">Mobile</label>
                <input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  required
                  pattern="[0-9 +\-]{10,16}"
                  defaultValue={row.phone}
                />
              </div>
              <div className="field">
                <label htmlFor="edit-passengers">Passengers</label>
                <select
                  id="edit-passengers"
                  name="passengers"
                  defaultValue={row.passengers}
                >
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="edit-email">
                Email <span>(optional)</span>
              </label>
              <input
                id="edit-email"
                name="email"
                type="email"
                maxLength={120}
                defaultValue={row.email ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-address">Address</label>
              <textarea
                id="edit-address"
                name="address"
                rows={3}
                required
                minLength={10}
                maxLength={300}
                defaultValue={row.address}
              />
            </div>
            <p className="form-error" role="alert">
              {error}
            </p>
            <div className="edit-actions">
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <SheetClose asChild>
                <Button type="button" size="lg" variant="outline" className="edit-cancel">
                  Cancel
                </Button>
              </SheetClose>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function RegistrationsDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<Registration[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [filters, setFilters] = useState<Filters>({
    query: "",
    status: "all",
    payment: "all",
  });

  const signOut = useCallback((message = "") => {
    storage((store) => store.removeItem(TOKEN_KEY));
    setToken(null);
    setRows([]);
    setEditing(null);
    setError(message);
  }, []);

  const load = useCallback(
    async (value: string) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${eventsApi}/registrations`, {
          headers: { Authorization: `Bearer ${value}` },
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 400)
          return signOut("That access token isn’t valid.");
        if (!response.ok) throw new Error();
        const body: { registrations: Registration[] } = await response.json();
        storage((store) => store.setItem(TOKEN_KEY, value));
        setToken(value);
        setRows(body.registrations);
      } catch {
        setError("Couldn’t load registrations. Check your connection and retry.");
      } finally {
        setLoading(false);
      }
    },
    [signOut],
  );

  const save = useCallback(
    async (next: Registration) => {
      setSavingId(next.id);
      setError("");
      try {
        const response = await fetch(`${eventsApi}/registrations/${next.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(next),
        });
        if (response.status === 401) {
          signOut("Your session has ended. Enter the access token again.");
          return null;
        }
        const body = await response.json().catch(() => ({}));
        if (!response.ok) return body.error ?? "Couldn’t save the change.";
        setRows((current) =>
          current.map((row) => (row.id === next.id ? body.registration : row)),
        );
        return null;
      } catch {
        return "Couldn’t reach the server. Check your connection and retry.";
      } finally {
        setSavingId(null);
      }
    },
    [token, signOut],
  );

  async function quickSave(next: Registration) {
    const problem = await save(next);
    if (problem) setError(problem);
  }

  useEffect(() => {
    const saved = storage((store) => store.getItem(TOKEN_KEY));
    if (saved) load(saved);
  }, [load]);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    load(String(new FormData(event.currentTarget).get("token")).trim());
  }

  if (!token)
    return (
      <main className="admin-gate">
        <form className="register-card admin-card" onSubmit={signIn}>
          <Brand />
          <h1>Registrations</h1>
          <div className="field">
            <label htmlFor="token">Access token</label>
            <input
              id="token"
              name="token"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <p className="form-error" role="alert">
            {error}
          </p>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Opening…" : "Open dashboard"}
          </Button>
        </form>
      </main>
    );

  const visible = filterRegistrations(rows, filters);
  const totals = summarise(rows);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <SidebarNav onSignOut={() => signOut()} />
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <Brand />
          <Sheet>
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
                Events and website links
              </SheetDescription>
              <Brand />
              <SidebarNav onSignOut={() => signOut()} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="admin-content">
          <div className="admin-head">
            <div>
              <p className="admin-eyebrow">Helicopter ride · Tirunelveli</p>
              <h1>Registrations</h1>
            </div>
            <Button
              variant="outline"
              className="admin-refresh"
              onClick={() => load(token)}
              disabled={loading}
            >
              <RefreshCw aria-hidden="true" />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          <dl className="admin-stats">
            {[
              ["Registrations", totals.registrations],
              ["Seats requested", totals.seats],
              ["Confirmed", totals.confirmed],
              ["Paid", totals.paid],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="admin-toolbar">
            <div
              className="admin-segments"
              role="group"
              aria-label="Filter by status"
            >
              {[["all", "All"] as const, ...statuses].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filters.status === value}
                  onClick={() => setFilters({ ...filters, status: value })}
                >
                  {label}
                  <span>
                    {value === "all"
                      ? rows.length
                      : rows.filter((row) => row.status === value).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="admin-filters">
              <div className="field">
                <label htmlFor="payment-filter" className="sr-only">
                  Filter by payment
                </label>
                <select
                  id="payment-filter"
                  value={filters.payment}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      payment: event.target.value as Filters["payment"],
                    })
                  }
                >
                  <option value="all">All payments</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <div className="field admin-search">
                <label htmlFor="search" className="sr-only">
                  Search registrations
                </label>
                <Search size={18} aria-hidden="true" />
                <input
                  id="search"
                  type="search"
                  placeholder="Search name, mobile, address or notes"
                  value={filters.query}
                  onChange={(event) =>
                    setFilters({ ...filters, query: event.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <p className="form-error" role="alert">
            {error}
          </p>

          <div
            className="admin-table"
            role="region"
            tabIndex={0}
            aria-label="Registrations table"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">Address</th>
                  <th scope="col">Seats</th>
                  <th scope="col">Status</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Registered</th>
                  <th scope="col">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const saving = savingId === row.id;
                  const paid = row.payment_status === "paid";
                  return (
                    <tr key={row.id} data-status={row.status}>
                      <td className="cell-name">
                        <span className="admin-name">{row.name}</span>
                        {row.email && (
                          <span className="admin-sub">{row.email}</span>
                        )}
                      </td>
                      <td className="cell-phone">
                        <a href={`tel:${row.phone}`}>{formatPhone(row.phone)}</a>
                      </td>
                      <td className="admin-address">{row.address}</td>
                      <td className="cell-seats">{row.passengers}</td>
                      <td className="cell-status">
                        <span className="status-select" data-status={row.status}>
                          <select
                            value={row.status}
                            disabled={saving}
                            aria-label={`Status for ${row.name}`}
                            onChange={(event) =>
                              quickSave({
                                ...row,
                                status: event.target.value as Status,
                              })
                            }
                          >
                            {statuses.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </span>
                      </td>
                      <td className="cell-payment">
                        <button
                          type="button"
                          className="pay-toggle"
                          aria-pressed={paid}
                          aria-label={`Paid: ${row.name}`}
                          disabled={saving}
                          onClick={() =>
                            quickSave({
                              ...row,
                              payment_status: paid ? "unpaid" : "paid",
                            })
                          }
                        >
                          {paid && <Check aria-hidden="true" />}
                          {paid ? "Paid" : "Unpaid"}
                        </button>
                      </td>
                      <td className="cell-date">
                        {dateFormat.format(new Date(row.created_at))}
                      </td>
                      <td className="cell-edit">
                        <button
                          type="button"
                          className="admin-edit"
                          onClick={() => setEditing(row)}
                        >
                          <Pencil aria-hidden="true" />
                          <span className="sr-only">Edit {row.name}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 && (
              <p className="admin-empty">
                {rows.length === 0
                  ? "No registrations yet."
                  : "No registrations match these filters."}
              </p>
            )}
          </div>
        </main>
      </div>

      <EditPanel row={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}
