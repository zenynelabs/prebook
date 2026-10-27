import type { Metadata } from 'next'
import RegistrationsDashboard from '@/components/registrations-dashboard'

export const metadata: Metadata = {
  title: 'Shops | PreBooking',
  robots: { index: false, follow: false },
}

// The admin dashboard, opened on its Shops view.
export default function ShopsAdminPage() {
  return <RegistrationsDashboard initialView="shops" />
}
