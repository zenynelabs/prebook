'use client'

import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { eventsApi } from '@/lib/site'
import { type Banner, type CartLine, formatRupees, imageUrl, type OrderInput, type OrderLine, type Product, type Shop } from '@/lib/shops'

const MAX_QTY = 99
const REF_DAYS = 30

/** An affiliate code from ?ref=, kept per shop for 30 days; the last link clicked wins. */
export function freshRef(saved: unknown, now = Date.now()) {
  const ref = saved as { code?: unknown; at?: unknown } | null
  return ref && typeof ref.code === 'string' && /^[0-9a-f]{8}$/.test(ref.code) && typeof ref.at === 'number' && now - ref.at < REF_DAYS * 864e5
    ? ref.code
    : undefined
}

/** Drops lines whose product is gone or out of stock and clamps quantities. */
export function cleanCart(lines: CartLine[], products: Product[]) {
  const available = new Set(products.filter((product) => product.in_stock).map((product) => product.id))
  return lines.filter((line) => available.has(line.id) && Number.isInteger(line.qty) && line.qty > 0).map((line) => ({ ...line, qty: Math.min(line.qty, MAX_QTY) }))
}

/** Display total only; the API prices the order again from its own records. */
export function cartTotal(lines: CartLine[], products: Product[]) {
  const byId = new Map(products.map((product) => [product.id, product]))
  return lines.reduce((sum, line) => sum + (byId.get(line.id)?.price_paise ?? 0) * line.qty, 0)
}

type Cart = {
  lines: CartLine[]
  products: Product[]
  qty: (id: number) => number
  set: (id: number, qty: number) => void
  clear: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

const CartContext = createContext<Cart | null>(null)
const useCart = () => {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('Cart components must sit inside <CartProvider>.')
  return cart
}

function storage<T>(action: (store: Storage) => T) {
  try {
    return action(localStorage)
  } catch {
    return null
  }
}

export function CartProvider({ shop, products, children }: { shop: Shop; products: Product[]; children: ReactNode }) {
  const key = `prebook-cart-${shop.slug}`
  const [lines, setLines] = useState<CartLine[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  // Read after mount so the server HTML and the first client render match.
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('ref')
    if (code && /^[0-9a-f]{8}$/.test(code)) storage((store) => store.setItem(`prebook-ref-${shop.slug}`, JSON.stringify({ code, at: Date.now() })))
  }, [shop.slug])

  useEffect(() => {
    const saved = storage((store) => JSON.parse(store.getItem(key) ?? '[]'))
    if (Array.isArray(saved)) setLines(cleanCart(saved, products))
    setLoaded(true)
  }, [key, products])

  useEffect(() => {
    if (loaded) storage((store) => store.setItem(key, JSON.stringify(lines)))
  }, [key, lines, loaded])

  const cart: Cart = {
    lines,
    products,
    qty: (id) => lines.find((line) => line.id === id)?.qty ?? 0,
    set: (id, qty) =>
      setLines((current) => {
        const next = Math.max(0, Math.min(qty, MAX_QTY))
        if (!next) return current.filter((line) => line.id !== id)
        return current.some((line) => line.id === id)
          ? current.map((line) => (line.id === id ? { ...line, qty: next } : line))
          : [...current, { id, qty: next }]
      }),
    clear: () => setLines([]),
    open,
    setOpen,
  }

  return (
    <CartContext.Provider value={cart}>
      {children}
      <CartSheet shop={shop} />
      <CartBar />
    </CartContext.Provider>
  )
}

function Stepper({ product, size = 'default' }: { product: Product; size?: 'default' | 'small' }) {
  const { qty, set } = useCart()
  const count = qty(product.id)
  return (
    <div className="store-stepper" data-size={size} role="group" aria-label={`Quantity of ${product.name}`}>
      <button type="button" onClick={() => set(product.id, count - 1)} aria-label={count === 1 ? `Remove ${product.name}` : `One less ${product.name}`}>
        <Minus aria-hidden="true" />
      </button>
      <output aria-live="polite">{count}</output>
      <button type="button" onClick={() => set(product.id, count + 1)} disabled={count >= MAX_QTY} aria-label={`One more ${product.name}`}>
        <Plus aria-hidden="true" />
      </button>
    </div>
  )
}

