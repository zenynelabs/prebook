import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { bearer, hashPassword, newToken, now, sha256, verifyPassword } from './auth'
import type { Bindings } from './index'

export const THEMES = ['teal', 'green', 'saffron', 'maroon', 'indigo'] as const
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_IMAGE = 2 * 1024 * 1024
const MAX_PAISE = 1_00_00_000_00 // ₹1 crore
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

type Env = { Bindings: Bindings; Variables: { shopId: number; tokenHash: string } }
type Body = Record<string, unknown>
type Row = Record<string, unknown>

export const asBody = (input: unknown) => (input && typeof input === 'object' && !Array.isArray(input) ? (input as Body) : null)
export const text = (body: Body, key: string) => (typeof body[key] === 'string' ? body[key].trim().replace(/\s+/g, ' ') : '')
/** Indian mobile as 10 digits; the +91 / 0 prefix and spaces are dropped. */
export const mobile = (value: string) => value.replace(/[\s-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '')
const isPaise = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= MAX_PAISE
/** Keys come only from our own upload route, so a shop can't point at another shop's images. */
const isImage = (value: unknown, shopId: number) =>
  typeof value === 'string' && new RegExp(`^shops/${shopId}/[0-9a-f-]{36}\\.(?:webp|jpg|png)$`).test(value)

/** The slug is the shop's URL and login name, so it follows the affiliate-code rule. */
export const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

export type ShopAccount = {
  name: string
  slug: string
  owner_name: string
  owner_phone: string
  active: boolean
  password: string | null
}

/** Admin fields. On update a blank slug or password keeps the old one. */
export function parseShopAccount(input: unknown, creating: boolean): ShopAccount | string {
  const body = asBody(input)
  if (!body) return 'Send the shop as JSON.'
  const name = text(body, 'name')
  const slug = slugify(text(body, 'slug') || (creating ? name : ''))
  const owner_name = text(body, 'owner_name')
  const owner_phone = mobile(text(body, 'owner_phone'))
  const password = typeof body.password === 'string' ? body.password : ''
  if (name.length < 2 || name.length > 80) return 'Enter the shop name.'
  if ((creating || text(body, 'slug')) && slug.length < 2) return 'Add a shop link using English letters or numbers.'
  if (owner_name.length < 2 || owner_name.length > 80) return 'Enter the owner’s name.'
  if (!/^[6-9]\d{9}$/.test(owner_phone)) return 'Enter the owner’s 10-digit mobile number.'
  if ((creating || password) && (password.length < 8 || password.length > 128))
    return 'Use a password of at least 8 characters.'
  return { name, slug, owner_name, owner_phone, active: body.active !== false, password: password || null }
}

export type Banner = { image: string; title: string; subtitle: string }
export type Faq = { question: string; answer: string }
export type ShopSettings = {
  name: string
  tagline: string
  theme: (typeof THEMES)[number]
  logo: string | null
  banners: Banner[]
  faqs: Faq[]
}

export function parseShopSettings(input: unknown, shopId: number): ShopSettings | string {
  const body = asBody(input)
  if (!body) return 'Send the shop settings as JSON.'
  const name = text(body, 'name')
  const tagline = text(body, 'tagline')
  const theme = THEMES.find((value) => value === body.theme)
  const logo = body.logo || null
  if (name.length < 2 || name.length > 80) return 'Enter the shop name.'
  if (tagline.length > 160) return 'Keep the tagline under 160 characters.'
  if (!theme) return 'Choose a theme.'
  if (logo !== null && !isImage(logo, shopId)) return 'Upload the logo again.'
  if (!Array.isArray(body.banners) || body.banners.length > 5) return 'Add up to 5 banners.'
  const banners: Banner[] = []
  for (const item of body.banners) {
    const banner = asBody(item)
    if (!banner || !isImage(banner.image, shopId)) return 'Every banner needs an image.'
    const title = text(banner, 'title')
    const subtitle = text(banner, 'subtitle')
    if (title.length > 80) return 'Keep banner titles under 80 characters.'
    if (subtitle.length > 160) return 'Keep banner subtitles under 160 characters.'
    banners.push({ image: banner.image as string, title, subtitle })
  }
  // An absent list saves as empty so clients that predate FAQs can still save.
  const rawFaqs = body.faqs ?? []
  if (!Array.isArray(rawFaqs) || rawFaqs.length > 10) return 'Add up to 10 questions.'
  const faqs: Faq[] = []
  for (const item of rawFaqs) {
    const faq = asBody(item)
    const question = faq ? text(faq, 'question') : ''
    const answer = faq && typeof faq.answer === 'string' ? faq.answer.trim() : ''
    if (question.length < 2 || question.length > 160) return 'Keep each question between 2 and 160 characters.'
    if (answer.length < 2 || answer.length > 1000) return 'Keep each answer between 2 and 1,000 characters.'
    faqs.push({ question, answer })
  }
  return { name, tagline, theme, logo: logo as string | null, banners, faqs }
}

export type OrderInput = { name: string; phone: string; address: string; note: string; items: { id: number; qty: number }[] }

/** Customer details and cart lines only; prices are never read from the client. */
export function parseOrder(input: unknown): OrderInput | string {
  const body = asBody(input)
  if (!body) return 'Send the order as JSON.'
  const name = text(body, 'name')
  const phone = mobile(text(body, 'phone'))
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  if (name.length < 2 || name.length > 80) return 'Enter your name.'
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter your 10-digit mobile number.'
  if (address.length < 10 || address.length > 500) return 'Enter your full delivery address.'
  if (note.length > 500) return 'Keep the note under 500 characters.'
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return 'Add 1 to 50 items to your cart.'
  const items: OrderInput['items'] = []
  for (const entry of body.items) {
    const line = asBody(entry)
    const id = line?.id
    const qty = line?.qty
    if (!Number.isSafeInteger(id) || (id as number) < 1) return 'Some items are no longer available. Refresh and try again.'
    if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > 99) return 'Quantities must be 1 to 99.'
    if (items.some((existing) => existing.id === id)) return 'Each item appears once in your cart.'
    items.push({ id: id as number, qty: qty as number })
  }
  return { name, phone, address, note, items }
}

