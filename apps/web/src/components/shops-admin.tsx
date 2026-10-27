"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { type AdminShop, shopPath, shopSlug } from "@/lib/shops";
import { mobileInput } from "@/lib/registration";
import { eventsApi, site } from "@/lib/site";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const NETWORK_ERROR =
  "Couldn’t reach the server. Check your connection and retry.";
const dayFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

// No 0/O, 1/l/I: an owner reads this off a message or a phone call.
const PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(
    bytes,
    (byte) => PASSWORD_CHARS[byte % PASSWORD_CHARS.length],
  ).join("");
}

export const shopUrl = (slug: string) => `${site.url}${shopPath(slug)}`;

type ShopLogin = { name: string; slug: string; owner_phone: string };

export const loginDetails = (shop: ShopLogin, password: string) =>
  [
    `${shop.name} — PreBooking shop`,
    `Login: ${site.url}/shop-admin`,
    `Shop link name: ${shop.slug}`,
    `Password: ${password}`,
    `Shop link: ${shopUrl(shop.slug)}`,
  ].join("\n");

// Owner mobiles are validated as 10-digit Indian numbers, hence the 91.
export const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;

const formatPhone = (phone: string) => `${phone.slice(0, 5)} ${phone.slice(5)}`;

/** Login details; with a password they can be copied or sent to the owner. */
function Credentials({
  shop,
  password,
}: {
  shop: ShopLogin;
  password: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(loginDetails(shop, password));
      setCopied(true);
    } catch {
      setError("Couldn’t copy. Select the details and copy them instead.");
    }
  }

  return (
    <>
      <dl className="shops-admin-created">
        <div>
          <dt>Login</dt>
          <dd>{site.url}/shop-admin</dd>
        </div>
        <div>
          <dt>Shop link name</dt>
          <dd>{shop.slug}</dd>
        </div>
        <div>
          <dt>Password</dt>
          {password ? (
            <dd>{password}</dd>
          ) : (
            <dd className="shops-admin-muted">Set when you invite the owner</dd>
          )}
        </div>
        <div>
          <dt>Shop link</dt>
          <dd>{shopUrl(shop.slug)}</dd>
        </div>
      </dl>
      <FieldError>{error}</FieldError>
      {password && (
        <div className="delete-actions">
          <Button
            variant="outline"
            size="lg"
            className="edit-cancel"
            type="button"
            onClick={copy}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy details"}
          </Button>
          <Button asChild size="lg">
            <a
              href={whatsappLink(shop.owner_phone, loginDetails(shop, password))}
              target="_blank"
              rel="noopener"
            >
              <MessageCircle aria-hidden="true" />
              WhatsApp owner
            </a>
          </Button>
        </div>
      )}
    </>
  );
}

function PasswordField({
  id,
  label,
  value,
  required,
  onChange,
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field className="field">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="shops-admin-password">
        <Input
          id={id}
          name="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required={required}
          minLength={8}
          maxLength={72}
        />
        <Button
          type="button"
          variant="outline"
          className="admin-refresh"
          onClick={() => onChange(generatePassword())}
        >
          Generate
        </Button>
      </div>
    </Field>
  );
}

type Save = (shop: AdminShop, password?: string) => Promise<string | null>;

