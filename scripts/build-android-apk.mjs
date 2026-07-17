#!/usr/bin/env node

/**
 * Reproducible Android build entry point.
 *
 * Builds the static mobile bundle, syncs Capacitor, regenerates native
 * Adventure Log artwork, and creates either a debug APK or a signed release
 * AAB. Pass --release for the Play upload artifact; --install is debug-only.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ANDROID = join(ROOT, 'android')
const release = process.argv.includes('--release')
const install = process.argv.includes('--install')
if (release && install) {
  throw new Error('--install cannot be combined with --release; upload the AAB to a Play testing track')
}
const ARTIFACT = release
  ? join(ANDROID, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
  : join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const isWindows = process.platform === 'win32'

function run(command, args, options = {}) {
  console.log(`\n[android-apk] ${options.label ?? [command, ...args].join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    env: options.env ?? process.env,
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? 'pipe' : 'inherit',
    shell: options.shell ?? false,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    const details = options.capture ? `\n${result.stdout ?? ''}${result.stderr ?? ''}` : ''
    throw new Error(`${options.label ?? command} failed with exit code ${result.status}.${details}`)
  }
  return result
}

function findJavaHome() {
  const candidates = isWindows
    ? [
        join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Android', 'Android Studio', 'jbr'),
        process.env.JAVA_HOME,
      ]
    : [
        process.env.JAVA_HOME,
        '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
      ]

  const javaName = isWindows ? 'java.exe' : 'java'
  const home = candidates.find((candidate) => candidate && existsSync(join(candidate, 'bin', javaName)))
  if (!home) throw new Error('JDK 17+ was not found. Install Android Studio or set JAVA_HOME to a compatible JDK.')
  return home
}

function readAndroidSdk() {
  const configured = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT
  if (configured) return configured

  const propertiesPath = join(ANDROID, 'local.properties')
  if (existsSync(propertiesPath)) {
    const match = readFileSync(propertiesPath, 'utf8').match(/^sdk\.dir=(.+)$/m)
    if (match) return match[1].replace(/\\\\/g, '\\')
  }
  return isWindows ? join(homedir(), 'AppData', 'Local', 'Android', 'Sdk') : join(homedir(), 'Android', 'Sdk')
}

const nativeOnly = process.argv.includes('--native-only')
if (!nativeOnly) {
  run(process.execPath, [join(ROOT, 'scripts', 'mobile-build.mjs')], { label: 'Build Adventure Log mobile web bundle' })
  run(process.execPath, [join(ROOT, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor'), 'sync', 'android'], {
    label: 'Sync Capacitor Android project',
  })
  run(process.execPath, [join(ROOT, 'scripts', 'generate-android-assets.mjs')], { label: 'Generate native Adventure Log artwork' })
}

const javaHome = findJavaHome()
const gradleEnv = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: `${join(javaHome, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
}

// Run the wrapper main class directly. Gradle's generated Windows .bat file
// assigns %~dp0 without quoting it, which breaks when the repository path
// contains an ampersand (as this workspace does).
const javaExe = join(javaHome, 'bin', isWindows ? 'java.exe' : 'java')
const wrapperJar = join(ANDROID, 'gradle', 'wrapper', 'gradle-wrapper.jar')
run(javaExe, [
  '-Dorg.gradle.appname=gradlew',
  '-classpath',
  wrapperJar,
  'org.gradle.wrapper.GradleWrapperMain',
  release ? 'bundleRelease' : 'assembleDebug',
], {
  cwd: ANDROID,
  env: gradleEnv,
  label: `Build Android ${release ? 'signed release AAB' : 'debug APK'} with ${javaHome}`,
})

if (!existsSync(ARTIFACT)) throw new Error(`Gradle completed but the artifact was not found at ${ARTIFACT}`)
const checksum = createHash('sha256').update(readFileSync(ARTIFACT)).digest('hex')
console.log(`\n[android-apk] ${release ? 'AAB' : 'APK'}: ${ARTIFACT}`)
console.log(`[android-apk] SHA-256: ${checksum}`)

if (install) {
  const sdk = readAndroidSdk()
  const adb = join(sdk, 'platform-tools', isWindows ? 'adb.exe' : 'adb')
  if (!existsSync(adb)) throw new Error(`adb was not found at ${adb}`)

  const devices = run(adb, ['devices'], { capture: true, label: 'Check connected Android devices' })
  const connected = (devices.stdout ?? '').split(/\r?\n/).some((line) => /\tdevice$/.test(line))
  if (!connected) {
    throw new Error('No authorised Android device was found. Enable USB debugging, connect the Pixel, and accept its RSA prompt.')
  }
  run(adb, ['install', '-r', ARTIFACT], { label: 'Install or upgrade Adventure Log on the connected device' })
}