export type OrderLine = { id: number; kind: 'product' | 'combo'; name: string; size: string; qty: number; price_paise: number }

export type ProductInput = {
  kind: 'product' | 'combo'
  name: string
  category: string
  description: string
  size: string
  price_paise: number
  mrp_paise: number | null
  image: string | null
  in_stock: boolean
  sort: number
  items: { id: number; qty: number }[]
}

export function parseProduct(input: unknown, shopId: number): ProductInput | string {
  const body = asBody(input)
  if (!body) return 'Send the product as JSON.'
  const kind = body.kind === 'product' || body.kind === 'combo' ? body.kind : null
  const name = text(body, 'name')
  const category = text(body, 'category')
  const size = text(body, 'size')
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const price = body.price_paise
  const mrp = body.mrp_paise ?? null
  const image = body.image || null
  const sort = body.sort ?? 0
  if (!kind) return 'Choose product or combo.'
  if (name.length < 2 || name.length > 100) return 'Enter the product name.'
  if (category.length > 40) return 'Keep the category under 40 characters.'
  if (size.length > 40) return 'Keep the size or pack under 40 characters.'
  if (description.length > 1000) return 'Keep the description under 1,000 characters.'
  if (!isPaise(price)) return 'Enter a valid price.'
  if (mrp !== null && (!isPaise(mrp) || mrp < price)) return 'MRP must be at least the selling price.'
  if (image !== null && !isImage(image, shopId)) return 'Upload the image again.'
  if (!Number.isSafeInteger(sort) || Math.abs(sort as number) > 100_000) return 'Sort order must be a whole number.'
  const items: ProductInput['items'] = []
  if (kind === 'combo') {
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20)
      return 'Add 1 to 20 products to the combo.'
    for (const entry of body.items) {
      const item = asBody(entry)
      const id = item?.id
      const qty = item?.qty
      if (!Number.isSafeInteger(id) || (id as number) < 1) return 'Choose products for the combo again.'
      if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > 99) return 'Combo quantities must be 1 to 99.'
      if (items.some((existing) => existing.id === id)) return 'Each product appears once in a combo.'
      items.push({ id: id as number, qty: qty as number })
    }
  }
  return {
    kind,
    name,
    category,
    description,
    size,
    price_paise: price,
    mrp_paise: mrp as number | null,
    image: image as string | null,
    in_stock: body.in_stock !== false,
    sort: sort as number,
    items,
  }
}

