import { expect, test } from 'bun:test'
import app from './index'
import { hashPassword, verifyPassword } from './auth'
import { parseOrder, parseProduct, parseShopAccount, parseShopSettings } from './shops'

const image = 'shops/3/0b7f1c2e-1d2a-4c3b-9e8f-7a6b5c4d3e2f.webp'

test('passwords are salted PBKDF2 hashes that only verify with the right password', async () => {
  const stored = await hashPassword('nellai-oils-2026')
  expect(stored).toStartWith('pbkdf2$100000$')
  expect(stored).not.toContain('nellai')
  expect(await hashPassword('nellai-oils-2026')).not.toBe(stored)
  expect(await verifyPassword('nellai-oils-2026', stored)).toBeTrue()
  expect(await verifyPassword('nellai-oils-2027', stored)).toBeFalse()
  expect(await verifyPassword('anything', 'garbage')).toBeFalse()
})

test('shop accounts normalise the slug and mobile, and need a password only on create', () => {
  const account = { name: ' Sri Murugan  Stores ', owner_name: 'Murugan', owner_phone: '+91 98765-43210', password: 'longenough' }
  expect(parseShopAccount(account, true)).toEqual({
    name: 'Sri Murugan Stores',
    slug: 'sri-murugan-stores',
    owner_name: 'Murugan',
    owner_phone: '9876543210',
    active: true,
    password: 'longenough',
  })
  expect(parseShopAccount({ ...account, slug: 'Murugan_Oils' }, true)).toMatchObject({ slug: 'murugan-oils' })
  expect(parseShopAccount({ ...account, password: 'short' }, true)).toBeString()
  expect(parseShopAccount({ ...account, password: '' }, true)).toBeString()
  expect(parseShopAccount({ ...account, password: '', active: false }, false)).toMatchObject({ password: null, active: false })
  expect(parseShopAccount(account, false)).toMatchObject({ slug: '' })
  expect(parseShopAccount({ ...account, slug: 'New Name' }, false)).toMatchObject({ slug: 'new-name' })
  expect(parseShopAccount({ ...account, slug: '!!' }, false)).toBeString()
  expect(parseShopAccount({ ...account, owner_phone: '12345' }, true)).toBeString()
  expect(parseShopAccount({ ...account, name: 'முருகன்' }, true)).toBeString()
  expect(parseShopAccount(null, true)).toBeString()
})

test('shop settings accept only known themes and this shop’s own images', () => {
  const settings = { name: 'Murugan Oils', tagline: 'Cold-pressed since 1998', theme: 'saffron', logo: image, banners: [{ image, title: 'Diwali offers', subtitle: '' }] }
  expect(parseShopSettings(settings, 3)).toEqual({ ...settings, faqs: [] } as never)
  expect(parseShopSettings({ ...settings, logo: '' }, 3)).toMatchObject({ logo: null })
  expect(parseShopSettings({ ...settings, theme: 'neon' }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, logo: image.replace('shops/3', 'shops/4') }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, logo: 'https://evil.example/x.png' }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, banners: Array(6).fill(settings.banners[0]) }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, banners: [{ title: 'No image' }] }, 3)).toBeString()
})