function EditPanel({
  row,
  onClose,
  onSave,
  onCloseAutoFocus,
}: {
  row: AdminShop | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onSave: Save;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    setError("");
    setPassword("");
    setName(row?.name ?? "");
    setSlug(row?.slug ?? "");
  }, [row?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    const problem = await onSave(
      {
        ...row,
        name: String(fields.name),
        slug: String(fields.slug),
        owner_name: String(fields.owner_name),
        owner_phone: String(fields.owner_phone),
        active: fields.active === "yes",
      },
      password.trim(),
    );
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
              <SheetDescription>{shopPath(row.slug)}</SheetDescription>
            </SheetHeader>
            <Field className="field">
              <FieldLabel htmlFor="edit-shop-name">Shop name</FieldLabel>
              <Input
                id="edit-shop-name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => {
                  const next = event.target.value;
                  // The link keeps following the name until it's set by hand.
                  if (slug === shopSlug(name)) setSlug(shopSlug(next));
                  setName(next);
                }}
              />
            </Field>
            <Field className="field">
              <FieldLabel htmlFor="edit-shop-slug">Link</FieldLabel>
              <div className="shops-admin-password">
                <Input
                  id="edit-shop-slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  required
                  minLength={2}
                  maxLength={40}
                  pattern="[A-Za-z0-9 _\-]*"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="admin-refresh"
                  disabled={slug === shopSlug(name)}
                  onClick={() => setSlug(shopSlug(name))}
                >
                  Match name
                </Button>
              </div>
              {shopSlug(slug) !== row.slug && (
                <FieldDescription>
                  {shopPath(row.slug)} stops working, and the owner signs in
                  with the new link name.
                </FieldDescription>
              )}
            </Field>
            <Field className="field">
              <FieldLabel htmlFor="edit-owner-name">Owner name</FieldLabel>
              <Input
                id="edit-owner-name"
                name="owner_name"
                required
                minLength={2}
                maxLength={80}
                defaultValue={row.owner_name}
              />
            </Field>
            <div className="edit-pair">
              <Field className="field">
                <FieldLabel htmlFor="edit-owner-phone">Owner mobile</FieldLabel>
                <Input
                  id="edit-owner-phone"
                  name="owner_phone"
                  {...mobileInput}
                  required
                  defaultValue={row.owner_phone}
                />
              </Field>
              <Field className="field">
                <FieldLabel htmlFor="edit-active">Storefront</FieldLabel>
                <NativeSelect
                  id="edit-active"
                  name="active"
                  defaultValue={row.active ? "yes" : "no"}
                >
                  <NativeSelectOption value="yes">Active</NativeSelectOption>
                  <NativeSelectOption value="no">Inactive</NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>
            <PasswordField
              id="edit-password"
              label={
                <>
                  New password <span>(blank keeps the current one)</span>
                </>
              }
              value={password}
              onChange={setPassword}
            />
            <FieldError>{error}</FieldError>
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

