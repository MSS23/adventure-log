import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  const manifest = {
    name: "Adventure Log",
    short_name: "Adventure Log",
    description: "Transform your travel memories into an interactive experience with cinematic flight animations",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    categories: [
      "travel",
      "photography",
      "lifestyle",
      "social"
    ],
    lang: "en",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    screenshots: [
      {
        src: "/screenshots/desktop-home.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Adventure Log Home Screen"
      },
      {
        src: "/screenshots/mobile-home.png",
        sizes: "375x812",
        type: "image/png",
        form_factor: "narrow",
        label: "Adventure Log Mobile View"
      }
    ],
    shortcuts: [
      {
        name: "Create Album",
        short_name: "New Album",
        description: "Create a new travel album",
        url: "/albums/new",
        icons: [
          {
            src: "/icons/shortcut-new-album.png",
            sizes: "96x96",
            type: "image/png"
          }
        ]
      },
      {
        name: "View Globe",
        short_name: "Globe",
        description: "View your travels on the interactive globe",
        url: "/globe",
        icons: [
          {
            src: "/icons/shortcut-globe.png",
            sizes: "96x96",
            type: "image/png"
          }
        ]
      },
      {
        name: "My Albums",
        short_name: "Albums",
        description: "Browse your travel albums",
        url: "/albums",
        icons: [
          {
            src: "/icons/shortcut-albums.png",
            sizes: "96x96",
            type: "image/png"
          }
        ]
      }
    ],
    related_applications: [],
    prefer_related_applications: false,
    edge_side_panel: {
      preferred_width: 400
    },
    launch_handler: {
      client_mode: "navigate-existing"
    }
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}