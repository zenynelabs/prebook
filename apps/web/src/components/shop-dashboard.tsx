"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  ImageOff,
  Layers,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  affiliatePath,
  type AffiliateStatus,
  affiliateStatuses,
  type Banner,
  categorySuggestions,
  type ComboItem,
  comboSavings,
  type Faq,
  formatRupees,
  imageUrl,
  type Order,
  type OrderStatus,
  orderStatuses,
  parseRupees,
  type Product,
  type ProductInput,
  SHOP_TOKEN_KEY,
  type Shop,
  shopPath,
  type ShopAffiliate,
  shopSlug,
  sizeSuggestions,
  type Theme,
  themes,
  toRupeeInput,
} from "@/lib/shops";
import { eventsApi, site } from "@/lib/site";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Textarea } from "./ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
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

type View = "orders" | "affiliates" | "products" | "combos" | "settings";
type Kind = Product["kind"];
type Affiliates = { commission_percent: number; affiliates: ShopAffiliate[] };
type Editing = { kind: Kind; row: Product | null };
type Upload = (file: File) => Promise<{ key: string } | { error: string }>;

const OFFLINE = "Couldn’t reach the server. Check your connection and retry.";
const SESSION_ENDED = "Your session has ended. Sign in again.";
const MONEY_HINT = "Enter an amount like 245 or 245.50.";

export type ProductFields = {
  name: string;
  category: string;
  size: string;
  description: string;
  price: string;
  mrp: string;
  sort: string;
  image: string | null;
  in_stock: boolean;
};

export const orderFilters = ["all", ...Object.keys(orderStatuses)] as const;

export function filterOrders(rows: Order[], status: string) {
  return status === "all" ? rows : rows.filter((row) => row.status === status);
}

/** Indian mobile numbers only: the last 10 digits, with the 91 country code. */
export function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `https://wa.me/91${digits}` : null;
}

/** Secondary line on an order brought in by an affiliate; null for direct orders. */
export function affiliateNote(order: Order) {
  return order.affiliate
    ? `via ${order.affiliate} · ${formatRupees(order.commission_paise)} commission`
    : null;
}

const orderDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function filterProducts(rows: Product[], query: string) {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      !needle ||
      `${row.name} ${row.category} ${row.size}`.toLowerCase().includes(needle),
  );
}

/** What the PUT body needs: a product without its server-owned fields. */
export function toInput(product: Product): ProductInput {
  const { id: _id, created_at: _created, updated_at: _updated, ...input } =
    product;
  return input;
}

/** Quantities typed in the picker → the items the API wants (0 = left out). */
export const comboItems = (qty: Record<number, number>): ComboItem[] =>
  Object.entries(qty)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      id: Number(id),
      qty: Math.min(99, Math.floor(count)),
    }));

/** Form text → paise and the API's rules, so mistakes show before the request. */
export function buildProductInput(
  kind: Kind,
  fields: ProductFields,
  items: ComboItem[],
): { input: ProductInput } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const price = parseRupees(fields.price);
  const mrp = fields.mrp.trim() ? parseRupees(fields.mrp) : null;
  if (price === null) errors.price = MONEY_HINT;
  if (fields.mrp.trim() && mrp === null) errors.mrp = MONEY_HINT;
  else if (price !== null && mrp !== null && mrp < price)
    errors.mrp = "MRP can’t be lower than the price.";
  const sort = Number(fields.sort || 0);
  if (!Number.isInteger(sort)) errors.sort = "Use a whole number.";
  if (kind === "combo" && (items.length < 1 || items.length > 20))
    errors.items = items.length
      ? "A combo can hold up to 20 products."
      : "Pick at least one product for this combo.";
  if (price === null || Object.keys(errors).length) return { errors };
  return {
    input: {
      kind,
      name: fields.name.trim(),
      category: fields.category.trim(),
      size: fields.size.trim(),
      description: fields.description.trim(),
      price_paise: price,
      mrp_paise: mrp,
      image: fields.image,
      in_stock: fields.in_stock,
      sort,
      items: kind === "combo" ? items : [],
    },
  };
}

const bySort = (a: Product, b: Product) => a.sort - b.sort || a.id - b.id;

