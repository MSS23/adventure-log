import fs from 'node:fs'
import path from 'node:path'

const root = path.join(__dirname, '..')

describe('PWA release contract', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'public', 'manifest.json'), 'utf8'),
  )

  it('uses a non-destructive GET web share target', () => {
    expect(manifest.share_target.method).toBe('GET')
    expect(manifest.share_target.params).toEqual({
      title: 'title',
      text: 'notes',
      url: 'sharedUrl',
    })
  })

  it.each(manifest.screenshots)('ships a real PNG for $src', (screenshot: { src: string }) => {
    const bytes = fs.readFileSync(path.join(root, 'public', screenshot.src.replace(/^\//, '')))
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  })

  it('keeps API responses network-only in the service worker', () => {
    const worker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8')
    const start = worker.indexOf('async function handleAPIRequest')
    const end = worker.indexOf('// Handle static asset requests', start)
    const handler = worker.slice(start, end)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    expect(handler).not.toContain('caches.open')
    expect(handler).not.toContain('cache.match')
    expect(worker).not.toContain("self.addEventListener('sync'")
  })
})