const SHOP_COLUMNS = 'slug, name, tagline, theme, logo, banners, faqs'
const ADMIN_COLUMNS = `id, ${SHOP_COLUMNS}, owner_name, owner_phone, active, created_at,
  (SELECT COUNT(*) FROM products WHERE products.shop_id = shops.id) AS products`
const PRODUCT_COLUMNS =
  'id, kind, name, category, description, size, price_paise, mrp_paise, image, in_stock, sort, items, created_at, updated_at'

/** Picks fields one by one so owner phone and password hash never leave by accident. */
/** Per affiliate and shop, after `LEFT JOIN orders ON <same affiliate and shop> AND orders.status != 'cancelled'`. */
export const AFFILIATE_STATS = `COUNT(orders.id) AS orders, COALESCE(SUM(orders.total_paise), 0) AS sales_paise,
  COALESCE(SUM(CASE WHEN orders.status = 'delivered' THEN orders.commission_paise END), 0) AS earned_paise,
  COALESCE(SUM(CASE WHEN orders.status != 'delivered' THEN orders.commission_paise END), 0) AS pending_paise`
export const AFFILIATE_ORDERS = `LEFT JOIN orders ON orders.partner_id = partner_shops.partner_id
  AND orders.shop_id = partner_shops.shop_id AND orders.status != 'cancelled'`

const toShop = (row: Row) => ({
  slug: row.slug,
  name: row.name,
  tagline: row.tagline,
  theme: row.theme,
  logo: row.logo,
  banners: JSON.parse(String(row.banners)),
  faqs: JSON.parse(String(row.faqs)),
})
const toAdminShop = (row: Row) => ({
  ...toShop(row),
  id: row.id,
  owner_name: row.owner_name,
  owner_phone: row.owner_phone,
  active: Boolean(row.active),
  products: row.products,
  created_at: row.created_at,
})
const ORDER_SELECT = `SELECT orders.id, customer_name, customer_phone, address, note, items, total_paise, payment_method,
  payment_status, status, orders.created_at, updated_at, commission_paise, partners.name AS affiliate
  FROM orders LEFT JOIN partners ON partners.id = orders.partner_id`
const toOrder = (row: Row) => ({ ...row, items: JSON.parse(String(row.items)) })
const toProduct = (row: Row) => ({ ...row, in_stock: Boolean(row.in_stock), items: JSON.parse(String(row.items)) })

const shops = new Hono<Env>()

export const owner = createMiddleware<Env>(async (c, next) => {
  const token = bearer(c)
  if (!token) return c.json({ error: 'Sign in to your shop.' }, 401)
  const tokenHash = await sha256(token)
  const session = await c.env.DB.prepare(
    `SELECT shops.id FROM shop_sessions JOIN shops ON shops.id = shop_sessions.shop_id
     WHERE token_hash = ? AND expires_at > ? AND shops.active = 1`,
  )
    .bind(tokenHash, now())
    .first<{ id: number }>()
  if (!session) return c.json({ error: 'Your session has ended. Sign in again.' }, 401)
  c.set('shopId', session.id)
  c.set('tokenHash', tokenHash)
  return next()
})

shops.use('/owner/*', (c, next) =>
  bodyLimit({ maxSize: c.req.path === '/owner/images' ? MAX_IMAGE + 64 * 1024 : 16 * 1024 })(c, next),
)
shops.use('/owner/*', owner)
shops.use('/shop-auth/logout', owner)

// --- Public storefront and images ---

// The public directory behind the homepage's Shops link.
shops.get('/shops', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT ${SHOP_COLUMNS} FROM shops WHERE active = 1 ORDER BY name`).all()
  return c.json({ shops: results.map(toShop) })
})

shops.get('/shops/:slug{[a-z0-9-]+}', async (c) => {
  const shop = await c.env.DB.prepare(`SELECT id, ${SHOP_COLUMNS} FROM shops WHERE slug = ? AND active = 1`)
    .bind(c.req.param('slug'))
    .first()
  if (!shop) return c.json({ error: 'This shop isn’t available.' }, 404)
  const { results } = await c.env.DB.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE shop_id = ? ORDER BY sort, id`)
    .bind(shop.id)
    .all()
  return c.json({ shop: toShop(shop), products: results.map(toProduct) })
})

