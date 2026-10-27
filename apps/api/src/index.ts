import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import auth, { admin } from './auth'
import partners from './partners'
import shops from './shops'

export type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  LIMITER: RateLimit
  ADMIN_LIMITER: RateLimit
  ADMIN_TOKEN: string
  ALLOWED_ORIGINS: string
}

const EVENT = 'helicopter-ride'
const COLUMNS = 'id, name, phone, email, address, passengers, status, payment_status, notes, ref, created_at, updated_at'
export const STATUSES = ['new', 'contacted', 'confirmed', 'cancelled'] as const
export const PAYMENT_STATUSES = ['unpaid', 'paid'] as const

export type Registration = {
  name: string
  phone: string
  email: string | null
  address: string
  passengers: number
}

export function parseRegistration(input: unknown): Registration | string {
  if (!input || typeof input !== 'object') return 'Send the registration as JSON.'
  const body = input as Record<string, unknown>
  const text = (key: string) => (typeof body[key] === 'string' ? body[key].trim().replace(/\s+/g, ' ') : '')
  const name = text('name')
  const phone = text('phone').replace(/[\s-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '')
  const email = text('email') || null
  const address = text('address')
  const passengers = Number(body.passengers)
  if (name.length < 2 || name.length > 80) return 'Enter your full name.'
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name)) return 'Use letters only in the name, without numbers or symbols.'
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a 10-digit Indian mobile number.'
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return 'Enter a valid email address, or leave it blank.'
  if (address.length < 10 || address.length > 300) return 'Enter your full address with area and pincode.'
  if (!/\p{L}/u.test(address)) return 'Include the street and area in the address, not just numbers.'
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 6) return 'Choose between 1 and 6 passengers.'
  return { name, phone, email, address, passengers }
}

export type RegistrationUpdate = Registration & {
  status: (typeof STATUSES)[number]
  payment_status: (typeof PAYMENT_STATUSES)[number]
  notes: string
}

/** Admin edits re-check the contact fields so the team can correct details by phone. */
export function parseUpdate(input: unknown): RegistrationUpdate | string {
  const registration = parseRegistration(input)
  if (typeof registration === 'string') return registration
  const body = input as Record<string, unknown>
  const status = STATUSES.find((value) => value === body.status)
  const payment_status = PAYMENT_STATUSES.find((value) => value === body.payment_status)
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  if (!status) return 'Choose a valid status.'
  if (!payment_status) return 'Choose a valid payment status.'
  if (notes.length > 1000) return 'Keep notes under 1,000 characters.'
  return { ...registration, status, payment_status, notes }
}

export type Affiliate = { code: string; name: string }

