#!/usr/bin/env node

import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'public', 'screenshots')
const baseUrl = process.env.PWA_SCREENSHOT_URL || 'http://127.0.0.1:3000'

async function capture(page, name, width, height) {
  await page.setViewportSize({ width, height })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    document.querySelectorAll('nextjs-portal').forEach((node) => node.remove())
  })
  await page.screenshot({
    path: join(outputDir, name),
    type: 'png',
    fullPage: false,
    animations: 'disabled',
  })
}

async function main() {
  await mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  try {
    const desktop = await browser.newPage({ colorScheme: 'dark' })
    await capture(desktop, 'desktop-home.png', 1280, 720)
    await desktop.close()

    const mobileContext = await browser.newContext({ ...devices['Pixel 5'], colorScheme: 'dark' })
    const mobile = await mobileContext.newPage()
    await capture(mobile, 'mobile-home.png', 390, 844)
    await mobileContext.close()
  } finally {
    await browser.close()
  }
  console.log(`Captured production-format PWA screenshots from ${baseUrl}`)
}

main().catch((error) => {
  console.error('PWA screenshot capture failed:', error)
  process.exit(1)
})
