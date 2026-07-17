jest.mock('@/lib/utils/platform', () => ({ Platform: { isWeb: () => true } }))
jest.mock('@/lib/utils/offline-queue', () => ({ clearQueue: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/offline/queue', () => ({ clearQueue: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/offline/storage', () => ({ clearOfflineData: jest.fn().mockResolvedValue(undefined) }))

import { clearPrivateDeviceData } from '@/lib/utils/private-device-data'
import { clearQueue as clearPwaQueue } from '@/lib/utils/offline-queue'
import { clearQueue as clearActionQueue } from '@/lib/offline/queue'
import { clearOfflineData } from '@/lib/offline/storage'

describe('private device data cleanup', () => {
  it('clears caches and every web offline queue', async () => {
    const deleteCache = jest.fn().mockResolvedValue(true)
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: { keys: jest.fn().mockResolvedValue(['one', 'two']), delete: deleteCache },
    })

    await clearPrivateDeviceData()

    expect(deleteCache).toHaveBeenCalledTimes(2)
    expect(clearPwaQueue).toHaveBeenCalledWith('albums')
    expect(clearPwaQueue).toHaveBeenCalledWith('photos')
    expect(clearActionQueue).toHaveBeenCalled()
    expect(clearOfflineData).toHaveBeenCalled()
  })
})