test('products keep money as integer paise and combos list unique items', () => {
  const oil = { kind: 'product', name: 'Groundnut oil', category: 'Oils', size: '1 L bottle', price_paise: 24500, mrp_paise: 26000, image, in_stock: true, sort: 0, items: [{ id: 1, qty: 1 }] }
  expect(parseProduct(oil, 3)).toMatchObject({ price_paise: 24500, mrp_paise: 26000, items: [], description: '' })
  expect(parseProduct({ ...oil, mrp_paise: undefined, in_stock: undefined }, 3)).toMatchObject({ mrp_paise: null, in_stock: true })
  for (const price_paise of [245.5, -1, '24500', null, 1e12]) expect(parseProduct({ ...oil, price_paise }, 3)).toBeString()
  expect(parseProduct({ ...oil, mrp_paise: 20000 }, 3)).toBeString()
  expect(parseProduct({ ...oil, image: image.replace('shops/3', 'shops/9') }, 3)).toBeString()

  const combo = { ...oil, kind: 'combo', name: 'Monthly pack', items: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }] }
  expect(parseProduct(combo, 3)).toMatchObject({ kind: 'combo', items: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }] })
  expect(parseProduct({ ...combo, items: [] }, 3)).toBeString()
  expect(parseProduct({ ...combo, items: [{ id: 1, qty: 1 }, { id: 1, qty: 2 }] }, 3)).toBeString()
  expect(parseProduct({ ...combo, items: [{ id: 1, qty: 0 }] }, 3)).toBeString()
  expect(parseProduct({ ...combo, kind: 'bundle' }, 3)).toBeString()
})

const allow = { limit: async () => ({ success: true }) }
const deny = { limit: async () => ({ success: false }) }
const noRows = { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } }
const env = { ADMIN_TOKEN: 'secret-token', ALLOWED_ORIGINS: 'http://localhost:3000', LIMITER: allow, ADMIN_LIMITER: allow, ...noRows }

test('owner and admin routes reject missing credentials, and sign-in is tightly rate-limited', async () => {
  expect((await app.request('/owner/shop', {}, env)).status).toBe(401)
  expect((await app.request('/owner/shop', { headers: { Authorization: 'Bearer stolen' } }, env)).status).toBe(401)
  expect((await app.request('/admin/shops', {}, env)).status).toBe(401)
  expect((await app.request('/admin/shops', { headers: { Authorization: 'Bearer wrong' } }, env)).status).toBe(401)
  const login = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'x', password: 'y' }) }
  expect((await app.request('/shop-auth/login', login, env)).status).toBe(401)
  expect((await app.request('/shop-auth/login', login, { ...env, LIMITER: deny })).status).toBe(429)
  expect((await app.request('/shops/missing', {}, env)).status).toBe(404)
})

test('the public shop list shows active shops without any owner details', async () => {
  const row = { id: 3, slug: 'murugan-oils', name: 'Murugan Oils', tagline: '', theme: 'teal', logo: null, banners: '[]', faqs: '[]', owner_phone: '9876543210', password_hash: 'pbkdf2$x' }
  const queries: string[] = []
  const DB = { prepare: (sql: string) => (queries.push(sql), { all: async () => ({ results: [row] }) }) }
  const response = await app.request('/shops', {}, { ...env, DB })
  expect(response.status).toBe(200)
  expect((await response.json()) as object).toEqual({ shops: [{ slug: 'murugan-oils', name: 'Murugan Oils', tagline: '', theme: 'teal', logo: null, banners: [], faqs: [] }] })
  expect(queries[0]).toContain('active = 1')
})

test('shop FAQs are optional, capped at 10, and keep answer line breaks', () => {
  const settings = { name: 'Murugan Oils', tagline: '', theme: 'teal', logo: null, banners: [] }
  const faq = { question: ' Do you deliver? ', answer: 'Yes.\nWithin 5 km.  ' }
  expect(parseShopSettings(settings, 3)).toMatchObject({ faqs: [] })
  expect(parseShopSettings({ ...settings, faqs: [faq] }, 3)).toMatchObject({ faqs: [{ question: 'Do you deliver?', answer: 'Yes.\nWithin 5 km.' }] })
  expect(parseShopSettings({ ...settings, faqs: Array(10).fill(faq) }, 3)).toMatchObject({ faqs: Array(10).fill({ question: 'Do you deliver?', answer: 'Yes.\nWithin 5 km.' }) })
  expect(parseShopSettings({ ...settings, faqs: Array(11).fill(faq) }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, faqs: 'nope' }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, faqs: [{ ...faq, question: 'x' }] }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, faqs: [{ ...faq, question: 'q'.repeat(161) }] }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, faqs: [{ ...faq, answer: 'a'.repeat(1001) }] }, 3)).toBeString()
  expect(parseShopSettings({ ...settings, faqs: [{ ...faq, answer: ' ' }] }, 3)).toBeString()
})

