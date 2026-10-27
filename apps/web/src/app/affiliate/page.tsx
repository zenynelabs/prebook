import type { Metadata } from 'next'
import AffiliateDashboard from '@/components/affiliate-dashboard'

export const metadata: Metadata = {
  title: 'Affiliate dashboard | PreBooking',
  robots: { index: false, follow: false },
}

export default function AffiliatePage() {
  return <AffiliateDashboard />
}