export function AddToCart({ product }: { product: Product }) {
  const { qty, set } = useCart()
  if (!product.in_stock)
    return (
      <Button className="store-add" variant="outline" disabled>
        Out of stock
      </Button>
    )
  if (qty(product.id)) return <Stepper product={product} />
  return (
    <Button className="store-add" variant="outline" onClick={() => set(product.id, 1)}>
      <Plus aria-hidden="true" />
      Add<span className="sr-only"> {product.name} to cart</span>
    </Button>
  )
}

export function CartButton() {
  const { lines, setOpen } = useCart()
  const count = lines.reduce((sum, line) => sum + line.qty, 0)
  return (
    <Button className="store-cart-button" variant="outline" onClick={() => setOpen(true)}>
      <ShoppingBag aria-hidden="true" />
      <span className="store-cart-label">Cart</span>
      {count > 0 && <span className="store-cart-count">{count}</span>}
      <span className="sr-only">, {count} {count === 1 ? 'item' : 'items'}</span>
    </Button>
  )
}

/** Phones get a bottom bar once something is in the cart. */
function CartBar() {
  const { lines, products, open, setOpen } = useCart()
  const count = lines.reduce((sum, line) => sum + line.qty, 0)
  if (!count || open) return null
  return (
    <div className="store-cart-bar">
      <Button size="lg" onClick={() => setOpen(true)}>
        <span>
          {count} {count === 1 ? 'item' : 'items'} · {formatRupees(cartTotal(lines, products))}
        </span>
        <span>View cart</span>
      </Button>
    </div>
  )
}

type Placed = { id: number; total_paise: number; items: OrderLine[]; phone: string }

