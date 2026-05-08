import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/discover', '/albums/*', '/profile/*', '/photos/*', '/images/', '/icons/', '/_next/static/'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/settings/', '/auth/', '/login', '/register', '/setup', '/profile/edit', '/albums/*/edit', '/albums/*/upload', '/*.json$', '/*?*', '/test/', '/temp/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
      },
      // Social media bots for Open Graph
      {
        userAgent: ['facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'WhatsApp', 'TelegramBot'],
        allow: '/',
      },
      // Block spam/malicious bots
      {
        userAgent: ['MJ12bot', 'DotBot', 'AhrefsBot', 'SemrushBot', 'MegaIndex'],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
