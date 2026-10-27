import { expect, test } from 'bun:test'
import { comboSavings, discountPercent, formatRupees, parseRupees, type Product, shopSlug, toRupeeInput } from './shops'

test('rupee text becomes integer paise without floats, and round-trips', () => {
  expect(parseRupees('245')).toBe(24500)
  expect(parseRupees('245.5')).toBe(24550)
  expect(parseRupees('₹1,245.05')).toBe(124505)
  expect(parseRupees('0.29')).toBe(29)
  for (const bad of ['', 'abc', '12.345', '-5', '1e3', '12345678']) expect(parseRupees(bad)).toBeNull()
  for (const paise of [0, 29, 24500, 24550, 124505]) expect(parseRupees(toRupeeInput(paise))).toBe(paise)
  expect(formatRupees(24550)).toBe('₹245.50')
  expect(formatRupees(124500)).toBe('₹1,245')
})

test('combos show what they save against buying items separately', () => {
  const item = (id: number, price_paise: number) => ({ id, price_paise }) as Product
  const combo = { price_paise: 50000, items: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }, { id: 9, qty: 1 }] } as Product
  expect(comboSavings(combo, [item(1, 20000), item(2, 15000)])).toEqual({ separate: 55000, saving: 5000 })
  expect(discountPercent(9000, 10000)).toBe(10)
  expect(discountPercent(9000, null)).toBe(0)
  expect(shopSlug('  Sri Murugan Stores! ')).toBe('sri-murugan-stores')
})
