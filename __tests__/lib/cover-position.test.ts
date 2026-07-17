import {
  getCoverCropFrame,
  getCoverPositionFromFrameCenter,
} from '@/lib/utils/cover-position'

describe('cover position geometry', () => {
  it('maps a wide photo to the exact centered 4:3 feed crop', () => {
    expect(getCoverCropFrame(1600, 900, 50, 50)).toEqual({
      leftPercent: 12.5,
      topPercent: 0,
      widthPercent: 75,
      heightPercent: 100,
    })
  })

  it('moves a wide crop fully from the left to the right edge', () => {
    expect(getCoverCropFrame(1600, 900, 0, 50).leftPercent).toBe(0)
    expect(getCoverCropFrame(1600, 900, 100, 50).leftPercent).toBe(25)
  })

  it('maps a portrait photo to the exact bottom-aligned 4:3 feed crop', () => {
    expect(getCoverCropFrame(900, 1200, 50, 100)).toEqual({
      leftPercent: 0,
      topPercent: 43.75,
      widthPercent: 100,
      heightPercent: 56.25,
    })
  })

  it('converts a dragged frame centre into object-position values', () => {
    expect(getCoverPositionFromFrameCenter(1600, 900, 12.5, 50)).toEqual({
      xOffset: 0,
      yOffset: 50,
    })
    expect(getCoverPositionFromFrameCenter(900, 1200, 50, 71.875)).toEqual({
      xOffset: 50,
      yOffset: 100,
    })
  })
})
