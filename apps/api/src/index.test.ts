import { expect, test } from 'bun:test'
import app, { parseRegistration } from './index'

const valid = { name: '  Arun  Kumar ', phone: '+91 98765-43210', email: '', address: '12 North Car Street, Tirunelveli 627006', passengers: '2' }

test('registration input is normalised and validated at the boundary', () => {
  expect(parseRegistration(valid)).toEqual({
    name: 'Arun Kumar',
    phone: '9876543210',
    email: null,
    address: '12 North Car Street, Tirunelveli 627006',
    passengers: 2,
  })
  expect(parseRegistration({ ...valid, phone: '09876543210' })).toMatchObject({ phone: '9876543210' })
  expect(parseRegistration(null)).toBeString()
  expect(parseRegistration({ ...valid, name: 'A' })).toBeString()
  expect(parseRegistration({ ...valid, phone: '12345' })).toBeString()
  expect(parseRegistration({ ...valid, phone: '5876543210' })).toBeString()
  expect(parseRegistration({ ...valid, email: 'not-an-email' })).toBeString()
  expect(parseRegistration({ ...valid, address: 'short' })).toBeString()
  for (const passengers of [0, 7, 1.5, 'two']) expect(parseRegistration({ ...valid, passengers })).toBeString()
})

function env(insert: () => Promise<unknown>) {
  const rows: unknown[] = [{ id: 1, name: 'Arun Kumar' }]
  return {
    ADMIN_TOKEN: 'secret-token',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    LIMITER: { limit: async () => ({ success: true }) },
    DB: { prepare: () => ({ bind: () => ({ run: insert, all: async () => ({ results: rows }) }) }) },
  }
}

const post = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('registrations are stored, duplicates rejected and the list stays admin-only', async () => {
  expect((await app.request('/registrations', post(valid), env(async () => ({})))).status).toBe(201)
  expect((await app.request('/registrations', post({ ...valid, phone: '1' }), env(async () => ({})))).status).toBe(400)
  const duplicate = env(async () => { throw new Error('D1_ERROR: UNIQUE constraint failed: registrations.event, registrations.phone') })
  expect((await app.request('/registrations', post(valid), duplicate)).status).toBe(409)

  const ok = env(async () => ({}))
  expect((await app.request('/registrations', {}, ok)).status).toBe(401)
  expect((await app.request('/registrations', { headers: { Authorization: 'Bearer wrong' } }, ok)).status).toBe(401)
  const limited = { ...ok, LIMITER: { limit: async () => ({ success: false }) } }
  expect((await app.request('/registrations', { headers: { Authorization: 'Bearer secret-token' } }, limited)).status).toBe(429)
  expect((await app.request('/registrations', post({ ...valid, address: 'x'.repeat(10_000) }), ok)).status).toBe(413)
  const list = await app.request('/registrations', { headers: { Authorization: 'Bearer secret-token' } }, ok)
  expect(list.status).toBe(200)
  expect((await list.json()) as object).toEqual({ registrations: [{ id: 1, name: 'Arun Kumar' }] })
})
