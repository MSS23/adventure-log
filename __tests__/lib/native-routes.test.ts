import { mapPathForNative } from '@/lib/utils/native-routes'

describe('native static route mapping', () => {
  it.each([
    ['/albums/album-1', '/albums/view?id=album-1'],
    ['/albums/album-1/edit?tab=details', '/albums/edit?tab=details&id=album-1'],
    ['/albums/album-1/upload', '/albums/upload?id=album-1'],
    ['/profile/john', '/profile/view?u=john'],
    ['/trips/trip-1', '/trips/view?id=trip-1'],
    ['/places/magnolia-bakery', '/places/view?slug=magnolia-bakery'],
    ['/blend/sam', '/blend/view?u=sam'],
    ['/u/john/passport#stamps', '/passport/view?u=john#stamps'],
  ])('maps %s to an in-bundle route', (input, expected) => {
    expect(mapPathForNative(input)).toEqual({ href: expected, external: false })
  })

  it.each(['/albums/new', '/albums/import', '/profile/edit', '/trips/view?id=1'])
    ('leaves static route %s untouched', (input) => {
      expect(mapPathForNative(input)).toEqual({ href: input, external: false })
    })
})
