import { type Context, Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { timingSafeEqual } from 'hono/utils/buffer'

type Bindings = {
  DB: D1Database
  LIMITER: RateLimit
  ADMIN_LIMITER: RateLimit
  ADMIN_TOKEN: string
  ALLOWED_ORIGINS: string
}

const EVENT = 'helicopter-ride'
const COLUMNS = 'id, name, phone, email, address, passengers, status, payment_status, notes, created_at, updated_at'
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
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a 10-digit Indian mobile number.'
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return 'Enter a valid email address, or leave it blank.'
  if (address.length < 10 || address.length > 300) return 'Enter your full address with area and pincode.'
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

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', (c, next) =>
  cors({
    origin: c.env.ALLOWED_ORIGINS.split(','),
    allowMethods: ['GET', 'POST', 'PUT'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(c, next),
)

// Per-IP limits: a tight one for the public form, a roomier one for admin work and token guesses.
app.use('/registrations/*', bodyLimit({ maxSize: 8 * 1024 }), async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  const limiter = c.req.method === 'POST' ? c.env.LIMITER : c.env.ADMIN_LIMITER
  const { success } = await limiter.limit({ key: c.req.header('cf-connecting-ip') ?? 'unknown' })
  if (!success) return c.json({ error: 'Too many attempts. Please wait a minute and try again.' }, 429)
  return next()
})

const admin = bearerAuth({
  verifyToken: (token, c: Context<{ Bindings: Bindings }>) => timingSafeEqual(token, c.env.ADMIN_TOKEN),
})

app.post('/registrations', async (c) => {
  const registration = parseRegistration(await c.req.json().catch(() => null))
  if (typeof registration === 'string') return c.json({ error: registration }, 400)
  const { name, phone, email, address, passengers } = registration
  try {
    await c.env.DB.prepare(
      'INSERT INTO registrations (event, name, phone, email, address, passengers) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(EVENT, name, phone, email, address, passengers)
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

export default app
