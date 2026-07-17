import { moderateImageServer } from '@/lib/services/moderation'

describe('production moderation policy', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it('fails closed when moderation is required but unavailable', async () => {
    process.env.MODERATION_REQUIRED = 'true'
    delete process.env.MODERATION_API_KEY
    process.env.MODERATION_PROVIDER = 'none'
    await expect(moderateImageServer('https://example.com/photo.jpg')).resolves.toMatchObject({ safe: false })
  })

  it('allows the explicit beta mode when moderation is optional', async () => {
    delete process.env.MODERATION_REQUIRED
    delete process.env.MODERATION_API_KEY
    process.env.MODERATION_PROVIDER = 'none'
    await expect(moderateImageServer('https://example.com/photo.jpg')).resolves.toMatchObject({ safe: true })
  })
})
