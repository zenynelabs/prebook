import type { Metadata } from 'next'
import ShopDashboard from '@/components/shop-dashboard'

export const metadata: Metadata = {
  title: 'Shop dashboard | PreBooking',
  robots: { index: false, follow: false },
}

export default function ShopAdminPage() {
  return <ShopDashboard />
}