const order = { name: ' Ravi  Kumar ', phone: '+91 98765-43210', address: '12 Main Road, Tirunelveli', note: '', items: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }] }

test('orders normalise the mobile and accept only unique whole-number cart lines', () => {
  expect(parseOrder(order)).toEqual({ ...order, name: 'Ravi Kumar', phone: '9876543210' })
  expect(parseOrder({ ...order, phone: '0 9876543210' })).toMatchObject({ phone: '9876543210' })
  expect(parseOrder({ ...order, phone: '5876543210' })).toBeString()
  expect(parseOrder({ ...order, name: 'R' })).toBeString()
  expect(parseOrder({ ...order, address: 'Short' })).toBeString()
  expect(parseOrder({ ...order, note: 'n'.repeat(501) })).toBeString()
  expect(parseOrder({ ...order, items: [] })).toBeString()
  expect(parseOrder({ ...order, items: Array.from({ length: 51 }, (_, i) => ({ id: i + 1, qty: 1 })) })).toBeString()
  expect(parseOrder({ ...order, items: [{ id: 1, qty: 1 }, { id: 1, qty: 2 }] })).toBeString()
  for (const qty of [0, 100, 1.5, '2', null]) expect(parseOrder({ ...order, items: [{ id: 1, qty }] })).toBeString()
  for (const id of [0, -1, 1.5, '1', 2 ** 60]) expect(parseOrder({ ...order, items: [{ id, qty: 1 }] })).toBeString()
  expect(parseOrder({ ...order, items: [{ id: 1, qty: 99 }] })).toMatchObject({ items: [{ id: 1, qty: 99 }] })
  expect(parseOrder(null)).toBeString()
})

test('placing an order prices every line from the shop’s own products and never returns the owner phone', async () => {
  const products = [
    { id: 1, kind: 'product', name: 'Groundnut oil', size: '1 L', price_paise: 24500, in_stock: 1 },
    { id: 2, kind: 'combo', name: 'Monthly pack', size: '', price_paise: 99999, in_stock: 0 },
  ]
  const inserted: unknown[][] = []
  const DB = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => (sql.startsWith('INSERT') ? (inserted.push(args), { id: 7 }) : { id: 3 }),
        all: async () => ({ results: products }),
      }),
    }),
  }
  const place = (items: unknown) =>
    app.request('/shops/murugan-oils/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...order, items }) }, { ...env, DB })

  const out = await place([{ id: 1, qty: 3 }])
  expect(out.status).toBe(201)
  const lines = [{ id: 1, kind: 'product', name: 'Groundnut oil', size: '1 L', qty: 3, price_paise: 24500 }]
  expect((await out.json()) as object).toEqual({ order: { id: 7, total_paise: 73500, items: lines } })
  expect(inserted[0]).toEqual([3, 'Ravi Kumar', '9876543210', '12 Main Road, Tirunelveli', '', JSON.stringify(lines), 73500, null, 0])

  const soldOut = await place([{ id: 2, qty: 1 }])
  expect(soldOut.status).toBe(409)
  expect(((await soldOut.json()) as { error: string }).error).toContain('Monthly pack')
  expect((await place([{ id: 9, qty: 1 }])).status).toBe(409)
  expect((await app.request('/shops/murugan-oils/orders', { method: 'POST', body: '{}' }, { ...env, DB })).status).toBe(400)
  const limited = await app.request('/shops/murugan-oils/orders', { method: 'POST', body: '{}' }, { ...env, DB, LIMITER: deny })
  expect(limited.status).toBe(429)
})

test('owner order routes need a signed-in shop', async () => {
  expect((await app.request('/owner/orders', {}, env)).status).toBe(401)
  expect((await app.request('/owner/orders/1', { method: 'PUT', body: '{}' }, env)).status).toBe(401)
})
