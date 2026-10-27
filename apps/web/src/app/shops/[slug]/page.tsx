import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import Storefront from '@/components/storefront'
import { eventsApi } from '@/lib/site'
import { type Product, type Shop, shopPath, shopSlug } from '@/lib/shops'

type Props = { params: Promise<{ slug: string }> }

// One request per render, shared by metadata and the page.
const loadShop = cache(async (slug: string) => {
  if (shopSlug(slug) !== slug) return null
  const response = await fetch(`${eventsApi}/shops/${slug}`, { cache: 'no-store' })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Shop request failed (${response.status})`)
  return (await response.json()) as { shop: Shop; products: Product[] }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadShop((await params).slug)
  if (!data) notFound()
  const { shop } = data
  const description = shop.tagline || `Browse ${shop.name} on PreBooking.`
  return {
    title: `${shop.name} | PreBooking`,
    description,
    alternates: { canonical: shopPath(shop.slug) },
    openGraph: { title: shop.name, description, type: 'website', siteName: 'PreBooking', locale: 'en_IN', url: shopPath(shop.slug) },
  }
}

export default async function ShopPage({ params }: Props) {
  const data = await loadShop((await params).slug)
  if (!data) notFound()
  return <Storefront shop={data.shop} products={data.products} />
}
