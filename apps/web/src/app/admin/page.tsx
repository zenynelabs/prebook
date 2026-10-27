import type { Metadata } from 'next'
import RegistrationsDashboard from '@/components/registrations-dashboard'

export const metadata: Metadata = {
  title: 'Admin | PreBooking',
  robots: { index: false, follow: false },
}

export default function RegistrationsPage() {
  return <RegistrationsDashboard />
}
