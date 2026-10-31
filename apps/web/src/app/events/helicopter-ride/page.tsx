import type { Metadata } from 'next'
import EventPage from '@/components/event-page'
import { helicopterRide } from '@/lib/site'

const socialImage = {
  url: '/brand/og-helicopter-ride.jpg',
  width: 1200,
  height: 630,
  alt: 'PreBooking — See Tirunelveli from the sky. Helicopter ride pre-registration.',
}

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
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: helicopterRide.title,
    description: helicopterRide.description,
    images: [socialImage],
  },
}

export default function HelicopterRidePage() {
  return <EventPage />
}