// ponytail: no per-phone or per-shop order cap beyond the IP limiter; add one if a shop gets spammed.
shops.post('/shops/:slug{[a-z0-9-]+}/orders', async (c) => {
  const input = await c.req.json().catch(() => null)
  const order = parseOrder(input)
  if (typeof order === 'string') return c.json({ error: order }, 400)
  const shop = await c.env.DB.prepare('SELECT id, commission_percent FROM shops WHERE slug = ? AND active = 1')
    .bind(c.req.param('slug'))
    .first<{ id: number; commission_percent: number }>()
  if (!shop) return c.json({ error: 'This shop isn’t available.' }, 404)
  // Only this shop's own products can be found, so another shop's ids read as unavailable.
  const { results } = await c.env.DB.prepare(
    `SELECT id, kind, name, size, price_paise, in_stock FROM products
     WHERE shop_id = ? AND id IN (SELECT value FROM json_each(?))`,
  )
    .bind(shop.id, JSON.stringify(order.items.map((item) => item.id)))
    .all<Row>()
  const byId = new Map(results.map((row) => [row.id, row]))
  const lines: OrderLine[] = []
  for (const { id, qty } of order.items) {
    const product = byId.get(id)
    if (!product) return c.json({ error: 'Some items are no longer available. Refresh and try again.' }, 409)
    if (!product.in_stock) return c.json({ error: `${product.name} is out of stock. Remove it and try again.` }, 409)
    lines.push({ id, kind: product.kind as OrderLine['kind'], name: String(product.name), size: String(product.size), qty, price_paise: product.price_paise as number })
  }
  const total = lines.reduce((sum, line) => sum + line.price_paise * line.qty, 0)
  // An affiliate link credits the order only if this shop approved that affiliate, and never their own order.
  // An unknown or stale ?ref= still places the order, just without an affiliate.
  const ref = asBody(input)?.ref
  const partner =
    typeof ref === 'string' && /^[0-9a-f]{8}$/.test(ref)
      ? await c.env.DB.prepare(
          `SELECT partners.id FROM partners JOIN partner_shops ON partner_shops.partner_id = partners.id
           WHERE partners.code = ? AND partner_shops.shop_id = ? AND partner_shops.status = 'approved' AND partners.phone != ?`,
        )
          .bind(ref, shop.id, order.phone)
          .first<{ id: number }>()
      : null
  const commission = partner ? Math.floor((total * (shop.commission_percent ?? 0)) / 100) : 0
  const saved = await c.env.DB.prepare(
    `INSERT INTO orders (shop_id, customer_name, customer_phone, address, note, items, total_paise, partner_id, commission_paise)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(shop.id, order.name, order.phone, order.address, order.note, JSON.stringify(lines), total, partner?.id ?? null, commission)
    .first<{ id: number }>()
  return c.json({ order: { id: saved!.id, total_paise: total, items: lines } }, 201)
})

shops.get('/images/shops/:shop{[0-9]+}/:file{[0-9a-f-]{36}\\.(?:webp|jpg|png)}', async (c) => {
  const object = await c.env.IMAGES.get(`shops/${c.req.param('shop')}/${c.req.param('file')}`)
  if (!object) return c.notFound()
  return c.body(object.body, 200, {
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
  })
})

// --- Shop owner sign-in ---

shops.post('/shop-auth/login', async (c) => {
  const body = asBody(await c.req.json().catch(() => null)) ?? {}
  const password = typeof body.password === 'string' ? body.password : ''
  const shop = await c.env.DB.prepare(`SELECT id, password_hash, active, ${SHOP_COLUMNS} FROM shops WHERE slug = ?`)
    .bind(slugify(text(body, 'slug')))
    .first()
  if (!shop || !(await verifyPassword(password, String(shop.password_hash))))
    return c.json({ error: 'That shop link or password isn’t right.' }, 401)
  if (!shop.active) return c.json({ error: 'This shop is switched off. Please contact PreBooking.' }, 401)
  const token = newToken()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM shop_sessions WHERE expires_at < ?').bind(now()),
    c.env.DB.prepare('INSERT INTO shop_sessions (token_hash, shop_id, expires_at) VALUES (?, ?, ?)').bind(
      await sha256(token),
      shop.id,
      new Date(Date.now() + SESSION_MS).toISOString(),
    ),
  ])
  return c.json({ token, shop: toShop(shop) })
})

shops.post('/shop-auth/logout', async (c) => {
  await c.env.DB.prepare('DELETE FROM shop_sessions WHERE token_hash = ?').bind(c.get('tokenHash')).run()
  return c.body(null, 204)
})

// --- Shop owner dashboard: every query is scoped to the signed-in shop ---

shops.put('/owner/password', async (c) => {
  const body = asBody(await c.req.json().catch(() => null)) ?? {}
  const current = typeof body.current === 'string' ? body.current : ''
  const next = typeof body.next === 'string' ? body.next : ''
  if (next.length < 8 || next.length > 128) return c.json({ error: 'Use a new password of at least 8 characters.' }, 400)
  const shop = await c.env.DB.prepare('SELECT password_hash FROM shops WHERE id = ?').bind(c.get('shopId')).first()
  if (!shop || !(await verifyPassword(current, String(shop.password_hash))))
    return c.json({ error: 'Your current password isn’t right.' }, 400)
  // Other devices are signed out; this one stays in.
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE shops SET password_hash = ? WHERE id = ?').bind(await hashPassword(next), c.get('shopId')),
    c.env.DB.prepare('DELETE FROM shop_sessions WHERE shop_id = ? AND token_hash != ?').bind(c.get('shopId'), c.get('tokenHash')),
  ])
  return c.body(null, 204)
})

shops.get('/owner/shop', async (c) => {
  const id = c.get('shopId')
  const [shop, products] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT ${SHOP_COLUMNS} FROM shops WHERE id = ?`).bind(id),
    c.env.DB.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE shop_id = ? ORDER BY sort, id`).bind(id),
  ])
  return c.json({ shop: toShop(shop.results[0] as Row), products: (products.results as Row[]).map(toProduct) })
})

shops.put('/owner/shop', async (c) => {
  const settings = parseShopSettings(await c.req.json().catch(() => null), c.get('shopId'))
  if (typeof settings === 'string') return c.json({ error: settings }, 400)
  const { name, tagline, theme, logo, banners, faqs } = settings
  const shop = await c.env.DB.prepare(
    `UPDATE shops SET name = ?, tagline = ?, theme = ?, logo = ?, banners = ?, faqs = ?, updated_at = ?
     WHERE id = ? RETURNING ${SHOP_COLUMNS}`,
  )
    .bind(name, tagline, theme, logo, JSON.stringify(banners), JSON.stringify(faqs), now(), c.get('shopId'))
    .first()
  return c.json({ shop: toShop(shop as Row) })
})

/** Combos may only bundle this shop's own products (never another combo, never itself). */
async function comboProblem(c: Context<Env>, product: ProductInput, self: number | null) {
  if (product.kind !== 'combo') return null
  const ids = product.items.map((item) => item.id)
  const found = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM products
     WHERE shop_id = ? AND kind = 'product' AND id IS NOT ? AND id IN (SELECT value FROM json_each(?))`,
  )
    .bind(c.get('shopId'), self, JSON.stringify(ids))
    .first<{ n: number }>()
  return found?.n === ids.length ? null : 'A combo can only include your own products. Refresh and try again.'
}

