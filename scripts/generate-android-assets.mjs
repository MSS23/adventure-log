#!/usr/bin/env node

/**
 * Generate the native Android launcher and splash assets from the Adventure Log
 * mark. Keeping this deterministic prevents the APK from drifting away from
 * the web/PWA brand whenever the Capacitor project is resynchronised.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res')
const PAPER = { r: 248, g: 247, b: 243, alpha: 1 }
const FOREST = '#1F6B57'
const CREAM = '#FFFDF8'

const markPaths = `
  <g fill="none" stroke="${CREAM}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="256" cy="256" r="142"/>
    <path d="M114 256h284M135 190c78 36 164 36 242 0M135 322c78-36 164-36 242 0"/>
    <path d="M256 114c-54 45-54 239 0 284M256 114c54 45 54 239 0 284"/>
  </g>`

const fullIconSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${FOREST}"/>${markPaths}</svg>`)
const roundIconSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="${FOREST}"/>${markPaths}</svg>`)
const foregroundSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${markPaths}</svg>`)

const densities = {
  ldpi: 0.75,
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
}

async function renderPng(svg, width, height = width) {
  return sharp(svg, { density: 384 })
    .resize(width, height, { fit: 'contain' })
    .png()
    .toBuffer()
}

for (const [density, scale] of Object.entries(densities)) {
  const dir = join(RES, `mipmap-${density}`)
  const legacySize = Math.round(48 * scale)
  const adaptiveSize = Math.round(108 * scale)

  writeFileSync(join(dir, 'ic_launcher.png'), await renderPng(fullIconSvg, legacySize))
  writeFileSync(join(dir, 'ic_launcher_round.png'), await renderPng(roundIconSvg, legacySize))
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), await renderPng(foregroundSvg, adaptiveSize))
  writeFileSync(
    join(dir, 'ic_launcher_background.png'),
    await sharp({ create: { width: adaptiveSize, height: adaptiveSize, channels: 4, background: FOREST } }).png().toBuffer(),
  )
}

function findSplashFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) findSplashFiles(path, found)
    else if (entry === 'splash.png') found.push(path)
  }
  return found
}

for (const splashPath of findSplashFiles(RES)) {
  const current = readFileSync(splashPath)
  const { width, height } = await sharp(current).metadata()
  if (!width || !height) throw new Error(`Unable to read splash dimensions: ${splashPath}`)

  const iconSize = Math.max(72, Math.round(Math.min(width, height) * 0.32))
  const icon = await renderPng(fullIconSvg, iconSize)
  const splash = await sharp({ create: { width, height, channels: 4, background: PAPER } })
    .composite([{ input: icon, gravity: 'centre' }])
    .png()
    .toBuffer()
  writeFileSync(splashPath, splash)
}

console.log(`[android-assets] Generated Adventure Log launcher icons and ${findSplashFiles(RES).length} splash assets.`)
