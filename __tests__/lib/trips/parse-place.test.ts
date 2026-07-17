import { buildGeocodeQueries, parsePlaceInput } from '@/lib/trips/parse-place'

describe('trip place parsing', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    jest.restoreAllMocks()
    global.fetch = originalFetch
  })

  it('broadens a mixed Japanese Google Maps address to its canonical venue name', () => {
    expect(
      buildGeocodeQueries(
        'よみうりランド遊園, 地内-1-4015-1 Yanokuchi, Tama Ward, Inagi, Tokyo 206-8725, Japan'
      )
    ).toEqual([
      'よみうりランド遊園, 地内-1-4015-1 Yanokuchi, Tama Ward, Inagi, Tokyo 206-8725, Japan',
      'よみうりランド',
      'よみうりランド遊園',
    ])
  })

  it('forwards the authenticated session to the internal geocoder', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
          {
            display_name: 'よみうりランド, 稲城市, 東京都, 日本',
            lat: '35.6252459',
            lon: '139.5187982',
          },
        ],
    })
    global.fetch = fetchMock as typeof fetch

    const result = await parsePlaceInput('よみうりランド', 'https://adventure-log-azure.vercel.app', {
      cookie: 'sb-session=web-session',
      authorization: 'Bearer mobile-access-token',
      refreshToken: 'mobile-refresh-token',
    })

    expect(result).toMatchObject({
      name: 'よみうりランド',
      latitude: 35.6252459,
      longitude: 139.5187982,
    })
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers
    expect(headers.get('cookie')).toBe('sb-session=web-session')
    expect(headers.get('authorization')).toBe('Bearer mobile-access-token')
    expect(headers.get('x-refresh-token')).toBe('mobile-refresh-token')
  })
})
