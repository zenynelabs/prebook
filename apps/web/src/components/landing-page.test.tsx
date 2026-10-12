import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import LandingPage from './landing-page'

const html = renderToStaticMarkup(<LandingPage />)

describe('landing page public contract', () => {
  test('every navigation anchor leads to a section in the rendered page', () => {
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]))
    const anchors = [...html.matchAll(/\bhref="#([^"]+)"/g)].map(match => match[1])
    expect(anchors.length).toBeGreaterThan(10)
    for (const anchor of anchors) expect(ids.has(anchor)).toBe(true)
  })

  test('all hero and section photographs resolve locally', () => {
    const images = [...html.matchAll(/(?:src|srcSet|srcset)="(\/images\/[^" ]+)"/g)].map(match => match[1])
    expect(new Set(images).size).toBe(5)
    for (const image of images) expect(existsSync(resolve(import.meta.dir, '../../public', `.${image}`))).toBe(true)
  })

  test('coming-soon sections are presentation-only and visibly labelled', () => {
    const items = [...html.matchAll(/<div class="future-item"[^>]*>(.*?)<\/div>/g)]
    expect(items).toHaveLength(3)
    for (const item of items) {
      expect(item[0]).toContain('aria-disabled="true"')
      expect(item[1]).toContain('Coming soon')
      expect(item[1]).not.toMatch(/<(a|button)\b/)
    }
    expect(html).not.toMatch(/href="\/(hotels|restaurants|gym)/)
  })

  test('renders useful content without JS and does not expose seller contacts', () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('Skip to content')
    expect(html).toContain('Seller contact details kept private')
    expect(html).toContain('Ordering and site-visit requests will be available when the catalogues launch')
    expect(html).not.toMatch(/href="tel:|\+91[\s-]*\d|href="\/checkout/)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).not.toContain('opacity:0.7')
  })

  test('FAQ answers ship in HTML and can expand without JavaScript', () => {
    expect(html.match(/<details\b/g)).toHaveLength(5)
    expect(html.match(/<summary\b/g)).toHaveLength(5)
    expect(html).toContain('Prebooking does not process online payments')
    expect(html).toContain('Seller phone numbers are never displayed to buyers')
    expect(html).toContain('checkout and property visit requests are not available yet')
  })
})