const productValues = (p: ProductInput) =>
  [p.kind, p.name, p.category, p.description, p.size, p.price_paise, p.mrp_paise, p.image, Number(p.in_stock), p.sort, JSON.stringify(p.items)]

// ponytail: no per-shop product cap, add one if a shop's storefront payload gets heavy.
shops.post('/owner/products', async (c) => {
  const product = parseProduct(await c.req.json().catch(() => null), c.get('shopId'))
  if (typeof product === 'string') return c.json({ error: product }, 400)
  const problem = await comboProblem(c, product, null)
  if (problem) return c.json({ error: problem }, 400)
  const saved = await c.env.DB.prepare(
    `INSERT INTO products (shop_id, kind, name, category, description, size, price_paise, mrp_paise, image, in_stock, sort, items)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${PRODUCT_COLUMNS}`,
  )
    .bind(c.get('shopId'), ...productValues(product))
    .first()
  return c.json({ product: toProduct(saved as Row) }, 201)
})

shops.put('/owner/products/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'))
  const product = parseProduct(await c.req.json().catch(() => null), c.get('shopId'))
  if (typeof product === 'string') return c.json({ error: product }, 400)
  const problem = await comboProblem(c, product, id)
  if (problem) return c.json({ error: problem }, 400)
  const saved = await c.env.DB.prepare(
    `UPDATE products SET kind = ?, name = ?, category = ?, description = ?, size = ?, price_paise = ?, mrp_paise = ?,
       image = ?, in_stock = ?, sort = ?, items = ?, updated_at = ?
     WHERE id = ? AND shop_id = ? RETURNING ${PRODUCT_COLUMNS}`,
  )
    .bind(...productValues(product), now(), id, c.get('shopId'))
    .first()
  if (!saved) return c.json({ error: 'This product no longer exists.' }, 404)
  return c.json({ product: toProduct(saved) })
})