/** Longest edge 1600px as WebP; the original file if the browser can't. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    return blob?.type === "image/webp" ? blob : file;
  } catch {
    return file;
  }
}

function storage(action: (store: Storage) => string | null | void) {
  try {
    return action(sessionStorage) ?? null;
  } catch {
    return null;
  }
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
        <span>Shop</span>
      </span>
    </Link>
  );
}

function SidebarNav({
  view,
  slug,
  onView,
  onSignOut,
}: {
  view: View;
  slug: string;
  onView: (view: View) => void;
  onSignOut: () => void;
}) {
  const items: [View, string, typeof Package][] = [
    ["orders", "Orders", ShoppingBag],
    ["affiliates", "Affiliates", Users],
    ["products", "Products", Package],
    ["combos", "Combos", Layers],
    ["settings", "Shop settings", Settings],
  ];
  return (
    <>
      <nav className="admin-nav" aria-label="Dashboard">
        <p>My shop</p>
        {items.map(([value, label, Icon]) => (
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
          <a href={shopPath(slug)} target="_blank" rel="noopener">
            <ExternalLink aria-hidden="true" />
            View my shop
          </a>
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

function ImageField({
  id,
  label,
  value,
  upload,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  upload: Upload;
  onChange: (key: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    const result = await upload(file);
    setBusy(false);
    input.value = "";
    if ("key" in result) onChange(result.key);
    else setError(result.error);
  }

  return (
    <Field className="field">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="shop-image">
        {value ? (
          <img className="shop-thumb" src={imageUrl(value)} alt="" />
        ) : (
          <span className="shop-thumb">
            <ImageOff aria-hidden="true" />
          </span>
        )}
        <div className="shop-image-actions">
          <Input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={pick}
          />
          {value && !busy && (
            <Button
              type="button"
              variant="outline"
              className="edit-cancel"
              onClick={() => onChange(null)}
            >
              Remove image
            </Button>
          )}
        </div>
      </div>
      {busy && (
        <p className="admin-sub" role="status">
          Uploading…
        </p>
      )}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function ProductForm({
  kind,
  row,
  products,
  upload,
  onSave,
  onClose,
}: {
  kind: Kind;
  row: Product | null;
  products: Product[];
  upload: Upload;
  onSave: (input: ProductInput, id?: number) => Promise<string | null>;
  onClose: () => void;
}) {
  const combo = kind === "combo";
  const [image, setImage] = useState(row?.image ?? null);
  const [price, setPrice] = useState(row ? toRupeeInput(row.price_paise) : "");
  const [qty, setQty] = useState<Record<number, number>>(() =>
    Object.fromEntries((row?.items ?? []).map((item) => [item.id, item.qty])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const items = comboItems(qty).filter((item) =>
    products.some((product) => product.id === item.id),
  );
  const parsed = parseRupees(price);
  const { separate, saving: saves } = comboSavings(
    { items, price_paise: parsed ?? 0 } as Product,
    products,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const result = buildProductInput(
      kind,
      {
        ...(fields as Omit<ProductFields, "image" | "in_stock" | "price">),
        price,
        image,
        in_stock: fields.in_stock === "on",
      },
      items,
    );
    if ("errors" in result) return setErrors(result.errors);
    setErrors({});
    setSaving(true);
    const problem = await onSave(result.input, row?.id);
    setSaving(false);
    if (problem) setError(problem);
    else onClose();
  }

  return (
    <form className="edit-form" onSubmit={submit}>
      <SheetHeader>
        <SheetTitle>
          {row ? row.name : combo ? "Add combo" : "Add product"}
        </SheetTitle>
        <SheetDescription>Prices are in rupees.</SheetDescription>
      </SheetHeader>
      <Field className="field">
        <FieldLabel htmlFor="shop-name">Name</FieldLabel>
        <Input
          id="shop-name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={row?.name}
          placeholder={combo ? "Monthly kitchen kit" : "Sunflower oil"}
        />
      </Field>
      <div className="edit-pair">
        <Field className="field">
          <FieldLabel htmlFor="shop-category">
            Category <span>(optional)</span>
          </FieldLabel>
          <Input
            id="shop-category"
            name="category"
            list="shop-categories"
            maxLength={40}
            defaultValue={row?.category}
          />
          <datalist id="shop-categories">
            {categorySuggestions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>
        <Field className="field">
          <FieldLabel htmlFor="shop-size">
            Size or pack <span>(optional)</span>
          </FieldLabel>
          <Input
            id="shop-size"
            name="size"
            list="shop-sizes"
            maxLength={40}
            defaultValue={row?.size}
          />
          <datalist id="shop-sizes">
            {sizeSuggestions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="edit-pair">
        <Field className="field" data-invalid={!!errors.price}>
          <FieldLabel htmlFor="shop-price">Price ₹</FieldLabel>
          <Input
            id="shop-price"
            inputMode="decimal"
            required
            value={price}
            aria-invalid={!!errors.price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <FieldError>{errors.price}</FieldError>
        </Field>
        <Field className="field" data-invalid={!!errors.mrp}>
          <FieldLabel htmlFor="shop-mrp">
            MRP ₹ <span>(optional)</span>
          </FieldLabel>
          <Input
            id="shop-mrp"
            name="mrp"
            inputMode="decimal"
            aria-invalid={!!errors.mrp}
            defaultValue={row?.mrp_paise ? toRupeeInput(row.mrp_paise) : ""}
          />
          <FieldError>{errors.mrp}</FieldError>
        </Field>
      </div>
      {combo && (
        <Field
          className="field"
          role="group"
          aria-labelledby="combo-items-label"
          data-invalid={!!errors.items}
        >
          <FieldLabel id="combo-items-label">Products in this combo</FieldLabel>
          {products.length === 0 ? (
            <p className="admin-sub">Add products first, then bundle them here.</p>
          ) : (
            <div className="shop-combo-list">
              {products.map((product) => (
                <div key={product.id} className="shop-combo-item">
                  <label htmlFor={`combo-qty-${product.id}`}>
                    <span className="admin-name">{product.name}</span>
                    <span className="admin-sub">
                      {[product.size, formatRupees(product.price_paise)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </label>
                  <Input
                    id={`combo-qty-${product.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    className="h-11 text-center"
                    value={qty[product.id] || 0}
                    onChange={(event) =>
                      setQty({
                        ...qty,
                        [product.id]: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <p className="shop-savings" aria-live="polite">
              Bought separately {formatRupees(separate)}
              {parsed !== null && saves > 0 && ` · saves ${formatRupees(saves)}`}
            </p>
          )}
          <FieldError>{errors.items}</FieldError>
        </Field>
      )}
      <Field className="field">
        <FieldLabel htmlFor="shop-description">
          Description <span>(optional)</span>
        </FieldLabel>
        <Textarea
          id="shop-description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={row?.description}
        />
      </Field>
      <ImageField
        id="shop-image"
        label="Photo"
        value={image}
        upload={upload}
        onChange={setImage}
      />
      <div className="edit-pair">
        <Field className="field" data-invalid={!!errors.sort}>
          <FieldLabel htmlFor="shop-sort">Sort order</FieldLabel>
          <Input
            id="shop-sort"
            name="sort"
            type="number"
            step={1}
            aria-invalid={!!errors.sort}
            defaultValue={row?.sort ?? 0}
          />
          <FieldError>{errors.sort}</FieldError>
        </Field>
        <label className="shop-check">
          <input
            type="checkbox"
            name="in_stock"
            defaultChecked={row?.in_stock ?? true}
          />
          In stock
        </label>
      </div>
      <FieldError>{error}</FieldError>
      <div className="edit-actions">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving…" : "Save"}
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
  );
}

function EditPanel({
  target,
  products,
  upload,
  onClose,
  onSave,
  onCloseAutoFocus,
}: {
  target: Editing | null;
  products: Product[];
  upload: Upload;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onSave: (input: ProductInput, id?: number) => Promise<string | null>;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="edit-sheet"
        closeLabel="Close editor"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {target && (
          <ProductForm
            key={target.row?.id ?? `new-${target.kind}`}
            kind={target.kind}
            row={target.row}
            products={products.filter((product) => product.kind === "product")}
            upload={upload}
            onSave={onSave}
            onClose={onClose}
          />
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
  row: Product | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onDelete: (row: Product) => Promise<string | null>;
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
            <DialogTitle>
              Delete this {row.kind === "combo" ? "combo" : "product"}?
            </DialogTitle>
            <DialogDescription>
              {row.name} will be removed from your shop permanently
              {row.kind === "product" && ", and from any combo that includes it"}
              . This can’t be undone.
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

function CatalogTable({
  kind,
  rows,
  empty,
  savingId,
  onStock,
  onEdit,
  onDelete,
}: {
  kind: Kind;
  rows: Product[];
  empty: string;
  savingId: number | null;
  onStock: (row: Product) => void;
  onEdit: (event: React.MouseEvent<HTMLElement>, row: Product) => void;
  onDelete: (event: React.MouseEvent<HTMLElement>, row: Product) => void;
}) {
  const label = kind === "combo" ? "Combos" : "Products";
  return (
    <Card
      className="admin-table shop-table gap-0 py-0 shadow-none"
      role="region"
      tabIndex={0}
      aria-label={`${label} table`}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{kind === "combo" ? "Combo" : "Product"}</TableHead>
            <TableHead scope="col">
              {kind === "combo" ? "Includes" : "Category"}
            </TableHead>
            <TableHead scope="col">Price</TableHead>
            <TableHead scope="col">Stock</TableHead>
            <TableHead scope="col">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const saving = savingId === row.id;
            return (
              <TableRow key={row.id}>
                <TableCell className="cell-name">
                  <div className="shop-product">
                    {row.image ? (
                      <img className="shop-thumb" src={imageUrl(row.image)} alt="" />
                    ) : (
                      <span className="shop-thumb">
                        <ImageOff aria-hidden="true" />
                      </span>
                    )}
                    <div>
                      <span className="admin-name">{row.name}</span>
                      {row.size && <span className="admin-sub">{row.size}</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="shop-meta">
                  {kind === "combo"
                    ? `${row.items.length} ${row.items.length === 1 ? "product" : "products"}`
                    : row.category || "—"}
                </TableCell>
                <TableCell className="shop-price">
                  {formatRupees(row.price_paise)}
                  {row.mrp_paise !== null && row.mrp_paise > row.price_paise && (
                    <s className="shop-mrp">{formatRupees(row.mrp_paise)}</s>
                  )}
                </TableCell>
                <TableCell className="shop-stock">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="pay-toggle"
                    aria-pressed={row.in_stock}
                    aria-label={`In stock: ${row.name}`}
                    disabled={saving}
                    onClick={() => onStock(row)}
                  >
                    {row.in_stock && <Check aria-hidden="true" />}
                    {row.in_stock ? "In stock" : "Out of stock"}
                  </Button>
                </TableCell>
                <TableCell className="cell-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon"
                    onClick={(event) => onEdit(event, row)}
                  >
                    <Pencil aria-hidden="true" />
                    <span className="sr-only">Edit {row.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon admin-delete"
                    onClick={(event) => onDelete(event, row)}
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="sr-only">Delete {row.name}</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length === 0 && <p className="admin-empty">{empty}</p>}
    </Card>
  );
}

function OrdersView({
  orders,
  loading,
  savingId,
  onRefresh,
  onStatus,
}: {
  orders: Order[] | null;
  loading: boolean;
  savingId: number | null;
  onRefresh: () => void;
  onStatus: (order: Order, status: OrderStatus) => void;
}) {
  const [filter, setFilter] = useState("all");
  const visible = filterOrders(orders ?? [], filter);
  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-filters">
          <Field className="field">
            <FieldLabel htmlFor="order-filter" className="sr-only">
              Filter orders by status
            </FieldLabel>
            <NativeSelect
              id="order-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <NativeSelectOption value="all">All orders</NativeSelectOption>
              {(Object.keys(orderStatuses) as OrderStatus[]).map((key) => (
                <NativeSelectOption key={key} value={key}>
                  {orderStatuses[key]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Button
          variant="outline"
          type="button"
          className="admin-refresh"
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw aria-hidden="true" />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {visible.map((order) => {
          const chat = whatsappLink(order.customer_phone);
          return (
            <Card
              key={order.id}
              className="gap-4 p-5 shadow-none sm:p-6"
              data-status={order.status}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
                <div>
                  <h2 className="text-lg font-semibold">Order #{order.id}</h2>
                  <p className="admin-sub">
                    {orderDate.format(new Date(order.created_at))}
                  </p>
                  {affiliateNote(order) && (
                    <p className="admin-sub">{affiliateNote(order)}</p>
                  )}
                </div>
                <p className="text-xl font-semibold tabular-nums">
                  {formatRupees(order.total_paise)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{order.customer_name}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <a
                      className="inline-flex min-h-11 items-center font-medium tabular-nums text-(--accent-text)"
                      href={`tel:${order.customer_phone}`}
                    >
                      {order.customer_phone}
                    </a>
                    {chat && (
                      <a
                        className="inline-flex min-h-11 items-center font-medium text-(--accent-text)"
                        href={chat}
                        target="_blank"
                        rel="noopener"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <p className="whitespace-pre-line text-(--text-2)">
                    {order.address}
                  </p>
                  {order.note && (
                    <p className="whitespace-pre-line text-(--text-2)">
                      Note: {order.note}
                    </p>
                  )}
                </div>
                <ul className="flex flex-col gap-2">
                  {order.items.map((line, index) => (
                    <li
                      key={`${line.id}-${index}`}
                      className="flex justify-between gap-4"
                    >
                      <span>
                        {line.qty} × {line.name}
                        {line.size && (
                          <span className="admin-sub">{line.size}</span>
                        )}
                      </span>
                      <span className="tabular-nums">
                        {formatRupees(line.price_paise * line.qty)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-(--border) pt-4">
                <p className="text-(--text-2)">
                  Cash on delivery ·{" "}
                  {order.payment_status === "paid" ? "paid" : "pending"}
                </p>
                <Field className="field w-full sm:w-52">
                  <FieldLabel htmlFor={`order-status-${order.id}`} className="sr-only">
                    Status of order #{order.id}
                  </FieldLabel>
                  <NativeSelect
                    id={`order-status-${order.id}`}
                    value={order.status}
                    disabled={savingId === order.id}
                    onChange={(event) =>
                      onStatus(order, event.target.value as OrderStatus)
                    }
                  >
                    {(Object.keys(orderStatuses) as OrderStatus[]).map((key) => (
                      <NativeSelectOption key={key} value={key}>
                        {orderStatuses[key]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
            </Card>
          );
        })}
      </div>
      {orders && visible.length === 0 && (
        <Card className="gap-0 py-0 shadow-none">
          <p className="admin-empty">
            {orders.length === 0
              ? "No orders yet. Orders placed on your shop page appear here."
              : "No orders with this status."}
          </p>
        </Card>
      )}
    </>
  );
}

function RevokeDialog({
  row,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  row: ShopAffiliate | null;
  onClose: () => void;
  onConfirm: (row: ShopAffiliate) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="delete-dialog"
        role="alertdialog"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {row && (
          <>
            <DialogTitle>Revoke {row.name}?</DialogTitle>
            <DialogDescription>
              Orders placed through their link will stop earning commission.
              Commission on past orders stays.
            </DialogDescription>
            <div className="delete-actions">
              <DialogClose asChild>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="edit-cancel"
                >
                  Keep approved
                </Button>
              </DialogClose>
              <Button
                type="button"
                size="lg"
                className="button-danger"
                onClick={() => {
                  onConfirm(row);
                  onClose();
                }}
              >
                Revoke
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AffiliatesView({
  slug,
  data,
  savingId,
  onCommission,
  onStatus,
  onRevoke,
}: {
  slug: string;
  data: Affiliates | null;
  savingId: number | null;
  onCommission: (percent: number) => Promise<string | null>;
  onStatus: (affiliate: ShopAffiliate, status: AffiliateStatus) => void;
  onRevoke: (
    event: React.MouseEvent<HTMLElement>,
    affiliate: ShopAffiliate,
  ) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const link = `${site.url}${affiliatePath}?shop=${slug}`;

  async function saveCommission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const problem = await onCommission(
      Number(new FormData(event.currentTarget).get("commission")),
    );
    setSaving(false);
    if (problem) setError(problem);
    else setSaved(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn’t copy. Select the link and copy it instead.");
    }
  }

  if (!data) return null;
  return (
    <>
      <Card className="shop-section gap-0 py-0 shadow-none">
        <form className="edit-form" onSubmit={saveCommission}>
          <h2>Commission</h2>
          <Field className="field">
            <FieldLabel htmlFor="commission">Commission percent</FieldLabel>
            <Input
              id="commission"
              name="commission"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              step={1}
              required
              defaultValue={data.commission_percent}
            />
          </Field>
          <p className="max-w-none text-(--text-2)">
            Paid on delivered orders placed through an approved affiliate’s link.
          </p>
          <FieldError>{error}</FieldError>
          <div className="shop-save">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {saved && <p role="status">Saved.</p>}
          </div>
        </form>
        <div className="shop-link">
          <p className="max-w-none min-w-0 flex-1 basis-64 text-(--text-2) [overflow-wrap:anywhere]">
            Affiliates apply from your shop page or at {link}
          </p>
          <Button
            variant="outline"
            type="button"
            className="admin-refresh"
            onClick={copyLink}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </Card>

      <Card
        className="admin-table affiliate-table gap-0 py-0 shadow-none"
        role="region"
        tabIndex={0}
        aria-label="Affiliates table"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Affiliate</TableHead>
              <TableHead scope="col">Mobile</TableHead>
              <TableHead scope="col">Orders</TableHead>
              <TableHead scope="col">Sales</TableHead>
              <TableHead scope="col">Earned</TableHead>
              <TableHead scope="col">Pending</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.affiliates.map((affiliate) => {
              const chat = whatsappLink(affiliate.phone);
              const busy = savingId === affiliate.id;
              return (
                <TableRow key={affiliate.id}>
                  <TableCell className="cell-name">
                    <span className="admin-name">{affiliate.name}</span>
                    <span className="admin-sub">
                      {affiliateStatuses[affiliate.status]}
                    </span>
                  </TableCell>
                  <TableCell className="cell-name">
                    <div className="flex flex-wrap gap-x-5">
                      <a
                        className="inline-flex min-h-11 items-center"
                        href={`tel:${affiliate.phone}`}
                      >
                        {affiliate.phone}
                      </a>
                      {chat && (
                        <a
                          className="inline-flex min-h-11 items-center"
                          href={chat}
                          target="_blank"
                          rel="noopener"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-label="Orders">{affiliate.orders}</TableCell>
                  <TableCell data-label="Sales">
                    {formatRupees(affiliate.sales_paise)}
                  </TableCell>
                  <TableCell data-label="Earned">
                    {formatRupees(affiliate.earned_paise)}
                  </TableCell>
                  <TableCell data-label="Pending">
                    {formatRupees(affiliate.pending_paise)}
                  </TableCell>
                  <TableCell className="cell-copy">
                    <div className="affiliate-actions">
                      {affiliate.status !== "approved" && (
                        <Button
                          type="button"
                          disabled={busy}
                          aria-label={`Approve ${affiliate.name}`}
                          onClick={() => onStatus(affiliate, "approved")}
                        >
                          Approve
                        </Button>
                      )}
                      {affiliate.status === "pending" && (
                        <Button
                          variant="outline"
                          type="button"
                          className="admin-refresh"
                          disabled={busy}
                          aria-label={`Reject ${affiliate.name}`}
                          onClick={() => onStatus(affiliate, "rejected")}
                        >
                          Reject
                        </Button>
                      )}
                      {affiliate.status === "approved" && (
                        <Button
                          variant="outline"
                          type="button"
                          className="admin-refresh"
                          disabled={busy}
                          aria-label={`Revoke ${affiliate.name}`}
                          onClick={(event) => onRevoke(event, affiliate)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {data.affiliates.length === 0 && (
          <p className="admin-empty">No affiliates yet.</p>
        )}
      </Card>
    </>
  );
}

function SettingsView({
  shop,
  upload,
  onSave,
  onPassword,
}: {
  shop: Shop;
  upload: Upload;
  onSave: (patch: Omit<Shop, "slug">) => Promise<string | null>;
  onPassword: (current: string, next: string) => Promise<string | null>;
}) {
  const [logo, setLogo] = useState(shop.logo);
  const [banners, setBanners] = useState<Banner[]>(shop.banners);
  const [faqs, setFaqs] = useState<Faq[]>(shop.faqs ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: "", ok: false });
  const link = `${site.url}${shopPath(shop.slug)}`;

  const editFaq = (index: number, change: Partial<Faq>) =>
    setFaqs((current) =>
      current.map((faq, i) => (i === index ? { ...faq, ...change } : faq)),
    );

  function moveFaq(index: number, step: number) {
    setFaqs((current) => {
      const next = [...current];
      const [faq] = next.splice(index, 1);
      next.splice(index + step, 0, faq);
      return next;
    });
  }

  const edit = (index: number, change: Partial<Banner>) =>
    setBanners((current) =>
      current.map((banner, i) => (i === index ? { ...banner, ...change } : banner)),
    );

  function move(index: number, step: number) {
    setBanners((current) => {
      const next = [...current];
      const [banner] = next.splice(index, 1);
      next.splice(index + step, 0, banner);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setSaved(false);
    if (banners.some((banner) => !banner.image))
      return setError("Every banner needs an image.");
    if (faqs.some((faq) => faq.question.trim().length < 2 || faq.answer.trim().length < 2))
      return setError("Every question needs a question and an answer.");
    setError("");
    setSaving(true);
    const problem = await onSave({
      name: String(fields.get("name")).trim(),
      tagline: String(fields.get("tagline")).trim(),
      theme: fields.get("theme") as Theme,
      logo,
      banners,
      faqs: faqs.map((faq) => ({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      })),
    });
    setSaving(false);
    if (problem) setError(problem);
    else setSaved(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn’t copy. Select the link and copy it instead.");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPasswordBusy(true);
    const problem = await onPassword(
      String(fields.get("current")),
      String(fields.get("next")),
    );
    setPasswordBusy(false);
    if (!problem) form.reset();
    setPasswordMessage(
      problem ? { text: problem, ok: false } : { text: "Password changed.", ok: true },
    );
  }

  return (
    <>
      <Card className="shop-section gap-0 py-0 shadow-none">
        <h2>Your shop link</h2>
        <div className="shop-link">
          <a className="shop-url" href={link} target="_blank" rel="noopener">
            {link}
          </a>
          <Button
            variant="outline"
            type="button"
            className="admin-refresh"
            onClick={copyLink}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button variant="outline" className="admin-refresh" asChild>
            <a href={link} target="_blank" rel="noopener">
              <ExternalLink aria-hidden="true" />
              Open shop
            </a>
          </Button>
        </div>
      </Card>

      <Card className="shop-section gap-0 py-0 shadow-none">
        <form className="edit-form" onSubmit={submit}>
          <h2>Shop details</h2>
          <Field className="field">
            <FieldLabel htmlFor="shop-title">Shop name</FieldLabel>
            <Input
              id="shop-title"
              name="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={shop.name}
            />
          </Field>
          <Field className="field">
            <FieldLabel htmlFor="shop-tagline">
              Tagline <span>(optional)</span>
            </FieldLabel>
            <Input
              id="shop-tagline"
              name="tagline"
              maxLength={160}
              defaultValue={shop.tagline}
            />
          </Field>
          <ImageField
            id="shop-logo"
            label="Logo"
            value={logo}
            upload={upload}
            onChange={setLogo}
          />
          <FieldSet>
            <FieldLegend variant="label">Colour theme</FieldLegend>
            <div className="shop-theme">
              {(Object.keys(themes) as Theme[]).map((key) => (
                <label key={key} className="shop-theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value={key}
                    defaultChecked={shop.theme === key}
                  />
                  <span
                    className="shop-swatch"
                    style={{ background: themes[key].accent }}
                    aria-hidden="true"
                  />
                  {themes[key].label}
                </label>
              ))}
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">Banners ({banners.length} of 5)</FieldLegend>
            {banners.map((banner, index) => (
              <div key={index} className="shop-banner">
                <ImageField
                  id={`banner-image-${index}`}
                  label={`Banner ${index + 1} image`}
                  value={banner.image || null}
                  upload={upload}
                  onChange={(key) => edit(index, { image: key ?? "" })}
                />
                <Field className="field">
                  <FieldLabel htmlFor={`banner-title-${index}`}>
                    Title <span>(optional)</span>
                  </FieldLabel>
                  <Input
                    id={`banner-title-${index}`}
                    maxLength={80}
                    value={banner.title}
                    onChange={(event) => edit(index, { title: event.target.value })}
                  />
                </Field>
                <Field className="field">
                  <FieldLabel htmlFor={`banner-subtitle-${index}`}>
                    Subtitle <span>(optional)</span>
                  </FieldLabel>
                  <Input
                    id={`banner-subtitle-${index}`}
                    maxLength={160}
                    value={banner.subtitle}
                    onChange={(event) =>
                      edit(index, { subtitle: event.target.value })
                    }
                  />
                </Field>
                <div className="shop-banner-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp aria-hidden="true" />
                    <span className="sr-only">Move banner {index + 1} up</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon"
                    disabled={index === banners.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown aria-hidden="true" />
                    <span className="sr-only">Move banner {index + 1} down</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon admin-delete"
                    onClick={() =>
                      setBanners((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="sr-only">Remove banner {index + 1}</span>
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              type="button"
              className="admin-refresh"
              disabled={banners.length >= 5}
              onClick={() =>
                setBanners((current) => [
                  ...current,
                  { image: "", title: "", subtitle: "" },
                ])
              }
            >
              <Plus aria-hidden="true" />
              Add banner
            </Button>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">Questions and answers ({faqs.length} of 10)</FieldLegend>
            {faqs.map((faq, index) => (
              <div key={index} className="shop-banner">
                <Field className="field">
                  <FieldLabel htmlFor={`faq-question-${index}`}>
                    Question {index + 1}
                  </FieldLabel>
                  <Input
                    id={`faq-question-${index}`}
                    maxLength={160}
                    value={faq.question}
                    onChange={(event) =>
                      editFaq(index, { question: event.target.value })
                    }
                  />
                </Field>
                <Field className="field">
                  <FieldLabel htmlFor={`faq-answer-${index}`}>
                    Answer {index + 1}
                  </FieldLabel>
                  <Textarea
                    id={`faq-answer-${index}`}
                    maxLength={1000}
                    rows={3}
                    value={faq.answer}
                    onChange={(event) =>
                      editFaq(index, { answer: event.target.value })
                    }
                  />
                </Field>
                <div className="shop-banner-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon"
                    disabled={index === 0}
                    onClick={() => moveFaq(index, -1)}
                  >
                    <ChevronUp aria-hidden="true" />
                    <span className="sr-only">Move question {index + 1} up</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon"
                    disabled={index === faqs.length - 1}
                    onClick={() => moveFaq(index, 1)}
                  >
                    <ChevronDown aria-hidden="true" />
                    <span className="sr-only">Move question {index + 1} down</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="admin-icon admin-delete"
                    onClick={() =>
                      setFaqs((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="sr-only">Remove question {index + 1}</span>
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              type="button"
              className="admin-refresh"
              disabled={faqs.length >= 10}
              onClick={() =>
                setFaqs((current) => [...current, { question: "", answer: "" }])
              }
            >
              <Plus aria-hidden="true" />
              Add question
            </Button>
          </FieldSet>
          <FieldError>{error}</FieldError>
          <div className="shop-save">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && <p role="status">Saved.</p>}
          </div>
        </form>
      </Card>

      <Card className="shop-section gap-0 py-0 shadow-none">
        <form className="edit-form" onSubmit={changePassword}>
          <h2>Change password</h2>
          <Field className="field">
            <FieldLabel htmlFor="password-current">Current password</FieldLabel>
            <Input
              id="password-current"
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field className="field">
            <FieldLabel htmlFor="password-next">
              New password <span>(8 characters or more)</span>
            </FieldLabel>
            <Input
              id="password-next"
              name="next"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          {passwordMessage.ok ? (
            <p role="status">{passwordMessage.text}</p>
          ) : (
            <FieldError>{passwordMessage.text}</FieldError>
          )}
          <div className="shop-save">
            <Button type="submit" size="lg" disabled={passwordBusy}>
              {passwordBusy ? "Saving…" : "Change password"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default function ShopDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<View>("orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSavingId, setOrderSavingId] = useState<number | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliates | null>(null);
  const [affiliateSavingId, setAffiliateSavingId] = useState<number | null>(null);
  const [revoking, setRevoking] = useState<ShopAffiliate | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  // Panels open from state, not a Radix trigger, so hand focus back by hand.
  const opener = useRef<HTMLElement | null>(null);
  const returnFocus = (event: Event) => {
    event.preventDefault();
    const target = opener.current?.isConnected
      ? opener.current
      : document.querySelector<HTMLElement>(".admin-table");
    target?.focus();
  };

  const signOut = useCallback((message = "") => {
    storage((store) => store.removeItem(SHOP_TOKEN_KEY));
    setToken(null);
    setShop(null);
    setProducts([]);
    setOrders(null);
    setAffiliates(null);
    setEditing(null);
    setDeleting(null);
    setRevoking(null);
    setError(message);
  }, []);

  const load = useCallback(
    async (value: string) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${eventsApi}/owner/shop`, {
          headers: { Authorization: `Bearer ${value}` },
          cache: "no-store",
        });
        if (response.status === 401) return signOut(SESSION_ENDED);
        if (!response.ok) throw new Error();
        const body: { shop: Shop; products: Product[] } = await response.json();
        storage((store) => store.setItem(SHOP_TOKEN_KEY, value));
        setToken(value);
        setShop(body.shop);
        setProducts(body.products);
      } catch {
        setError("Couldn’t load your shop. Check your connection and retry.");
      } finally {
        setLoading(false);
      }
    },
    [signOut],
  );

  async function request(
    path: string,
    method: string,
    data?: unknown,
    fallback = "Couldn’t save the change.",
  ) {
    const raw = data instanceof FormData;
    try {
      const response = await fetch(`${eventsApi}${path}`, {
        method,
        headers: {
          ...(data && !raw ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
        },
        body: raw ? data : data ? JSON.stringify(data) : undefined,
      });
      if (response.status === 401) {
        signOut(SESSION_ENDED);
        return { status: 401, body: {}, problem: SESSION_ENDED };
      }
      const body = await response.json().catch(() => ({}));
      return {
        status: response.status,
        body,
        problem: response.ok ? null : (body.error ?? fallback),
      };
    } catch {
      return { status: 0, body: {}, problem: OFFLINE };
    }
  }

  async function saveProduct(input: ProductInput, id?: number) {
    const { body, problem } = await request(
      id ? `/owner/products/${id}` : "/owner/products",
      id ? "PUT" : "POST",
      input,
    );
    if (problem) return problem;
    const saved: Product = body.product;
    setProducts((current) =>
      [...current.filter((item) => item.id !== saved.id), saved].sort(bySort),
    );
    return null;
  }

  async function toggleStock(row: Product) {
    setSavingId(row.id);
    setError("");
    const problem = await saveProduct({ ...toInput(row), in_stock: !row.in_stock }, row.id);
    setSavingId(null);
    if (problem) setError(problem);
  }

  async function removeProduct(row: Product) {
    const { status, problem } = await request(
      `/owner/products/${row.id}`,
      "DELETE",
      undefined,
      "Couldn’t delete it.",
    );
    // 404 means it is already gone, so drop it here too.
    if (problem && status !== 404) return problem;
    setProducts((current) =>
      current
        .filter((item) => item.id !== row.id)
        .map((item) => ({
          ...item,
          items: item.items.filter((part) => part.id !== row.id),
        })),
    );
    return null;
  }

  async function loadOrders() {
    setOrdersLoading(true);
    const { body, problem } = await request(
      "/owner/orders",
      "GET",
      undefined,
      "Couldn’t load your orders.",
    );
    setOrdersLoading(false);
    if (problem) setError(problem);
    else {
      setError("");
      setOrders(body.orders);
    }
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    if (status === order.status) return;
    const swap = (next: Order) =>
      setOrders((current) =>
        (current ?? []).map((item) => (item.id === next.id ? next : item)),
      );
    setOrderSavingId(order.id);
    setError("");
    swap({
      ...order,
      status,
      payment_status: status === "delivered" ? "paid" : "pending",
    });
    const { body, problem } = await request(
      `/owner/orders/${order.id}`,
      "PUT",
      { status },
      "Couldn’t update the order.",
    );
    setOrderSavingId(null);
    if (problem) {
      swap(order);
      setError(problem);
    } else swap(body.order);
  }

  async function loadAffiliates() {
    const { body, problem } = await request(
      "/owner/affiliates",
      "GET",
      undefined,
      "Couldn’t load your affiliates.",
    );
    if (problem) setError(problem);
    else {
      setError("");
      setAffiliates(body);
    }
  }

  async function changeAffiliate(affiliate: ShopAffiliate, status: AffiliateStatus) {
    const swap = (next: ShopAffiliate) =>
      setAffiliates((current) =>
        current && {
          ...current,
          affiliates: current.affiliates.map((item) =>
            item.id === next.id ? next : item,
          ),
        },
      );
    setAffiliateSavingId(affiliate.id);
    setError("");
    swap({ ...affiliate, status });
    const { problem } = await request(
      `/owner/affiliates/${affiliate.id}`,
      "PUT",
      { status },
      "Couldn’t update the affiliate.",
    );
    setAffiliateSavingId(null);
    if (problem) {
      swap(affiliate);
      setError(problem);
    }
  }

  async function saveCommission(commission_percent: number) {
    const { body, problem } = await request(
      "/owner/commission",
      "PUT",
      { commission_percent },
      "Couldn’t save the commission.",
    );
    if (!problem)
      setAffiliates(
        (current) => current && { ...current, commission_percent: body.commission_percent },
      );
    return problem;
  }

  async function saveShop(patch: Omit<Shop, "slug">) {
    const { body, problem } = await request("/owner/shop", "PUT", patch);
    if (!problem) setShop(body.shop);
    return problem;
  }

  const changePassword = async (current: string, next: string) =>
    (
      await request(
        "/owner/password",
        "PUT",
        { current, next },
        "Couldn’t change the password.",
      )
    ).problem;

  const upload: Upload = async (file) => {
    const blob = await shrink(file);
    const body = new FormData();
    body.append("file", blob, blob === file ? file.name : "image.webp");
    const result = await request("/owner/images", "POST", body, "Couldn’t upload the image.");
    return result.problem ? { error: result.problem } : { key: result.body.key };
  };

  async function logout() {
    await request("/shop-auth/logout", "POST");
    signOut();
  }

  function showView(next: View) {
    setView(next);
    setQuery("");
    setMenuOpen(false);
  }

  useEffect(() => {
    const saved = storage((store) => store.getItem(SHOP_TOKEN_KEY));
    if (saved) load(saved);
  }, [load]);

  useEffect(() => {
    if (token && view === "orders") loadOrders();
    if (token && view === "affiliates") loadAffiliates();
    // The loaders are recreated every render and only read the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, view]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${eventsApi}/shop-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: shopSlug(String(fields.get("slug"))),
          password: String(fields.get("password")),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error ?? "Couldn’t sign in.");
      else await load(body.token);
    } catch {
      setError(OFFLINE);
    }
    setLoading(false);
  }

  if (!token || !shop)
    return (
      <main className="admin-gate">
        <Card className="register-card admin-card gap-0 shadow-none">
          <form className="flex flex-col gap-[22px]" onSubmit={signIn}>
            <Brand />
            <h1>Shop dashboard</h1>
            <Field className="field">
              <FieldLabel htmlFor="shop-slug">Shop link name</FieldLabel>
              <Input
                id="shop-slug"
                name="slug"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </Field>
            <Field className="field">
              <FieldLabel htmlFor="shop-password">Password</FieldLabel>
              <Input
                id="shop-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <FieldError>{error}</FieldError>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Opening…" : "Open dashboard"}
            </Button>
          </form>
        </Card>
      </main>
    );

  const kind: Kind = view === "combos" ? "combo" : "product";
  const word = kind === "combo" ? "combo" : "product";
  const rows = products.filter((product) => product.kind === kind);
  const visible = filterProducts(rows, query);
  const nav = (
    <SidebarNav view={view} slug={shop.slug} onView={showView} onSignOut={logout} />
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
                Shop sections and links
              </SheetDescription>
              <Brand />
              {nav}
            </SheetContent>
          </Sheet>
        </header>

        <main className="admin-content">
          <div className="admin-head">
            <div>
              <p className="admin-eyebrow">{shop.name}</p>
              <h1>
                {view === "orders"
                  ? "Orders"
                  : view === "affiliates"
                    ? "Affiliates"
                    : view === "products"
                      ? "Products"
                      : view === "combos"
                        ? "Combos"
                        : "Shop settings"}
              </h1>
            </div>
            {(view === "products" || view === "combos") && (
              <Button
                size="lg"
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setEditing({ kind, row: null });
                }}
              >
                <Plus aria-hidden="true" />
                Add {word}
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="admin-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {view === "orders" ? (
            <OrdersView
              orders={orders}
              loading={ordersLoading}
              savingId={orderSavingId}
              onRefresh={loadOrders}
              onStatus={changeStatus}
            />
          ) : view === "affiliates" ? (
            <AffiliatesView
              slug={shop.slug}
              data={affiliates}
              savingId={affiliateSavingId}
              onCommission={saveCommission}
              onStatus={changeAffiliate}
              onRevoke={(event, row) => {
                opener.current = event.currentTarget;
                setRevoking(row);
              }}
            />
          ) : view === "settings" ? (
            <SettingsView
              shop={shop}
              upload={upload}
              onSave={saveShop}
              onPassword={changePassword}
            />
          ) : (
            <>
              <div className="admin-toolbar">
                <div className="admin-filters">
                  <Field className="field admin-search">
                    <FieldLabel htmlFor="shop-search" className="sr-only">
                      Search {word}s
                    </FieldLabel>
                    <Search size={18} aria-hidden="true" />
                    <Input
                      id="shop-search"
                      type="search"
                      placeholder={
                        kind === "combo"
                          ? "Search combos"
                          : "Search name, category or size"
                      }
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </Field>
                </div>
              </div>
              <CatalogTable
                kind={kind}
                rows={visible}
                empty={
                  rows.length === 0
                    ? `No ${word}s yet. Add your first one.`
                    : `No ${word}s match your search.`
                }
                savingId={savingId}
                onStock={toggleStock}
                onEdit={(event, row) => {
                  opener.current = event.currentTarget;
                  setEditing({ kind: row.kind, row });
                }}
                onDelete={(event, row) => {
                  opener.current = event.currentTarget;
                  setDeleting(row);
                }}
              />
            </>
          )}
        </main>
      </div>

      <EditPanel
        target={editing}
        products={products}
        upload={upload}
        onClose={() => setEditing(null)}
        onSave={saveProduct}
        onCloseAutoFocus={returnFocus}
      />
      <RevokeDialog
        row={revoking}
        onClose={() => setRevoking(null)}
        onConfirm={(row) => changeAffiliate(row, "rejected")}
        onCloseAutoFocus={returnFocus}
      />
      <DeleteDialog
        row={deleting}
        onClose={() => setDeleting(null)}
        onDelete={removeProduct}
        onCloseAutoFocus={returnFocus}
      />
    </div>
  );
}
