import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'

describe('getDisplayName', () => {
  it('returns a real display name when set', () => {
    expect(getDisplayName('Jane Traveler', 'jane')).toBe('Jane Traveler')
  })

  it('trims surrounding whitespace on a real name', () => {
    expect(getDisplayName('  Jane Traveler  ', 'jane')).toBe('Jane Traveler')
  })

  it('skips the literal "New User" placeholder and falls back to username', () => {
    expect(getDisplayName('New User', 'jane')).toBe('jane')
  })

  it('treats the placeholder case-insensitively', () => {
    expect(getDisplayName('new user', 'jane')).toBe('jane')
    expect(getDisplayName('NEW USER', 'jane')).toBe('jane')
  })

  it('skips other known placeholders (Anonymous, Unknown, New Explorer)', () => {
    expect(getDisplayName('Anonymous', 'jane')).toBe('jane')
    expect(getDisplayName('Unknown', 'jane')).toBe('jane')
    expect(getDisplayName('New Explorer', 'jane')).toBe('jane')
  })

  it('falls back to username when display name is null/empty/whitespace', () => {
    expect(getDisplayName(null, 'jane')).toBe('jane')
    expect(getDisplayName(undefined, 'jane')).toBe('jane')
    expect(getDisplayName('', 'jane')).toBe('jane')
    expect(getDisplayName('   ', 'jane')).toBe('jane')
  })

  it('uses the default "Explorer" fallback when neither name nor username exist', () => {
    expect(getDisplayName(null, null)).toBe('Explorer')
    expect(getDisplayName('New User', undefined)).toBe('Explorer')
    expect(getDisplayName('', '')).toBe('Explorer')
  })

  it('honours a custom fallback label', () => {
    expect(getDisplayName(null, null, 'someone')).toBe('someone')
    expect(getDisplayName('New User', '', 'someone')).toBe('someone')
  })

  it('does not treat a name merely containing "new user" as a placeholder', () => {
    expect(getDisplayName('New Userton', 'jane')).toBe('New Userton')
  })
})

describe('getDisplayInitial', () => {
  it('uses the first letter of a real display name, uppercased', () => {
    expect(getDisplayInitial('jane traveler', 'jane')).toBe('J')
  })

  it('falls back to the username initial when display name is the placeholder', () => {
    expect(getDisplayInitial('New User', 'zoe')).toBe('Z')
  })

  it('falls back to "U" when nothing usable is available', () => {
    expect(getDisplayInitial(null, null)).toBe('U')
    expect(getDisplayInitial('New User', '')).toBe('U')
  })
})