function ViewDialog({
  row,
  onClose,
  onSave,
  onCloseAutoFocus,
}: {
  row: AdminShop | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onSave: Save;
}) {
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    setError("");
    setPassword(null);
  }, [row?.id]);

  async function invite() {
    if (!row) return;
    const next = generatePassword();
    setInviting(true);
    const problem = await onSave(row, next);
    setInviting(false);
    if (problem) setError(problem);
    else setPassword(next);
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="delete-dialog create-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {row && (
          <>
            <DialogTitle>{row.name}</DialogTitle>
            <DialogDescription>
              {row.owner_name} · {formatPhone(row.owner_phone)} ·{" "}
              {row.active ? "Active" : "Inactive"} · {row.products}{" "}
              {row.products === 1 ? "product" : "products"}
            </DialogDescription>
            <Credentials key={password} shop={row} password={password} />
            {password ? (
              <DialogClose asChild>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="edit-cancel"
                >
                  Done
                </Button>
              </DialogClose>
            ) : (
              <>
                <p className="shops-admin-note">
                  Inviting sets a new password for the owner. Any password
                  they had stops working.
                </p>
                <FieldError>{error}</FieldError>
                <div className="delete-actions">
                  <DialogClose asChild>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="edit-cancel"
                    >
                      Close
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    size="lg"
                    disabled={inviting}
                    onClick={invite}
                  >
                    {inviting ? "Inviting…" : "Invite owner"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  row,
  onClose,
  onDelete,
  onCloseAutoFocus,
}: {
  row: AdminShop | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onDelete: (row: AdminShop) => Promise<string | null>;
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
            <DialogTitle>Delete {row.name}?</DialogTitle>
            <DialogDescription>
              The shop, its {row.products}{" "}
              {row.products === 1 ? "product" : "products"} and its owner login
              are removed permanently, and {shopPath(row.slug)} stops working.
              This can’t be undone. To hide it for now, set the shop to
              Inactive instead.
            </DialogDescription>
            <FieldError>{error}</FieldError>
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

type Created = { name: string; slug: string; owner_phone: string; password: string };

/** The Shops view of the admin dashboard, which owns sign-in and the shell. */
export default function ShopsPanel({
  token,
  onSessionEnd,
}: {
  token: string;
  onSessionEnd: () => void;
}) {
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [error, setError] = useState("");
  // Starts true: the first load runs on mount, so "No shops yet" never flashes.
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<AdminShop | null>(null);
  const [editing, setEditing] = useState<AdminShop | null>(null);
  const [deleting, setDeleting] = useState<AdminShop | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    slug: "",
    edited: false,
    password: "",
  });
  // Panels open from state, not a Radix trigger, so hand focus back by hand.
  const opener = useRef<HTMLElement | null>(null);
  const returnFocus = (event: Event) => {
    event.preventDefault();
    const target = opener.current?.isConnected
      ? opener.current
      : document.querySelector<HTMLElement>(".admin-table");
    target?.focus();
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${eventsApi}/admin/shops`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 400)
        return onSessionEnd();
      if (!response.ok) throw new Error();
      const body: { shops: AdminShop[] } = await response.json();
      setShops(body.shops);
    } catch {
      setError("Couldn’t load shops. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [token, onSessionEnd]);

  /** One request path for every write; the message is null on success. */
  async function request(
    path: string,
    method: "POST" | "PUT" | "DELETE",
    payload: object | undefined,
    failure: string,
  ) {
    try {
      const response = await fetch(`${eventsApi}/admin/shops${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: payload && JSON.stringify(payload),
      });
      if (response.status === 401) {
        onSessionEnd();
        return { problem: null, shop: undefined };
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok && !(method === "DELETE" && response.status === 404))
        return { problem: (body.error as string) ?? failure, shop: undefined };
      return { problem: null, shop: body.shop as AdminShop | undefined };
    } catch {
      return { problem: NETWORK_ERROR, shop: undefined };
    }
  }

  const save: Save = async (next, password = "") => {
    setSavingId(next.id);
    const { problem, shop } = await request(
      `/${next.id}`,
      "PUT",
      {
        name: next.name,
        slug: next.slug,
        owner_name: next.owner_name,
        owner_phone: next.owner_phone,
        active: next.active,
        ...(password && { password }),
      },
      "Couldn’t save the change.",
    );
    setSavingId(null);
    if (shop)
      setShops((current) =>
        current.map((row) => (row.id === next.id ? shop : row)),
      );
    return problem;
  };

  async function quickSave(next: AdminShop) {
    const problem = await save(next);
    if (problem) setError(problem);
  }

  const remove = async (row: AdminShop) => {
    const { problem } = await request(
      `/${row.id}`,
      "DELETE",
      undefined,
      "Couldn’t delete the shop.",
    );
    // 404 means it is already gone, so drop it here too.
    if (!problem) setShops((current) => current.filter((r) => r.id !== row.id));
    return problem;
  };

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setCreating(true);
    setCreateError("");
    const { problem, shop } = await request(
      "",
      "POST",
      fields,
      "Couldn’t create the shop.",
    );
    setCreating(false);
    if (problem || !shop) return setCreateError(problem ?? "");
    setShops((current) => [...current, shop]);
    setCreated({
      name: shop.name,
      slug: shop.slug,
      owner_phone: shop.owner_phone,
      password: String(fields.password),
    });
    setDraft({ name: "", slug: "", edited: false, password: "" });
  }

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="admin-head">
        <h1>Shops</h1>
        <div className="admin-head-actions">
          <Button
            variant="outline"
            className="admin-refresh"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              // Closing is the dismissal: the password isn't shown again.
              if (!open) {
                setCreated(null);
                setCreateError("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus aria-hidden="true" />
                New shop
              </Button>
            </DialogTrigger>
            <DialogContent className="delete-dialog create-dialog">
              {created ? (
                <>
                  <DialogTitle>{created.name} is ready</DialogTitle>
                  <DialogDescription>
                    Share these with the owner. The password isn’t shown again
                    once you close this; invite the owner from View to set a
                    new one.
                  </DialogDescription>
                  <Credentials
                    key={created.slug}
                    shop={created}
                    password={created.password}
                  />
                  <DialogClose asChild>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="edit-cancel"
                    >
                      Done
                    </Button>
                  </DialogClose>
                </>
              ) : (
                <>
                  <DialogTitle>New shop</DialogTitle>
                  <DialogDescription>
                    You’ll get the owner’s login details once it’s created.
                  </DialogDescription>
                  <form className="shops-admin-form" onSubmit={createShop}>
                    <Field className="field">
                      <FieldLabel htmlFor="shop-name">Shop name</FieldLabel>
                      <Input
                        id="shop-name"
                        name="name"
                        value={draft.name}
                        onChange={(event) => {
                          const name = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            name,
                            slug: current.edited ? current.slug : shopSlug(name),
                          }));
                        }}
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="Nellai Oil Mart"
                      />
                    </Field>
                    <Field className="field">
                      <FieldLabel htmlFor="shop-slug">
                        Link <span>(filled from the name)</span>
                      </FieldLabel>
                      <Input
                        id="shop-slug"
                        name="slug"
                        value={draft.slug}
                        onChange={(event) => {
                          const slug = event.target.value;
                          // Clearing the field hands it back to the name.
                          setDraft((current) => ({ ...current, slug, edited: slug !== "" }));
                        }}
                        required
                        minLength={2}
                        maxLength={40}
                        pattern="[A-Za-z0-9 _\-]*"
                        placeholder="nellai-oil-mart"
                      />
                    </Field>
                    <Field className="field">
                      <FieldLabel htmlFor="shop-owner">Owner name</FieldLabel>
                      <Input
                        id="shop-owner"
                        name="owner_name"
                        required
                        minLength={2}
                        maxLength={80}
                      />
                    </Field>
                    <Field className="field">
                      <FieldLabel htmlFor="shop-phone">Owner mobile</FieldLabel>
                      <Input
                        id="shop-phone"
                        name="owner_phone"
                        {...mobileInput}
                        required
                        placeholder="10-digit mobile number"
                      />
                    </Field>
                    <PasswordField
                      id="shop-password"
                      label="Password"
                      value={draft.password}
                      required
                      onChange={(password) =>
                        setDraft((current) => ({ ...current, password }))
                      }
                    />
                    <FieldError>{createError}</FieldError>
                    <div className="delete-actions">
                      <DialogClose asChild>
                        <Button
                          type="button"
                          size="lg"
                          variant="outline"
                          className="edit-cancel"
                        >
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit" size="lg" disabled={creating}>
                        {creating ? "Creating…" : "Create shop"}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="admin-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card
        className="admin-table shops-admin-table gap-0 py-0 shadow-none"
        role="region"
        tabIndex={0}
        aria-label="Shops table"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Shop</TableHead>
              <TableHead scope="col">Owner</TableHead>
              <TableHead scope="col">Mobile</TableHead>
              <TableHead scope="col">Products</TableHead>
              <TableHead scope="col">Active</TableHead>
              <TableHead scope="col">Created</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shops.map((row) => (
              <TableRow key={row.id} data-status={row.active ? "active" : "inactive"}>
                <TableCell className="cell-name">
                  <span className="admin-name">{row.name}</span>
                  <span className="admin-sub">
                    <a
                      href={shopPath(row.slug)}
                      target="_blank"
                      rel="noopener"
                      className="shops-admin-link"
                    >
                      {shopPath(row.slug)}
                      <ExternalLink aria-hidden="true" />
                      <span className="sr-only">
                        (opens {row.name} in a new tab)
                      </span>
                    </a>
                  </span>
                </TableCell>
                <TableCell className="admin-address">{row.owner_name}</TableCell>
                <TableCell className="cell-phone">
                  <a href={`tel:${row.owner_phone}`}>
                    {formatPhone(row.owner_phone)}
                  </a>
                </TableCell>
                <TableCell className="cell-seats">
                  {row.products}
                  <span className="seats-unit">
                    {row.products === 1 ? " product" : " products"}
                  </span>
                </TableCell>
                <TableCell className="cell-payment">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="pay-toggle"
                    aria-pressed={row.active}
                    aria-label={`Active: ${row.name}`}
                    disabled={savingId === row.id}
                    onClick={() => quickSave({ ...row, active: !row.active })}
                  >
                    {row.active && <Check aria-hidden="true" />}
                    {row.active ? "Active" : "Inactive"}
                  </Button>
                </TableCell>
                <TableCell className="cell-date">
                  {dayFormat.format(new Date(row.created_at))}
                </TableCell>
                <TableCell className="cell-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon"
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setViewing(row);
                    }}
                  >
                    <Eye aria-hidden="true" />
                    <span className="sr-only">View {row.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon"
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setEditing(row);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    <span className="sr-only">Edit {row.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon admin-delete"
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setDeleting(row);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="sr-only">Delete {row.name}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {shops.length === 0 && !loading && (
          <p className="admin-empty">
            No shops yet. Use New shop to create the first one.
          </p>
        )}
      </Card>

      <ViewDialog
        row={viewing}
        onClose={() => setViewing(null)}
        onSave={save}
        onCloseAutoFocus={returnFocus}
      />
      <EditPanel
        row={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        onCloseAutoFocus={returnFocus}
      />
      <DeleteDialog
        row={deleting}
        onClose={() => setDeleting(null)}
        onDelete={remove}
        onCloseAutoFocus={returnFocus}
      />
    </>
  );
}
