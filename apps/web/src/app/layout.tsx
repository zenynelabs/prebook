import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import PageLoader from '@/components/page-loader'
import { site } from '@/lib/site'
import '../styles.css'

const jakarta = localFont({
  src: '../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
  variable: '--font-jakarta',
  weight: '200 800',
  display: 'swap',
})

const statFont = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-statistics',
  weight: '100 900',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  applicationName: site.name,
  description: site.description,
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.ico?v=transparent-1', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-16x16.png?v=transparent-1', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png?v=transparent-1', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-48x48.png?v=transparent-1', type: 'image/png', sizes: '48x48' },
      { url: '/icon-192.png?v=transparent-1', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png?v=transparent-1', type: 'image/png', sizes: '512x512' },
    ],
    apple: { url: '/apple-touch-icon.png?v=transparent-1', type: 'image/png', sizes: '180x180' },
  },
  openGraph: {
    title: site.title,
    description: site.description,
    type: 'website',
    siteName: site.name,
    locale: 'en_IN',
    url: '/',
    images: [{ url: '/brand/og-prebooking-global.png', width: 1730, height: 909, alt: 'PreBooking — Business networking across borders' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [{ url: '/brand/og-prebooking-global.png', width: 1730, height: 909, alt: 'PreBooking — Business networking across borders' }],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${statFont.variable}`}>
      <body><PageLoader />{children}</body>
    </html>
  )
}
