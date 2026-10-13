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
  title: 'Prebooking — A Community for Business Connections',
  description: 'Connect with business owners, exchange ideas and build trusted relationships through the Prebooking business community in Tirunelveli.',
  alternates: { canonical: '/' },
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
  openGraph: {
    title: 'Prebooking — A Community for Business Connections',
    description: 'Business connections, shared ideas and trusted relationships. Get to know the Prebooking community.',
    type: 'website',
    url: '/',
    images: ['/images/community-hero.webp'],
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
