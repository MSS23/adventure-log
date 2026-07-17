#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv.find((arg) => arg.startsWith('--version='))?.split('=')[1]
const codeText = process.argv.find((arg) => arg.startsWith('--code='))?.split('=')[1]
const code = Number(codeText)
if (!/^\d+\.\d+\.\d+$/.test(version || '') || !Number.isInteger(code) || code < 1) {
  throw new Error('Usage: npm run release:version -- --version=1.4.0 --code=5')
}

const packagePath = 'package.json'
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
packageJson.version = version
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)

const gradlePath = 'android/app/build.gradle'
const gradle = readFileSync(gradlePath, 'utf8')
  .replace(/versionCode \d+/, `versionCode ${code}`)
  .replace(/versionName "[^"]+"/, `versionName "${version}"`)
writeFileSync(gradlePath, gradle)

console.log(`Release version synchronized: ${version} (Android versionCode ${code})`)
