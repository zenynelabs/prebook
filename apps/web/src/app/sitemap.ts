import type { MetadataRoute } from 'next'
import { helicopterRide, site } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${site.url}/` }, { url: `${site.url}${helicopterRide.path}` }]
}