/** The code becomes the `?ref=` in a shareable link, so it defaults to a slug of the name. */
export function parseAffiliate(input: unknown): Affiliate | string {
  if (!input || typeof input !== 'object') return 'Send the affiliate as JSON.'
  const body = input as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const given = typeof body.code === 'string' ? body.code.trim() : ''
  const code = (given || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
  if (name.length < 2 || name.length > 80) return 'Enter the affiliate’s name.'
  if (code.length < 2) return 'Add a link code using English letters or numbers.'
  return { code, name }
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', (c, next) =>
  cors({
    origin: c.env.ALLOWED_ORIGINS.split(','),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(c, next),
)

// Per-IP limits: a tight one for the public form and both sign-ins, a roomier one for admin work and token guesses.
const limit = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  const tight =
    c.req.method === 'POST' &&
    (['/registrations', '/shop-auth/login', '/admin-auth/login', '/partner-auth/login', '/partner-auth/register'].includes(c.req.path) || /^\/shops\/[a-z0-9-]+\/orders$/.test(c.req.path))
  const limiter = tight ? c.env.LIMITER : c.env.ADMIN_LIMITER
  const { success } = await limiter.limit({ key: c.req.header('cf-connecting-ip') ?? 'unknown' })
  if (!success) return c.json({ error: 'Too many attempts. Please wait a minute and try again.' }, 429)
  return next()
})
app.use('/registrations/*', bodyLimit({ maxSize: 8 * 1024 }), limit)
app.use('/affiliates/*', bodyLimit({ maxSize: 8 * 1024 }), limit)
app.use('/shop-auth/*', bodyLimit({ maxSize: 8 * 1024 }), limit)
app.use('/shops/:slug/orders', bodyLimit({ maxSize: 16 * 1024 }), limit)
app.use('/owner/*', limit)
app.use('/partner-auth/*', bodyLimit({ maxSize: 8 * 1024 }), limit)
app.use('/partner/*', bodyLimit({ maxSize: 8 * 1024 }), limit)

app.use('/admin-auth/*', bodyLimit({ maxSize: 8 * 1024 }), limit)
app.use('/admin/*', bodyLimit({ maxSize: 8 * 1024 }), limit, admin)

app.route('/', auth)
app.route('/', shops)
app.route('/', partners)

app.post('/registrations', async (c) => {
  const body = await c.req.json().catch(() => null)
  const registration = parseRegistration(body)
  if (typeof registration === 'string') return c.json({ error: registration }, 400)
  const { name, phone, email, address, passengers } = registration
  // An unknown or missing ?ref= still registers, just without an affiliate.
  const ref = typeof body.ref === 'string' ? body.ref.trim().toLowerCase() : ''
  try {
    await c.env.DB.prepare(
      `INSERT INTO registrations (event, name, phone, email, address, passengers, ref)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT code FROM affiliates WHERE code = ?))`,
    )
      .bind(EVENT, name, phone, email, address, passengers, ref)
      .run()
  } catch (error) {
    if (String(error).includes('UNIQUE')) return c.json({ error: 'This mobile number is already registered.' }, 409)
    throw error
  }
  return c.json({ ok: true }, 201)
})

app.get('/registrations', admin, async (c) => {
  // ponytail: one unpaginated read, add cursor paging past a few thousand rows.
  const { results } = await c.env.DB.prepare(
    `SELECT ${COLUMNS} FROM registrations WHERE event = ? ORDER BY id DESC LIMIT 5000`,
  )
    .bind(EVENT)
    .all()
  return c.json({ registrations: results })
})

// ponytail: last write wins between two staff editing one row, add a version check if that bites.
app.put('/registrations/:id{[0-9]+}', admin, async (c) => {
  const update = parseUpdate(await c.req.json().catch(() => null))
  if (typeof update === 'string') return c.json({ error: update }, 400)
  const { name, phone, email, address, passengers, status, payment_status, notes } = update
  try {
    const registration = await c.env.DB.prepare(
      `UPDATE registrations SET name = ?, phone = ?, email = ?, address = ?, passengers = ?, status = ?,
        payment_status = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ? AND event = ? RETURNING ${COLUMNS}`,
    )
      .bind(name, phone, email, address, passengers, status, payment_status, notes, Number(c.req.param('id')), EVENT)
      .first()
    if (!registration) return c.json({ error: 'This registration no longer exists.' }, 404)
    return c.json({ registration })
  } catch (error) {
    if (String(error).includes('UNIQUE')) return c.json({ error: 'Another registration already uses this mobile number.' }, 409)
    throw error
  }
})

app.get('/affiliates', admin, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT code, name, created_at FROM affiliates ORDER BY created_at').all()
  return c.json({ affiliates: results })
})

app.post('/affiliates', admin, async (c) => {
  const affiliate = parseAffiliate(await c.req.json().catch(() => null))
  if (typeof affiliate === 'string') return c.json({ error: affiliate }, 400)
  try {
    const saved = await c.env.DB.prepare('INSERT INTO affiliates (code, name) VALUES (?, ?) RETURNING code, name, created_at')
      .bind(affiliate.code, affiliate.name)
      .first()
    return c.json({ affiliate: saved }, 201)
  } catch (error) {
    if (String(error).includes('UNIQUE')) return c.json({ error: `The link code “${affiliate.code}” is already used.` }, 409)
    throw error
  }
})

app.put('/affiliates/:code{[a-z0-9-]+}', admin, async (c) => {
  const code = c.req.param('code')
  const affiliate = parseAffiliate({ ...(await c.req.json().catch(() => null)), code })
  if (typeof affiliate === 'string') return c.json({ error: affiliate }, 400)
  const saved = await c.env.DB.prepare('UPDATE affiliates SET name = ? WHERE code = ? RETURNING code, name, created_at')
    .bind(affiliate.name, code)
    .first()
  if (!saved) return c.json({ error: 'This affiliate no longer exists.' }, 404)
  return c.json({ affiliate: saved })
})

// Registrations stay; they just stop counting for the deleted affiliate.
app.delete('/affiliates/:code{[a-z0-9-]+}', admin, async (c) => {
  const code = c.req.param('code')
  const [, removed] = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE registrations SET ref = NULL WHERE ref = ?').bind(code),
    c.env.DB.prepare('DELETE FROM affiliates WHERE code = ?').bind(code),
  ])
  if (!removed.meta.changes) return c.json({ error: 'This affiliate no longer exists.' }, 404)
  return c.body(null, 204)
})

app.delete('/registrations/:id{[0-9]+}', admin, async (c) => {
  const { meta } = await c.env.DB.prepare('DELETE FROM registrations WHERE id = ? AND event = ?')
    .bind(Number(c.req.param('id')), EVENT)
    .run()
  if (!meta.changes) return c.json({ error: 'This registration no longer exists.' }, 404)
  return c.body(null, 204)
})

export default app