// ponytail: a deleted product's image stays in R2 until the shop is deleted; sweep by prefix if storage grows.
// Combos that included the product keep their other items.
shops.delete('/owner/products/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'))
  const [{ meta }] = await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM products WHERE id = ? AND shop_id = ?').bind(id, c.get('shopId')),
    c.env.DB.prepare(
      `UPDATE products SET items = (SELECT json_group_array(json(value)) FROM json_each(items) WHERE value ->> '$.id' != ?)
       WHERE shop_id = ? AND kind = 'combo'`,
    ).bind(id, c.get('shopId')),
  ])
  if (!meta.changes) return c.json({ error: 'This product no longer exists.' }, 404)
  return c.body(null, 204)
})

const STATUSES = ['new', 'confirmed', 'delivered', 'cancelled']

// ponytail: newest 200 only; add ?before=<id> paging when a shop outgrows it.
shops.get('/owner/orders', async (c) => {
  const { results } = await c.env.DB.prepare(`${ORDER_SELECT} WHERE shop_id = ? ORDER BY orders.id DESC LIMIT 200`)
    .bind(c.get('shopId'))
    .all()
  return c.json({ orders: results.map(toOrder) })
})

// Cash on delivery: the order counts as paid once it is delivered.
shops.put('/owner/orders/:id{[0-9]+}', async (c) => {
  const status = asBody(await c.req.json().catch(() => null))?.status
  if (typeof status !== 'string' || !STATUSES.includes(status)) return c.json({ error: 'Choose an order status.' }, 400)
  const id = Number(c.req.param('id'))
  const [{ meta }, saved] = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ? AND shop_id = ?').bind(
      status,
      status === 'delivered' ? 'paid' : 'pending',
      now(),
      id,
      c.get('shopId'),
    ),
    c.env.DB.prepare(`${ORDER_SELECT} WHERE orders.id = ? AND shop_id = ?`).bind(id, c.get('shopId')),
  ])
  if (!meta.changes) return c.json({ error: 'This order no longer exists.' }, 404)
  return c.json({ order: toOrder(saved.results[0] as Row) })
})

// --- Affiliates who applied to this shop. The owner sees their mobile to settle commission offline. ---

shops.get('/owner/affiliates', async (c) => {
  const id = c.get('shopId')
  const [shop, affiliates] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT commission_percent FROM shops WHERE id = ?').bind(id),
    c.env.DB.prepare(
      `SELECT partners.id, partners.name, partners.phone, partners.code, partner_shops.status,
         partner_shops.created_at AS applied_at, ${AFFILIATE_STATS}
       FROM partner_shops JOIN partners ON partners.id = partner_shops.partner_id ${AFFILIATE_ORDERS}
       WHERE partner_shops.shop_id = ? GROUP BY partners.id
       ORDER BY partner_shops.status = 'pending' DESC, partner_shops.created_at DESC`,
    ).bind(id),
  ])
  return c.json({ commission_percent: (shop.results[0] as Row).commission_percent, affiliates: affiliates.results })
})

// Approve, reject, or later revoke. Orders already credited keep their commission.
shops.put('/owner/affiliates/:id{[0-9]+}', async (c) => {
  const status = asBody(await c.req.json().catch(() => null))?.status
  if (status !== 'approved' && status !== 'rejected') return c.json({ error: 'Choose approve or reject.' }, 400)
  const { meta } = await c.env.DB.prepare('UPDATE partner_shops SET status = ?, updated_at = ? WHERE partner_id = ? AND shop_id = ?')
    .bind(status, now(), Number(c.req.param('id')), c.get('shopId'))
    .run()
  if (!meta.changes) return c.json({ error: 'This affiliate hasn’t applied to your shop.' }, 404)
  return c.json({ status })
})

