import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import '../styles.css'

const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://prebooking.com'),
  title: 'Prebooking — Crackers, Clothing & Real Estate',
  description: 'One place for celebrations, everyday style, and your next address. Discover Crackers, Clothing and Real Estate with Prebooking, Tirunelveli.',
  alternates: { canonical: '/' },
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
  openGraph: {
    title: 'Prebooking — Crackers, Clothing & Real Estate',
    description: 'Celebrations, everyday style, and your next address. All in one place.',
    type: 'website',
    url: '/',
    images: ['/images/hero.webp'],
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
