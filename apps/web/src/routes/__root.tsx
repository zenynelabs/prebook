import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import stylesheet from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Prebooking — Crackers, Clothing & Real Estate' },
      { name: 'description', content: 'One place for celebrations, everyday style, and your next address. Discover Crackers, Clothing and Real Estate with Prebooking, Tirunelveli.' },
      { property: 'og:title', content: 'Prebooking — Crackers, Clothing & Real Estate' },
      { property: 'og:description', content: 'Celebrations, everyday style, and your next address. All in one place.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://prebooking.com/' },
      { property: 'og:image', content: 'https://prebooking.com/images/hero.webp' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'preload', href: interFont, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: stylesheet },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'canonical', href: 'https://prebooking.com/' },
    ],
  }),
  component: Root,
  notFoundComponent: () => <main className="error-page"><h1>Page not found</h1><a href="/">Back to Prebooking</a></main>,
})

function Root() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body><Outlet /><Scripts /></body>
    </html>
  )
}
