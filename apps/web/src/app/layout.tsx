import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import PageLoader from '@/components/page-loader'
import { site } from '@/lib/site'
import '../styles.css'

const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
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
    images: [{ url: '/icon-512.png?v=transparent-1', width: 512, height: 512, alt: 'Prebook' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [{ url: '/icon-512.png?v=transparent-1', width: 512, height: 512, alt: 'Prebook' }],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body><PageLoader />{children}</body>
    </html>
  )
}
