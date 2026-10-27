import { type Context, Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { timingSafeEqual } from 'hono/utils/buffer'
import type { Bindings } from './index'

const ITERATIONS = 100_000 // the Workers PBKDF2 maximum
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000

const encoder = new TextEncoder()
export const hex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
export const sha256 = async (text: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)))
/** Session tokens go to the browser; only their SHA-256 is stored. */
export const newToken = () => hex(crypto.getRandomValues(new Uint8Array(32)))
export const bearer = (c: Context) => c.req.header('Authorization')?.match(/^Bearer (\S+)$/)?.[1]
export const now = () => new Date().toISOString()

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${await pbkdf2(password, salt, ITERATIONS)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2' || !salt || !hash) return false
  const saltBytes = Uint8Array.from(salt.match(/../g) ?? [], (pair) => parseInt(pair, 16))
  return timingSafeEqual(await pbkdf2(password, saltBytes, Number(iterations)), hash)
}

type Env = { Bindings: Bindings }

/** Staff sign in with email and password; ADMIN_TOKEN still works for scripts. */
export const admin = createMiddleware<Env>(async (c, next) => {
  const token = bearer(c)
  if (token && c.env.ADMIN_TOKEN && (await timingSafeEqual(token, c.env.ADMIN_TOKEN))) return next()
  const session =
    token &&
    (await c.env.DB.prepare(
      `SELECT admins.id FROM admin_sessions JOIN admins ON admins.id = admin_sessions.admin_id
       WHERE token_hash = ? AND expires_at > ?`,
    )
      .bind(await sha256(token), now())
      .first())
  if (!session) return c.json({ error: 'Your session has ended. Sign in again.' }, 401)
  return next()
})

const auth = new Hono<Env>()

auth.post('/admin-auth/login', async (c) => {
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const account = await c.env.DB.prepare('SELECT id, name, email, password_hash FROM admins WHERE email = ?')
    .bind(email)
    .first<{ id: number; name: string; email: string; password_hash: string }>()
  if (!account || !(await verifyPassword(password, account.password_hash)))
    return c.json({ error: 'That email or password isn’t right.' }, 401)
  const token = newToken()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(now()),
    c.env.DB.prepare('INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)').bind(
      await sha256(token),
      account.id,
      new Date(Date.now() + ADMIN_SESSION_MS).toISOString(),
    ),
  ])
  return c.json({ token, admin: { name: account.name, email: account.email } })
})

auth.post('/admin-auth/logout', async (c) => {
  const token = bearer(c)
  if (token) await c.env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await sha256(token)).run()
  return c.body(null, 204)
})

export default auth
