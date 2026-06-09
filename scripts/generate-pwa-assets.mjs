#!/usr/bin/env node
/**
 * Generate missing static PWA asset files from the brand icon (public/icon.svg).
 *
 * Outputs:
 *   1. public/icons/badge-72x72.png               — notification badge (transparent)
 *   2. public/apple-touch-startup-image-768x1004.png  — iOS splash
 *   3. public/apple-touch-startup-image-1536x2008.png — iOS splash @2x
 *   4. public/twitter-image.png                   — 1200x630 social share card
 *   5. public/favicon.ico                          — 32x32 PNG-in-ICO
 *
 * Reusable: re-run any time the brand icon changes.
 *   node scripts/generate-pwa-assets.mjs
 */

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const ICON_SVG = join(PUBLIC, 'icon.svg')

// Brand palette
const CREAM = '#F7F2E7'

/** Rasterize the brand SVG to a PNG buffer at the requested square size. */
async function logoBuffer(size) {
  // density 300 gives librsvg/resvg a crisp source before downscaling.
  return sharp(ICON_SVG, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

/** Compose a centered logo on a solid cream canvas. */
async function splash(width, height, logoFraction, outPath) {
  const overlay = Math.round(Math.min(width, height) * logoFraction)
  const logo = await logoBuffer(overlay)
  await sharp({
    create: { width, height, channels: 4, background: CREAM },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath)
  return outPath
}

async function main() {
  const made = []

  // 1. Notification badge — transparent background, simple solid render.
  {
    const out = join(PUBLIC, 'icons', 'badge-72x72.png')
    await sharp(ICON_SVG, { density: 300 })
      .resize(72, 72, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out)
    made.push(out)
  }

  // 2 & 3. iOS splash screens — logo ~40% of width on cream.
  made.push(
    await splash(768, 1004, 0.4, join(PUBLIC, 'apple-touch-startup-image-768x1004.png'))
  )
  made.push(
    await splash(1536, 2008, 0.4, join(PUBLIC, 'apple-touch-startup-image-1536x2008.png'))
  )

  // 4. Twitter / social share card — 1200x630, centered logo on cream.
  {
    const out = join(PUBLIC, 'twitter-image.png')
    const logo = await logoBuffer(320)
    await sharp({
      create: { width: 1200, height: 630, channels: 4, background: CREAM },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(out)
    made.push(out)
  }

  // 5. favicon.ico — sharp can't write .ico; hand-wrap a 32x32 PNG.
  {
    const out = join(PUBLIC, 'favicon.ico')
    const png = await sharp(ICON_SVG, { density: 300 }).resize(32, 32).png().toBuffer()

    const header = Buffer.alloc(6)
    header.writeUInt16LE(0, 0) // reserved
    header.writeUInt16LE(1, 2) // type: icon
    header.writeUInt16LE(1, 4) // count: 1 image

    const entry = Buffer.alloc(16)
    entry.writeUInt8(32, 0) // width
    entry.writeUInt8(32, 1) // height
    entry.writeUInt8(0, 2) // color palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8) // png byte length
    entry.writeUInt32LE(22, 12) // offset = 6 + 16

    writeFileSync(out, Buffer.concat([header, entry, png]))
    made.push(out)
  }

  console.log('Generated PWA assets:')
  for (const f of made) console.log('  ' + f)
}

main().catch((err) => {
  console.error('PWA asset generation failed:', err)
  process.exit(1)
})