function CartSheet({ shop }: { shop: Shop }) {
  const { lines, products, open, setOpen, clear, set } = useCart()
  const [step, setStep] = useState<'cart' | 'details'>('cart')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState<Placed | null>(null)
  const byId = new Map(products.map((product) => [product.id, product]))
  const total = cartTotal(lines, products)

  function close(next: boolean) {
    setOpen(next)
    if (!next) {
      setStep('cart')
      setError('')
      setPlaced(null)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '').trim()
    const ref = freshRef(storage((store) => JSON.parse(store.getItem(`prebook-ref-${shop.slug}`) ?? 'null')))
    const order: OrderInput = { name: field('name'), phone: field('phone'), address: field('address'), note: field('note'), items: lines, ...(ref && { ref }) }
    setSending(true)
    setError('')
    try {
      const response = await fetch(`${eventsApi}/shops/${shop.slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error ?? 'Your order didn’t go through. Please try again.')
      setPlaced({ ...body.order, phone: order.phone })
      clear()
    } catch (problem) {
      setError(problem instanceof TypeError ? 'You seem to be offline. Check your connection and try again.' : String((problem as Error).message))
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="store-sheet" closeLabel="Close cart" aria-describedby={undefined}>
        {placed ? (
          <div className="store-placed">
            <SheetHeader>
              <SheetTitle>Order #{placed.id} placed</SheetTitle>
              <SheetDescription>
                {shop.name} will call {placed.phone} to confirm your order and delivery. Pay {formatRupees(placed.total_paise)} in cash when it arrives.
              </SheetDescription>
            </SheetHeader>
            <ul className="store-lines">
              {placed.items.map((line) => (
                <li key={line.id}>
                  <span>
                    {line.qty} × {line.name}
                    {line.size && <small> {line.size}</small>}
                  </span>
                  <span>{formatRupees(line.price_paise * line.qty)}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" onClick={() => close(false)}>
              Continue shopping
            </Button>
          </div>
        ) : lines.length === 0 ? (
          <div className="store-sheet-empty">
            <SheetHeader>
              <SheetTitle>Your cart is empty</SheetTitle>
              <SheetDescription>Add products from {shop.name} and they’ll appear here.</SheetDescription>
            </SheetHeader>
            <Button size="lg" variant="outline" onClick={() => close(false)}>
              Browse products
            </Button>
          </div>
        ) : step === 'cart' ? (
          <>
            <SheetHeader>
              <SheetTitle>Your cart</SheetTitle>
            </SheetHeader>
            <ul className="store-cart-lines">
              {lines.map((line) => {
                const product = byId.get(line.id)
                if (!product) return null
                return (
                  <li key={line.id}>
                    <div className="store-cart-thumb" aria-hidden="true">
                      {product.image ? <img src={imageUrl(product.image)} alt="" width={64} height={64} /> : product.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="store-cart-info">
                      <strong>{product.name}</strong>
                      <span>
                        {product.size && `${product.size} · `}
                        {formatRupees(product.price_paise)}
                      </span>
                      <Stepper product={product} size="small" />
                    </div>
                    <div className="store-cart-side">
                      <strong>{formatRupees(product.price_paise * line.qty)}</strong>
                      <button type="button" className="store-remove" onClick={() => set(product.id, 0)}>
                        <Trash2 aria-hidden="true" />
                        <span className="sr-only">Remove {product.name}</span>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="store-sheet-foot">
              <p className="store-total">
                <span>Total</span>
                <strong>{formatRupees(total)}</strong>
              </p>
              <p className="store-sheet-note">Cash on delivery. The shop confirms delivery details by phone.</p>
              <Button size="lg" onClick={() => setStep('details')}>
                Checkout
              </Button>
            </div>
          </>
        ) : (
          <form className="store-checkout" onSubmit={submit} aria-busy={sending}>
            <SheetHeader>
              <button type="button" className="store-back" onClick={() => setStep('cart')}>
                <ChevronLeft aria-hidden="true" />
                Back to cart
              </button>
              <SheetTitle>Delivery details</SheetTitle>
            </SheetHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="order-name">Full name</FieldLabel>
                <Input id="order-name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-phone">Mobile number</FieldLabel>
                <Input id="order-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required minLength={10} maxLength={16} />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-address">Delivery address</FieldLabel>
                <Textarea id="order-address" name="address" autoComplete="street-address" required minLength={10} maxLength={500} rows={3} />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-note">Note for the shop (optional)</FieldLabel>
                <Textarea id="order-note" name="note" maxLength={500} rows={2} />
              </Field>
            </FieldGroup>
            <div className="store-sheet-foot">
              <p className="store-total">
                <span>Pay on delivery</span>
                <strong>{formatRupees(total)}</strong>
              </p>
              {error && <FieldError>{error}</FieldError>}
              <Button size="lg" type="submit" disabled={sending}>
                {sending ? 'Placing order…' : `Place order · ${formatRupees(total)}`}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Scroll-snap strip, so banners still swipe without JavaScript; JS adds arrows, dots and autoplay. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const strip = useRef<HTMLUListElement>(null)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const many = banners.length > 1

  const go = (index: number) => {
    const el = strip.current
    if (!el) return
    const next = (index + banners.length) % banners.length
    el.scrollTo({ left: next * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    if (!many || paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => go(current + 1), 5000)
    return () => clearInterval(timer)
  })

  return (
    <section
      className="container store-banners"
      aria-roledescription="carousel"
      aria-label="Offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ul ref={strip} onScroll={(event) => setCurrent(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>
        {banners.map((banner, index) => (
          <li key={index} aria-roledescription="slide" aria-label={`${index + 1} of ${banners.length}`}>
            <figure>
              <img src={imageUrl(banner.image)} alt="" width={1200} height={480} loading={index ? 'lazy' : 'eager'} />
              {(banner.title || banner.subtitle) && (
                <figcaption>
                  {banner.title && <strong>{banner.title}</strong>}
                  {banner.subtitle && <span>{banner.subtitle}</span>}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
      {many && (
        <div className="store-banner-controls">
          <button type="button" onClick={() => go(current - 1)} aria-label="Previous offer">
            <ChevronLeft aria-hidden="true" />
          </button>
          <div className="store-dots">
            {banners.map((_, index) => (
              <button key={index} type="button" aria-label={`Show offer ${index + 1}`} aria-current={index === current} onClick={() => go(index)} />
            ))}
          </div>
          <button type="button" onClick={() => go(current + 1)} aria-label="Next offer">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}
