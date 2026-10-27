import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: { agentUpgrade: 'security' },
  redirects: async () => [{ source: '/admin/registrations', destination: '/admin', permanent: true }],
}

export default nextConfig
