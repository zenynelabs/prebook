import type { Metadata } from 'next'
import EventPage from '@/components/event-page'
import { helicopterRide } from '@/lib/site'

export const metadata: Metadata = {
  title: helicopterRide.title,
  description: helicopterRide.description,
  alternates: { canonical: helicopterRide.path },
  openGraph: {
    title: helicopterRide.title,
    description: helicopterRide.description,
    type: 'website',
    siteName: 'PreBooking',
    locale: 'en_IN',
    url: helicopterRide.path,
    images: [{ url: '/brand/og-prebooking-global.png', width: 1730, height: 909, alt: 'PreBooking' }],
  },
}

export default function HelicopterRidePage() {
  return <EventPage />
}
