import { expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { helicopterRide, site } from '@/lib/site'
import HomePage from './page'
import { metadata as eventMetadata } from './events/helicopter-ride/page'
import robots from './robots'
import sitemap from './sitemap'

test('homepage ships linked organization and website data without JavaScript', () => {
  const html = renderToStaticMarkup(<HomePage />)
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
  expect(scripts).toHaveLength(1)
  const data = JSON.parse(scripts[0][1])
  expect(data['@context']).toBe('https://schema.org')
  expect(data['@graph']).toHaveLength(2)
  const [organization, website] = data['@graph']
  expect(organization['@type']).toBe('Organization')
  expect(website['@type']).toBe('WebSite')
  expect(website.publisher['@id']).toBe(organization['@id'])
  expect(organization.name).toBe(site.name)
  expect(website.name).toBe(site.name)
  expect(site.name).toBe('PreBooking')
  expect(site.title).toBe('Global Business Networking | PreBooking')
  expect(site.description).not.toMatch(/World\s*1|Tirunelveli|Tamil Nadu/i)
  expect(site.description).toContain('worldwide')
  expect(website).not.toHaveProperty('alternateName')
  expect(organization.url).toBe(`${site.url}/`)
  expect(website.url).toBe(organization.url)
  expect(organization.telephone).toEqual(['+917397167111', '+917397197111'])
  const logo = new URL(organization.logo)
  expect(logo.origin).toBe(site.url)
  expect(existsSync(resolve(import.meta.dir, '../../public', `.${logo.pathname}`))).toBe(true)
  expect(organization).not.toHaveProperty('address')
  expect(scripts[0][1]).not.toMatch(/review|rating|member|chapter|referralCount/i)
})

test('crawl routes share the homepage canonical host and list only the public routes', () => {
  expect(new URL(site.url).protocol).toBe('https:')
  expect(robots().rules).toEqual({ userAgent: '*', allow: '/' })
  expect(robots().sitemap).toBe(`${site.url}/sitemap.xml`)
  expect(sitemap()).toEqual([{ url: `${site.url}/` }, { url: `${site.url}${helicopterRide.path}` }, { url: `${site.url}/shops` }])
})

test('helicopter sharing uses its own image and event copy on Open Graph and Twitter', () => {
  const image = { url: '/brand/og-helicopter-ride.jpg', width: 1200, height: 630 }
  expect(eventMetadata).toMatchObject({
    alternates: { canonical: helicopterRide.path },
    openGraph: {
      url: helicopterRide.path,
      title: helicopterRide.title,
      description: helicopterRide.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: helicopterRide.title,
      description: helicopterRide.description,
      images: [image],
    },
  })
  expect(existsSync(resolve(import.meta.dir, '../../public', `.${image.url}`))).toBe(true)
})