shops.put('/owner/commission', async (c) => {
  const percent = asBody(await c.req.json().catch(() => null))?.commission_percent
  if (!Number.isInteger(percent) || (percent as number) < 0 || (percent as number) > 50)
    return c.json({ error: 'Enter a whole-number commission from 0 to 50%.' }, 400)
  await c.env.DB.prepare('UPDATE shops SET commission_percent = ?, updated_at = ? WHERE id = ?').bind(percent, now(), c.get('shopId')).run()
  return c.json({ commission_percent: percent })
})

shops.post('/owner/images', async (c) => {
  const file = (await c.req.parseBody().catch(() => ({}) as Record<string, unknown>)).file
  if (!(file instanceof File)) return c.json({ error: 'Choose an image to upload.' }, 400)
  const extension = IMAGE_TYPES[file.type]
  if (!extension) return c.json({ error: 'Upload a JPG, PNG or WebP image.' }, 400)
  if (file.size > MAX_IMAGE) return c.json({ error: 'Images must be under 2 MB.' }, 413)
  const key = `shops/${c.get('shopId')}/${crypto.randomUUID()}.${extension}`
  await c.env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  return c.json({ key }, 201)
})

// --- PreBooking admin (signed in staff or ADMIN_TOKEN, checked in index.ts) ---

shops.get('/admin/shops', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT ${ADMIN_COLUMNS} FROM shops ORDER BY id DESC`).all()
  return c.json({ shops: results.map(toAdminShop) })
})

shops.post('/admin/shops', async (c) => {
  const account = parseShopAccount(await c.req.json().catch(() => null), true)
  if (typeof account === 'string') return c.json({ error: account }, 400)
  try {
    const shop = await c.env.DB.prepare(
      `INSERT INTO shops (slug, name, owner_name, owner_phone, password_hash, active)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING ${ADMIN_COLUMNS}`,
    )
      .bind(account.slug, account.name, account.owner_name, account.owner_phone, await hashPassword(account.password!), Number(account.active))
      .first()
    return c.json({ shop: toAdminShop(shop as Row) }, 201)
  } catch (error) {
    if (String(error).includes('UNIQUE')) return c.json({ error: `The shop link “${account.slug}” is already used.` }, 409)
    throw error
  }
})

shops.put('/admin/shops/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'))
  const account = parseShopAccount(await c.req.json().catch(() => null), false)
  if (typeof account === 'string') return c.json({ error: account }, 400)
  const hash = account.password && (await hashPassword(account.password))
  const shop = await c.env.DB.prepare(
    `UPDATE shops SET slug = COALESCE(NULLIF(?, ''), slug), name = ?, owner_name = ?, owner_phone = ?, active = ?,
       password_hash = COALESCE(?, password_hash), updated_at = ?
     WHERE id = ? RETURNING ${ADMIN_COLUMNS}`,
  )
    .bind(account.slug, account.name, account.owner_name, account.owner_phone, Number(account.active), hash || null, now(), id)
    .first()
    .catch((error) => {
      if (String(error).includes('UNIQUE')) return 'taken' as const
      throw error
    })
  if (shop === 'taken') return c.json({ error: `The shop link “${account.slug}” is already used.` }, 409)
  if (!shop) return c.json({ error: 'This shop no longer exists.' }, 404)
  // A reset password signs the owner out everywhere.
  if (hash) await c.env.DB.prepare('DELETE FROM shop_sessions WHERE shop_id = ?').bind(id).run()
  return c.json({ shop: toAdminShop(shop) })
})

shops.delete('/admin/shops/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'))
  const [, , , , removed] = await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM orders WHERE shop_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM partner_shops WHERE shop_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM products WHERE shop_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM shop_sessions WHERE shop_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM shops WHERE id = ?').bind(id),
  ])
  if (!removed.meta.changes) return c.json({ error: 'This shop no longer exists.' }, 404)
  // ponytail: one list page (1,000 images); loop on `truncated` if a shop ever holds more.
  const { objects } = await c.env.IMAGES.list({ prefix: `shops/${id}/` })
  if (objects.length) await c.env.IMAGES.delete(objects.map((object) => object.key))
  return c.body(null, 204)
})

export default shops
