// Shop affiliates: one login across shops, approved by each shop owner separately.
// The owner's side (approve, commission rate, per-affiliate totals) lives in shops.ts.
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { bearer, hashPassword, hex, newToken, now, sha256, verifyPassword } from './auth'
import type { Bindings } from './index'
import { AFFILIATE_ORDERS, AFFILIATE_STATS, asBody, mobile, SESSION_MS, text } from './shops'

type Env = { Bindings: Bindings; Variables: { partnerId: number; tokenHash: string } }
type Row = Record<string, unknown>

export type PartnerSignup = { name: string; phone: string; password: string }

export function parsePartnerSignup(input: unknown): PartnerSignup | string {
  const body = asBody(input)
  if (!body) return 'Send your details as JSON.'
  const name = text(body, 'name')
  const phone = mobile(text(body, 'phone'))
  const password = typeof body.password === 'string' ? body.password : ''
  if (name.length < 2 || name.length > 80) return 'Enter your name.'
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter your 10-digit mobile number.'
  if (password.length < 8 || password.length > 128) return 'Use a password of at least 8 characters.'
  return { name, phone, password }
}

const partners = new Hono<Env>()

const partner = createMiddleware<Env>(async (c, next) => {
  const token = bearer(c)
  if (!token) return c.json({ error: 'Sign in to your affiliate account.' }, 401)
  const tokenHash = await sha256(token)
  const session = await c.env.DB.prepare('SELECT partner_id FROM partner_sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, now())
    .first<{ partner_id: number }>()
  if (!session) return c.json({ error: 'Your session has ended. Sign in again.' }, 401)
  c.set('partnerId', session.partner_id)
  c.set('tokenHash', tokenHash)
  return next()
})

partners.use('/partner/*', partner)
partners.use('/partner-auth/logout', partner)

async function startSession(c: { env: Bindings }, partnerId: number) {
  const token = newToken()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM partner_sessions WHERE expires_at < ?').bind(now()),
    c.env.DB.prepare('INSERT INTO partner_sessions (token_hash, partner_id, expires_at) VALUES (?, ?, ?)').bind(
      await sha256(token),
      partnerId,
      new Date(Date.now() + SESSION_MS).toISOString(),
    ),
  ])
  return token
}

partners.post('/partner-auth/register', async (c) => {
  const signup = parsePartnerSignup(await c.req.json().catch(() => null))
  if (typeof signup === 'string') return c.json({ error: signup }, 400)
  // The code is the ?ref= in every link; 8 hex characters, retried on the rare clash.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const saved = await c.env.DB.prepare('INSERT INTO partners (name, phone, password_hash, code) VALUES (?, ?, ?, ?) RETURNING id')
        .bind(signup.name, signup.phone, await hashPassword(signup.password), hex(crypto.getRandomValues(new Uint8Array(4))))
        .first<{ id: number }>()
      return c.json({ token: await startSession(c, saved!.id) }, 201)
    } catch (error) {
      if (String(error).includes('partners.phone'))
        return c.json({ error: 'This mobile number already has an affiliate account. Sign in instead.' }, 409)
      if (!String(error).includes('partners.code')) throw error
    }
  }
  return c.json({ error: 'Couldn’t create your account. Please try again.' }, 503)
})

partners.post('/partner-auth/login', async (c) => {
  const body = asBody(await c.req.json().catch(() => null)) ?? {}
  const password = typeof body.password === 'string' ? body.password : ''
  const account = await c.env.DB.prepare('SELECT id, password_hash FROM partners WHERE phone = ?')
    .bind(mobile(text(body, 'phone')))
    .first<{ id: number; password_hash: string }>()
  if (!account || !(await verifyPassword(password, account.password_hash)))
    return c.json({ error: 'That mobile number or password isn’t right.' }, 401)
  return c.json({ token: await startSession(c, account.id) })
})

partners.post('/partner-auth/logout', async (c) => {
  await c.env.DB.prepare('DELETE FROM partner_sessions WHERE token_hash = ?').bind(c.get('tokenHash')).run()
  return c.body(null, 204)
})

/** Everything the affiliate dashboard shows. Customer details and owner contact never leave. */
partners.get('/partner/dashboard', async (c) => {
  const id = c.get('partnerId')
  const [me, shops, products, orders] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT name, phone, code FROM partners WHERE id = ?').bind(id),
    c.env.DB.prepare(
      `SELECT shops.id, shops.slug, shops.name, shops.theme, shops.logo, shops.commission_percent, partner_shops.status,
         partner_shops.created_at AS applied_at, ${AFFILIATE_STATS}
       FROM partner_shops JOIN shops ON shops.id = partner_shops.shop_id ${AFFILIATE_ORDERS}
       WHERE partner_shops.partner_id = ? AND shops.active = 1 GROUP BY shops.id ORDER BY shops.name`,
    ).bind(id),
    c.env.DB.prepare(
      `SELECT products.shop_id, products.id, products.kind, products.name, products.size, products.price_paise,
         products.image, products.in_stock
       FROM products JOIN partner_shops ON partner_shops.shop_id = products.shop_id
       WHERE partner_shops.partner_id = ? AND partner_shops.status = 'approved' ORDER BY products.sort, products.id`,
    ).bind(id),
    c.env.DB.prepare(
      `SELECT orders.id, shops.name AS shop, orders.total_paise, orders.commission_paise, orders.status, orders.created_at
       FROM orders JOIN shops ON shops.id = orders.shop_id
       WHERE orders.partner_id = ? ORDER BY orders.id DESC LIMIT 100`,
    ).bind(id),
  ])
  const byShop = new Map<unknown, Row[]>()
  for (const { shop_id, in_stock, ...product } of products.results as Row[])
    byShop.set(shop_id, [...(byShop.get(shop_id) ?? []), { ...product, in_stock: Boolean(in_stock) }])
  return c.json({
    affiliate: me.results[0],
    shops: (shops.results as Row[]).map(({ id: shopId, ...shop }) => ({ ...shop, products: byShop.get(shopId) ?? [] })),
    orders: orders.results,
  })
})

// Applying twice keeps the first answer, so a rejected affiliate can't re-apply around the owner.
partners.post('/partner/shops/:slug{[a-z0-9-]+}', async (c) => {
  const shop = await c.env.DB.prepare('SELECT id FROM shops WHERE slug = ? AND active = 1')
    .bind(c.req.param('slug'))
    .first<{ id: number }>()
  if (!shop) return c.json({ error: 'This shop isn’t available.' }, 404)
  await c.env.DB.prepare('INSERT OR IGNORE INTO partner_shops (partner_id, shop_id) VALUES (?, ?)').bind(c.get('partnerId'), shop.id).run()
  return c.body(null, 204)
})

export default partners
