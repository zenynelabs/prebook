import type { Metadata } from 'next'
import { ShopsDirectory } from '@/components/storefront'
import { type Shop, shopsPath } from '@/lib/shops'
import { eventsApi } from '@/lib/site'

const title = 'Shops | PreBooking'
const description = 'Browse local shops on PreBooking: groceries, oils and everyday essentials.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: shopsPath },
  openGraph: { title, description, type: 'website', siteName: 'PreBooking', locale: 'en_IN', url: shopsPath },
}

export default async function ShopsPage() {
  const response = await fetch(`${eventsApi}/shops`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Shops request failed (${response.status})`)
  const { shops }: { shops: Shop[] } = await response.json()
  return <ShopsDirectory shops={shops} />
}
