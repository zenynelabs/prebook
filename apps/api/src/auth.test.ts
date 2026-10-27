import { expect, test } from 'bun:test'
import { hashPassword, sha256 } from './auth'
import app from './index'

const allow = { limit: async () => ({ success: true }) }
const deny = { limit: async () => ({ success: false }) }

/** Just enough D1 for sign-in: one admin, and sessions kept in a Map. */
async function env() {
  const account = { id: 1, name: 'Nambi', email: 'nambi@example.com', password_hash: await hashPassword('correct horse') }
  const sessions = new Map<string, number>()
  const statement = (sql: string, values: unknown[] = []) => ({
    bind: (...next: unknown[]) => statement(sql, next),
    first: async () => {
      if (sql.includes('FROM admins WHERE email')) return values[0] === account.email ? account : null
      if (sql.includes('FROM admin_sessions')) return sessions.has(values[0] as string) ? { id: 1 } : null
      return { results: [] }
    },
    run: async () => {
      if (sql.startsWith('INSERT INTO admin_sessions')) sessions.set(values[0] as string, values[1] as number)
      if (sql.startsWith('DELETE FROM admin_sessions WHERE token_hash')) sessions.delete(values[0] as string)
      return { meta: { changes: 1 } }
    },
    all: async () => ({ results: [] }),
  })
  const DB = { prepare: statement, batch: (list: ReturnType<typeof statement>[]) => Promise.all(list.map((s) => s.run())) }
  return { env: { ADMIN_TOKEN: 'secret-token', ALLOWED_ORIGINS: 'http://localhost:3000', LIMITER: allow, ADMIN_LIMITER: allow, DB }, sessions }
}

const login = (email: string, password: string) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})

test('staff sign in with email and password, and the session opens admin routes until logout', async () => {
  const { env: bindings, sessions } = await env()
  expect((await app.request('/admin-auth/login', login('nambi@example.com', 'wrong'), bindings)).status).toBe(401)
  expect((await app.request('/admin-auth/login', login('someone@example.com', 'correct horse'), bindings)).status).toBe(401)

  const response = await app.request('/admin-auth/login', login('  Nambi@Example.com ', 'correct horse'), bindings)
  expect(response.status).toBe(200)
  const body = (await response.json()) as { token: string; admin: object }
  expect(body.admin).toEqual({ name: 'Nambi', email: 'nambi@example.com' })
  expect(JSON.stringify(body)).not.toContain('pbkdf2')
  // Only the hash is stored, never the token itself.
  expect([...sessions.keys()]).toEqual([await sha256(body.token)])

  const auth = { headers: { Authorization: `Bearer ${body.token}` } }
  expect((await app.request('/registrations', auth, bindings)).status).toBe(200)
  expect((await app.request('/admin/shops', auth, bindings)).status).toBe(200)
  expect((await app.request('/admin/shops', { headers: { Authorization: 'Bearer secret-token' } }, bindings)).status).toBe(200)

  expect((await app.request('/admin-auth/logout', { method: 'POST', ...auth }, bindings)).status).toBe(204)
  expect((await app.request('/registrations', auth, bindings)).status).toBe(401)
  expect((await app.request('/admin/shops', {}, bindings)).status).toBe(401)
})

test('admin sign-in shares the tight per-IP limit', async () => {
  const { env: bindings } = await env()
  expect((await app.request('/admin-auth/login', login('nambi@example.com', 'correct horse'), { ...bindings, LIMITER: deny })).status).toBe(429)
})
