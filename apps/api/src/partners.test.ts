import { Database } from 'bun:sqlite'
import { expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { sha256 } from './auth'
import app from './index'
import { parsePartnerSignup } from './partners'

/** Just enough of D1 over an in-memory SQLite, with every real migration applied. */
function d1() {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  const dir = new URL('../migrations/', import.meta.url)
  for (const file of readdirSync(dir).sort()) db.exec(readFileSync(new URL(file, dir), 'utf8'))
  const exec = (sql: string, args: unknown[]) => {
    const query = db.query(sql)
    if (/^\s*SELECT|RETURNING/i.test(sql)) return { results: query.all(...(args as never[])), meta: { changes: 0 } }
    return { results: [], meta: { changes: query.run(...(args as never[])).changes } }
  }
  const statement = (sql: string, args: unknown[] = []) => ({
    bind: (...next: unknown[]) => statement(sql, next),
    run: async () => exec(sql, args),
    all: async () => exec(sql, args),
    first: async () => exec(sql, args).results[0] ?? null,
    exec: () => exec(sql, args),
  })
  return {
    db,
    DB: { prepare: (sql: string) => statement(sql), batch: async (list: { exec: () => unknown }[]) => list.map((s) => s.exec()) },
  }
}

const allow = { limit: async () => ({ success: true }) }

test('affiliate sign-up normalises the mobile and needs a real password', () => {
  expect(parsePartnerSignup({ name: ' Priya  S ', phone: '+91 98765-43210', password: 'longenough' })).toEqual({
    name: 'Priya S',
    phone: '9876543210',
    password: 'longenough',
  })
  expect(parsePartnerSignup({ name: 'Priya', phone: '12345', password: 'longenough' })).toBeString()
  expect(parsePartnerSignup({ name: 'Priya', phone: '9876543210', password: 'short' })).toBeString()
  expect(parsePartnerSignup(null)).toBeString()
})

test('an approved affiliate’s link earns the shop’s commission once delivered, and nothing leaks', async () => {
  const { db, DB } = d1()
  const env = { DB, ADMIN_TOKEN: 'x', ALLOWED_ORIGINS: 'http://localhost:3000', LIMITER: allow, ADMIN_LIMITER: allow }
  db.exec(`INSERT INTO shops (id, slug, name, owner_name, owner_phone, password_hash) VALUES (3, 'murugan-oils', 'Murugan Oils', 'Murugan', '9000000001', 'x')`)
  db.exec(`INSERT INTO products (id, shop_id, kind, name, price_paise) VALUES (1, 3, 'product', 'Groundnut oil', 24550)`)
  db.exec(`INSERT INTO shop_sessions VALUES ('${await sha256('owner')}', 3, '2999-01-01')`)

  const call = async (path: string, method = 'GET', body?: unknown, token?: string) => {
    const response = await app.request(
      path,
      {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      env,
    )
    return { status: response.status, body: (await response.json().catch(() => ({}))) as Record<string, any> }
  }
  const signup = { name: 'Priya', phone: '9876543210', password: 'longenough' }
  const order = (ref: string, phone = '9123456780') =>
    call('/shops/murugan-oils/orders', 'POST', { name: 'Ravi', phone, address: '12 Main Road, Tirunelveli', note: '', items: [{ id: 1, qty: 3 }], ref })

  expect((await call('/partner/dashboard')).status).toBe(401)
  const { status, body: created } = await call('/partner-auth/register', 'POST', signup)
  expect(status).toBe(201)
  expect((await call('/partner-auth/register', 'POST', signup)).status).toBe(409)
  expect((await call('/partner-auth/login', 'POST', { ...signup, password: 'wrongpass' })).status).toBe(401)
  const token = (await call('/partner-auth/login', 'POST', { phone: '+91 98765 43210', password: 'longenough' })).body.token
  expect(token).toBeString()
  expect(token).not.toBe(created.token)

  expect((await call('/partner/shops/missing', 'POST', undefined, token)).status).toBe(404)
  expect((await call('/partner/shops/murugan-oils', 'POST', undefined, token)).status).toBe(204)
  let dash = (await call('/partner/dashboard', 'GET', undefined, token)).body
  const code = dash.affiliate.code
  expect(code).toMatch(/^[0-9a-f]{8}$/)
  expect(dash.shops).toMatchObject([{ slug: 'murugan-oils', status: 'pending', products: [] }])

  // Pending: the link places the order but credits no one.
  expect((await order(code)).status).toBe(201)
  const owners = await call('/owner/affiliates', 'GET', undefined, 'owner')
  expect(owners.body).toMatchObject({ commission_percent: 0, affiliates: [{ name: 'Priya', phone: '9876543210', status: 'pending', orders: 0 }] })
  const partnerId = owners.body.affiliates[0].id

  expect((await call('/owner/commission', 'PUT', { commission_percent: 10.5 }, 'owner')).status).toBe(400)
  expect((await call('/owner/commission', 'PUT', { commission_percent: 10 }, 'owner')).status).toBe(200)
  expect((await call(`/owner/affiliates/${partnerId}`, 'PUT', { status: 'approved' }, 'owner')).status).toBe(200)
  expect((await call('/owner/affiliates/999', 'PUT', { status: 'approved' }, 'owner')).status).toBe(404)

  const credited = (await order(code)).body.order.id
  await order(code, '9876543210') // the affiliate's own order
  await order('deadbeef') // unknown code

  // 3 × ₹245.50 = ₹736.50; 10% = 7365 paise, floored.
  const orders = (await call('/owner/orders', 'GET', undefined, 'owner')).body.orders
  expect(orders.map((o: any) => [o.affiliate, o.commission_paise])).toEqual([[null, 0], [null, 0], ['Priya', 7365], [null, 0]])

  dash = (await call('/partner/dashboard', 'GET', undefined, token)).body
  expect(dash.shops[0]).toMatchObject({ status: 'approved', commission_percent: 10, orders: 1, sales_paise: 73650, earned_paise: 0, pending_paise: 7365 })
  expect(dash.shops[0].products).toEqual([{ id: 1, kind: 'product', name: 'Groundnut oil', size: '', price_paise: 24550, image: null, in_stock: true }])

  const delivered = await call(`/owner/orders/${credited}`, 'PUT', { status: 'delivered' }, 'owner')
  expect(delivered.body.order).toMatchObject({ status: 'delivered', payment_status: 'paid', affiliate: 'Priya', commission_paise: 7365 })
  dash = (await call('/partner/dashboard', 'GET', undefined, token)).body
  expect(dash.shops[0]).toMatchObject({ earned_paise: 7365, pending_paise: 0 })
  expect(dash.orders).toEqual([{ id: credited, shop: 'Murugan Oils', total_paise: 73650, commission_paise: 7365, status: 'delivered', created_at: expect.any(String) }])
  const json = JSON.stringify(dash)
  for (const secret of ['9123456780', '9000000001', 'Ravi', 'Main Road', 'password']) expect(json).not.toContain(secret)

  // Revoked: old commission stays, new orders aren't credited, and re-applying doesn't reset it.
  await call(`/owner/affiliates/${partnerId}`, 'PUT', { status: 'rejected' }, 'owner')
  await call('/partner/shops/murugan-oils', 'POST', undefined, token)
  expect((await order(code)).status).toBe(201)
  dash = (await call('/partner/dashboard', 'GET', undefined, token)).body
  expect(dash.shops[0]).toMatchObject({ status: 'rejected', earned_paise: 7365, products: [] })

  expect((await call('/partner-auth/logout', 'POST', undefined, token)).status).toBe(204)
  expect((await call('/partner/dashboard', 'GET', undefined, token)).status).toBe(401)
})
