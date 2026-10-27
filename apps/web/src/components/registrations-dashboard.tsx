"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Helicopter,
  Link2,
  LogOut,
  Menu,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { eventsApi, helicopterRide, site } from "@/lib/site";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
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
  ref: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Affiliate = { code: string; name: string; created_at: string };

type View = "registrations" | "affiliates";

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
const dayFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});
const timeFormat = new Intl.DateTimeFormat("en-IN", {
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

/** Leaderboard: most registrations first, seats break ties. */
export function rankAffiliates(affiliates: Affiliate[], rows: Registration[]) {
  return affiliates
    .map((affiliate) => ({
      ...affiliate,
      ...summarise(rows.filter((row) => row.ref === affiliate.code)),
    }))
    .sort((a, b) => b.registrations - a.registrations || b.seats - a.seats);
}

export const affiliateLink = (code: string) =>
  `${site.url}${helicopterRide.path}?ref=${encodeURIComponent(code)}`;

/** Same rule the API applies, so the form shows the code that will be saved. */
export const linkCode = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const PAGE_SIZES = [10, 25, 50];

export function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(page, 1), pages);
  const start = (current - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: current,
    pages,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + size, items.length),
    total: items.length,
  };
}

function Pagination({
  label,
  pager,
  size,
  onPage,
  onSize,
}: {
  label: string;
  pager: ReturnType<typeof paginate>;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  if (pager.total === 0) return null;
  return (
    <nav className="admin-pagination" aria-label={`${label} pages`}>
      <p aria-live="polite">
        Showing {pager.from}–{pager.to} of {pager.total}
      </p>
      <div className="pagination-controls">
        <label className="pagination-size">
          Per page
          <select
            value={size}
            onChange={(event) => onSize(Number(event.target.value))}
          >
            {PAGE_SIZES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-icon"
          disabled={pager.page <= 1}
          onClick={() => onPage(pager.page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          <span className="sr-only">Previous page</span>
        </button>
        <span className="pagination-page">
          Page {pager.page} of {pager.pages}
        </span>
        <button
          type="button"
          className="admin-icon"
          disabled={pager.page >= pager.pages}
          onClick={() => onPage(pager.page + 1)}
        >
          <ChevronRight aria-hidden="true" />
          <span className="sr-only">Next page</span>
        </button>
      </div>
    </nav>
  );
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
        <p>Helicopter ride</p>
        <button
          type="button"
          aria-current={view === "registrations" ? "page" : undefined}
          onClick={() => onView("registrations")}
        >
          <Helicopter aria-hidden="true" />
          Registrations
        </button>
        <button
          type="button"
          aria-current={view === "affiliates" ? "page" : undefined}
          onClick={() => onView("affiliates")}
        >
          <Link2 aria-hidden="true" />
          Affiliate links
        </button>
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
  onCloseAutoFocus,
}: {
  row: Registration | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
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
      <SheetContent
        className="edit-sheet"
        closeLabel="Close editor"
        onCloseAutoFocus={onCloseAutoFocus}
      >
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
                <select
                  id="edit-status"
                  name="status"
                  defaultValue={row.status}
                >
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
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="edit-cancel"
                >
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

function DeleteDialog({
  row,
  onClose,
  onDelete,
  onCloseAutoFocus,
}: {
  row: Registration | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onDelete: (row: Registration) => Promise<string | null>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setError(""), [row?.id]);

  async function confirm() {
    if (!row) return;
    setDeleting(true);
    const problem = await onDelete(row);
    setDeleting(false);
    if (problem) setError(problem);
    else onClose();
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="delete-dialog"
        role="alertdialog"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {row && (
          <>
            <DialogTitle>Delete this registration?</DialogTitle>
            <DialogDescription>
              {row.name} · {formatPhone(row.phone)} · {row.passengers}{" "}
              {row.passengers === 1 ? "seat" : "seats"} will be removed
              permanently. This can’t be undone. To keep a record, set the
              status to Cancelled instead.
            </DialogDescription>
            <p className="form-error" role="alert">
              {error}
            </p>
            <div className="delete-actions">
              <DialogClose asChild>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="edit-cancel"
                >
                  Keep it
                </Button>
              </DialogClose>
              <Button
                type="button"
                size="lg"
                className="button-danger"
                disabled={deleting}
                onClick={confirm}
              >
                <Trash2 aria-hidden="true" />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

type AffiliateAction = {
  affiliate: ReturnType<typeof rankAffiliates>[number];
  mode: "rename" | "delete";
};

function AffiliateDialog({
  action,
  onClose,
  onRename,
  onDelete,
  onCloseAutoFocus,
}: {
  action: AffiliateAction | null;
  onClose: () => void;
  onRename: (code: string, name: string) => Promise<string | null>;
  onDelete: (code: string) => Promise<string | null>;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setError(""), [action]);

  async function run(task: Promise<string | null>) {
    setBusy(true);
    const problem = await task;
    setBusy(false);
    if (problem) setError(problem);
    else onClose();
  }

  const affiliate = action?.affiliate;
  const cancel = (label: string) => (
    <DialogClose asChild>
      <Button type="button" size="lg" variant="outline" className="edit-cancel">
        {label}
      </Button>
    </DialogClose>
  );

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="delete-dialog"
        role={action?.mode === "delete" ? "alertdialog" : undefined}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {affiliate &&
          (action.mode === "rename" ? (
            <form
              className="edit-form"
              onSubmit={(event) => {
                event.preventDefault();
                const name = new FormData(event.currentTarget).get("name");
                run(onRename(affiliate.code, String(name)));
              }}
            >
              <DialogTitle>Rename affiliate</DialogTitle>
              <DialogDescription>
                The shared link stays the same: {helicopterRide.path}?ref=
                {affiliate.code}
              </DialogDescription>
              <div className="field">
                <label htmlFor="rename-affiliate">Affiliate name</label>
                <input
                  id="rename-affiliate"
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={affiliate.name}
                />
              </div>
              <p className="form-error" role="alert">
                {error}
              </p>
              <div className="delete-actions">
                {cancel("Cancel")}
                <Button type="submit" size="lg" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <DialogTitle>Delete {affiliate.name}?</DialogTitle>
              <DialogDescription>
                Their link will stop crediting anyone.{" "}
                {affiliate.registrations > 0 &&
                  `${affiliate.registrations} ${affiliate.registrations === 1 ? "registration stays" : "registrations stay"} on the list but no longer count for this affiliate. `}
                This can’t be undone.
              </DialogDescription>
              <p className="form-error" role="alert">
                {error}
              </p>
              <div className="delete-actions">
                {cancel("Keep it")}
                <Button
                  type="button"
                  size="lg"
                  className="button-danger"
                  disabled={busy}
                  onClick={() => run(onDelete(affiliate.code))}
                >
                  <Trash2 aria-hidden="true" />
                  {busy ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </>
          ))}
      </DialogContent>
    </Dialog>
  );
}

export default function RegistrationsDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<Registration[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [view, setView] = useState<View>("registrations");
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [affiliateAction, setAffiliateAction] =
    useState<AffiliateAction | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState<Registration | null>(null);
  // Panels open from state, not a Radix trigger, so hand focus back by hand.
  const opener = useRef<HTMLElement | null>(null);
  const returnFocus = (event: Event) => {
    event.preventDefault();
    const target = opener.current?.isConnected
      ? opener.current
      : document.querySelector<HTMLElement>(".admin-table");
    target?.focus();
  };
  const [pageSize, setPageSize] = useState(25);
  const [registrationPage, setRegistrationPage] = useState(1);
  const [affiliatePage, setAffiliatePage] = useState(1);
  const [affiliateDraft, setAffiliateDraft] = useState({
    name: "",
    code: "",
    edited: false,
  });
  const [filters, setFilters] = useState<Filters>({
    query: "",
    status: "all",
    payment: "all",
  });

  const signOut = useCallback((message = "") => {
    storage((store) => store.removeItem(TOKEN_KEY));
    setToken(null);
    setRows([]);
    setAffiliates([]);
    setEditing(null);
    setDeleting(null);
    setError(message);
  }, []);

  const load = useCallback(
    async (value: string) => {
      setLoading(true);
      setError("");
      try {
        const init = {
          headers: { Authorization: `Bearer ${value}` },
          cache: "no-store" as const,
        };
        const [response, affiliateResponse] = await Promise.all([
          fetch(`${eventsApi}/registrations`, init),
          fetch(`${eventsApi}/affiliates`, init),
        ]);
        if (response.status === 401 || response.status === 400)
          return signOut("That access token isn’t valid.");
        if (!response.ok || !affiliateResponse.ok) throw new Error();
        const body: { registrations: Registration[] } = await response.json();
        const linked: { affiliates: Affiliate[] } =
          await affiliateResponse.json();
        storage((store) => store.setItem(TOKEN_KEY, value));
        setToken(value);
        setRows(body.registrations);
        setAffiliates(linked.affiliates);
      } catch {
        setError(
          "Couldn’t load registrations. Check your connection and retry.",
        );
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

  const remove = useCallback(
    async (row: Registration) => {
      try {
        const response = await fetch(`${eventsApi}/registrations/${row.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          signOut("Your session has ended. Enter the access token again.");
          return null;
        }
        // 404 means someone already deleted it, so drop it here too.
        if (!response.ok && response.status !== 404) {
          const body = await response.json().catch(() => ({}));
          return body.error ?? "Couldn’t delete the registration.";
        }
        setRows((current) => current.filter((item) => item.id !== row.id));
        return null;
      } catch {
        return "Couldn’t reach the server. Check your connection and retry.";
      }
    },
    [token, signOut],
  );

  async function quickSave(next: Registration) {
    const problem = await save(next);
    if (problem) setError(problem);
  }

  async function createAffiliate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setCreating(true);
    setAffiliateError("");
    try {
      const response = await fetch(`${eventsApi}/affiliates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (response.status === 401)
        return signOut("Your session has ended. Enter the access token again.");
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        return setAffiliateError(body.error ?? "Couldn’t create the link.");
      setAffiliates((current) => [...current, body.affiliate]);
      setAffiliateDraft({ name: "", code: "", edited: false });
    } catch {
      setAffiliateError(
        "Couldn’t reach the server. Check your connection and retry.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function affiliateRequest(code: string, init: RequestInit) {
    const response = await fetch(
      `${eventsApi}/affiliates/${encodeURIComponent(code)}`,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (response.status === 401)
      signOut("Your session has ended. Enter the access token again.");
    return response;
  }

  async function renameAffiliate(code: string, name: string) {
    try {
      const response = await affiliateRequest(code, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      if (response.status === 401) return null;
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return body.error ?? "Couldn’t rename the affiliate.";
      setAffiliates((current) =>
        current.map((item) => (item.code === code ? body.affiliate : item)),
      );
      return null;
    } catch {
      return "Couldn’t reach the server. Check your connection and retry.";
    }
  }

  async function deleteAffiliate(code: string) {
    try {
      const response = await affiliateRequest(code, { method: "DELETE" });
      if (response.status === 401) return null;
      // 404 means someone already deleted it, so drop it here too.
      if (!response.ok && response.status !== 404) {
        const body = await response.json().catch(() => ({}));
        return body.error ?? "Couldn’t delete the affiliate.";
      }
      setAffiliates((current) => current.filter((item) => item.code !== code));
      setRows((current) =>
        current.map((row) => (row.ref === code ? { ...row, ref: null } : row)),
      );
      return null;
    } catch {
      return "Couldn’t reach the server. Check your connection and retry.";
    }
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(affiliateLink(code));
      setCopied(code);
    } catch {
      setAffiliateError("Couldn’t copy. Select the link and copy it instead.");
    }
  }

  function filter(change: Partial<Filters>) {
    setFilters({ ...filters, ...change });
    setRegistrationPage(1);
  }

  function turnPage(setPage: (page: number) => void, page: number) {
    setPage(page);
    requestAnimationFrame(() => {
      const table = document.querySelector<HTMLElement>(".admin-table");
      if (table && table.getBoundingClientRect().top < 0)
        table.scrollIntoView({ block: "start" });
    });
  }

  function resize(size: number) {
    setPageSize(size);
    setRegistrationPage(1);
    setAffiliatePage(1);
  }

  function showView(next: View) {
    setView(next);
    setMenuOpen(false);
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
  const affiliateNames = new Map(affiliates.map((a) => [a.code, a.name]));
  const ranked = rankAffiliates(affiliates, rows);
  const direct = rows.filter((row) => !row.ref).length;
  const registrationPager = paginate(visible, registrationPage, pageSize);
  const affiliatePager = paginate(ranked, affiliatePage, pageSize);
  const nav = (
    <SidebarNav view={view} onView={showView} onSignOut={() => signOut()} />
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
                Events and website links
              </SheetDescription>
              <Brand />
              {nav}
            </SheetContent>
          </Sheet>
        </header>

        <main className="admin-content">
          <div className="admin-head">
            <div>
              <p className="admin-eyebrow">Helicopter ride · Tirunelveli</p>
              <h1>
                {view === "registrations" ? "Registrations" : "Affiliate links"}
              </h1>
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

          {view === "affiliates" ? (
            <>
              <form className="affiliate-form" onSubmit={createAffiliate}>
                <div className="field">
                  <label htmlFor="affiliate-name">Affiliate name</label>
                  <input
                    id="affiliate-name"
                    name="name"
                    value={affiliateDraft.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setAffiliateDraft((draft) => ({
                        ...draft,
                        name,
                        code: draft.edited ? draft.code : linkCode(name),
                      }));
                    }}
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="Selvi Travels"
                  />
                </div>
                <div className="field">
                  <label htmlFor="affiliate-code">
                    Link code <span>(filled from the name)</span>
                  </label>
                  <input
                    id="affiliate-code"
                    name="code"
                    value={affiliateDraft.code}
                    onChange={(event) => {
                      const code = event.target.value;
                      // Clearing the field hands it back to the name.
                      setAffiliateDraft((draft) => ({
                        ...draft,
                        code,
                        edited: code !== "",
                      }));
                    }}
                    maxLength={32}
                    pattern="[A-Za-z0-9 _\-]*"
                    placeholder="selvi-travels"
                  />
                </div>
                <Button type="submit" size="lg" disabled={creating}>
                  {creating ? "Creating…" : "Create link"}
                </Button>
              </form>
              <p className="form-error" role="alert">
                {affiliateError || error}
              </p>
              <div
                className="admin-table affiliate-table"
                role="region"
                tabIndex={0}
                aria-label="Affiliate leaderboard"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Affiliate</th>
                      <th scope="col">Registrations</th>
                      <th scope="col">Seats</th>
                      <th scope="col">Confirmed</th>
                      <th scope="col">Paid</th>
                      <th scope="col">
                        <span className="sr-only">Copy link</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiliatePager.items.map((affiliate, index) => (
                      <tr key={affiliate.code}>
                        <td className="cell-rank">
                          {affiliatePager.from + index}
                        </td>
                        <td className="cell-name">
                          <span className="admin-name">{affiliate.name}</span>
                          <span className="admin-sub">
                            {helicopterRide.path}?ref={affiliate.code}
                          </span>
                        </td>
                        <td data-label="Registrations">
                          {affiliate.registrations}
                        </td>
                        <td data-label="Seats">{affiliate.seats}</td>
                        <td data-label="Confirmed">{affiliate.confirmed}</td>
                        <td data-label="Paid">{affiliate.paid}</td>
                        <td className="cell-copy">
                          <div className="affiliate-actions">
                            <Button
                              variant="outline"
                              className="admin-refresh"
                              onClick={() => copyLink(affiliate.code)}
                              aria-label={`Copy link for ${affiliate.name}`}
                            >
                              {copied === affiliate.code ? (
                                <Check aria-hidden="true" />
                              ) : (
                                <Copy aria-hidden="true" />
                              )}
                              {copied === affiliate.code
                                ? "Copied"
                                : "Copy link"}
                            </Button>
                            <button
                              type="button"
                              className="admin-icon"
                              onClick={(event) => {
                                opener.current = event.currentTarget;
                                setAffiliateAction({ affiliate, mode: "rename" });
                              }}
                            >
                              <Pencil aria-hidden="true" />
                              <span className="sr-only">
                                Rename {affiliate.name}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="admin-icon admin-delete"
                              onClick={(event) => {
                                opener.current = event.currentTarget;
                                setAffiliateAction({ affiliate, mode: "delete" });
                              }}
                            >
                              <Trash2 aria-hidden="true" />
                              <span className="sr-only">
                                Delete {affiliate.name}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ranked.length === 0 && (
                  <p className="admin-empty">
                    No affiliate links yet. Create one above and share it.
                  </p>
                )}
              </div>
              <Pagination
                label="Affiliate links"
                pager={affiliatePager}
                size={pageSize}
                onPage={(page) => turnPage(setAffiliatePage, page)}
                onSize={resize}
              />
              <p className="admin-note">
                {direct} {direct === 1 ? "registration" : "registrations"} came
                without an affiliate link.
              </p>
            </>
          ) : (
            <>
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
                <div className="admin-filters">
                  <div className="field">
                    <label htmlFor="status-filter" className="sr-only">
                      Filter by status
                    </label>
                    <select
                      id="status-filter"
                      value={filters.status}
                      onChange={(event) =>
                        filter({
                          status: event.target.value as Filters["status"],
                        })
                      }
                    >
                      {[["all", "All statuses"] as const, ...statuses].map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label} (
                            {value === "all"
                              ? rows.length
                              : rows.filter((row) => row.status === value)
                                  .length}
                            )
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="payment-filter" className="sr-only">
                      Filter by payment
                    </label>
                    <select
                      id="payment-filter"
                      value={filters.payment}
                      onChange={(event) =>
                        filter({
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
                        filter({ query: event.target.value })
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
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrationPager.items.map((row) => {
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
                            <a href={`tel:${row.phone}`}>
                              {formatPhone(row.phone)}
                            </a>
                          </td>
                          <td className="admin-address">{row.address}</td>
                          <td className="cell-seats">
                            {row.passengers}
                            <span className="seats-unit">
                              {row.passengers === 1 ? " seat" : " seats"}
                            </span>
                          </td>
                          <td className="cell-status">
                            <span
                              className="status-select"
                              data-status={row.status}
                            >
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
                            <span className="admin-day">
                              {dayFormat.format(new Date(row.created_at))}
                            </span>
                            <span className="admin-sub">
                              {timeFormat.format(new Date(row.created_at))}
                              {row.ref &&
                                ` · via ${affiliateNames.get(row.ref) ?? row.ref}`}
                            </span>
                          </td>
                          <td className="cell-actions">
                            <button
                              type="button"
                              className="admin-icon"
                              onClick={(event) => {
                                opener.current = event.currentTarget;
                                setEditing(row);
                              }}
                            >
                              <Pencil aria-hidden="true" />
                              <span className="sr-only">Edit {row.name}</span>
                            </button>
                            <button
                              type="button"
                              className="admin-icon admin-delete"
                              onClick={(event) => {
                                opener.current = event.currentTarget;
                                setDeleting(row);
                              }}
                            >
                              <Trash2 aria-hidden="true" />
                              <span className="sr-only">Delete {row.name}</span>
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
              <Pagination
                label="Registrations"
                pager={registrationPager}
                size={pageSize}
                onPage={(page) => turnPage(setRegistrationPage, page)}
                onSize={resize}
              />
            </>
          )}
        </main>
      </div>

      <EditPanel
        row={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        onCloseAutoFocus={returnFocus}
      />
      <AffiliateDialog
        action={affiliateAction}
        onClose={() => setAffiliateAction(null)}
        onRename={renameAffiliate}
        onDelete={deleteAffiliate}
        onCloseAutoFocus={returnFocus}
      />
      <DeleteDialog
        row={deleting}
        onClose={() => setDeleting(null)}
        onDelete={remove}
        onCloseAutoFocus={returnFocus}
      />
    </div>
  );
}
