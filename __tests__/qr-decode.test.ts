import { extractPassportConnectPath } from '@/lib/utils/qr-decode'

describe('extractPassportConnectPath', () => {
  const token = `1893456000.${'a'.repeat(64)}`

  it('preserves only the signed connect token from an absolute passport URL', () => {
    expect(
      extractPassportConnectPath(
        `https://adventurelog.example/u/Ada_Traveller/passport?ref=someone&t=${token}`,
      ),
    ).toBe(`/u/Ada_Traveller/passport?connect=true&t=${token}`)
  })

  it('normalizes a bare passport path into a same-origin connect path', () => {
    expect(extractPassportConnectPath('/u/ada/passport')).toBe(
      '/u/ada/passport?connect=true',
    )
  })

  it('drops malformed tokens without allowing query-string injection', () => {
    expect(
      extractPassportConnectPath('/u/ada/passport?t=bad&next=https://evil.example'),
    ).toBe('/u/ada/passport?connect=true')
  })

  it('rejects non-passport paths and executable schemes', () => {
    expect(extractPassportConnectPath('javascript:alert(1)')).toBeNull()
    expect(extractPassportConnectPath('https://example.com/settings')).toBeNull()
  })
})
