/**
 * @jest-environment jsdom
 */
import {
  sanitizeHtml,
  sanitizeText,
  schemas,
  validateImageFile
} from '@/lib/utils/input-validation'

describe('input-validation', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<b>bold</b> <i>italic</i> <em>emphasis</em> <strong>strong</strong>'
      const result = sanitizeHtml(input)

      expect(result).toContain('<b>')
      expect(result).toContain('<i>')
      expect(result).toContain('<em>')
      expect(result).toContain('<strong>')
    })

    it('should allow paragraph and line break tags', () => {
      const input = '<p>paragraph</p><br>'
      const result = sanitizeHtml(input)

      expect(result).toContain('<p>')
      expect(result).toContain('<br>')
    })

    it('should allow anchor tags with href', () => {
      const input = '<a href="https://example.com">link</a>'
      const result = sanitizeHtml(input)

      expect(result).toContain('<a')
      expect(result).toContain('href="https://example.com"')
    })

    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('<script')
      expect(result).not.toContain('alert')
    })

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('onerror')
      expect(result).not.toContain('alert')
    })

    it('should remove dangerous tags', () => {
      const input = '<iframe src="evil.com"></iframe><object data="evil"></object>'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('<iframe')
      expect(result).not.toContain('<object')
    })

    it('should handle javascript: protocol in links', () => {
      const input = '<a href="javascript:alert(1)">click</a>'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('javascript:')
    })
  })

  describe('sanitizeText', () => {
    it('should strip all HTML tags', () => {
      const input = '<b>bold</b> <script>alert(1)</script> text'
      const result = sanitizeText(input)

      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      expect(result).toContain('text')
    })

    it('should preserve plain text', () => {
      const input = 'Hello, World!'
      const result = sanitizeText(input)

      expect(result).toBe('Hello, World!')
    })

    it('should handle empty strings', () => {
      const result = sanitizeText('')
      expect(result).toBe('')
    })
  })

  describe('schemas', () => {
    describe('username', () => {
      it('should accept valid usernames', () => {
        expect(() => schemas.username.parse('john_doe')).not.toThrow()
        expect(() => schemas.username.parse('User123')).not.toThrow()
        expect(() => schemas.username.parse('abc')).not.toThrow()
      })

      it('should reject usernames that are too short', () => {
        expect(() => schemas.username.parse('ab')).toThrow()
      })

      it('should reject usernames that are too long', () => {
        const longUsername = 'a'.repeat(31)
        expect(() => schemas.username.parse(longUsername)).toThrow()
      })

      it('should reject usernames with special characters', () => {
        expect(() => schemas.username.parse('user@name')).toThrow()
        expect(() => schemas.username.parse('user name')).toThrow()
        expect(() => schemas.username.parse('user-name')).toThrow()
      })
    })

    describe('displayName', () => {
      it('should accept valid display names', () => {
        const result = schemas.displayName.parse('John Doe')
        expect(result).toBe('John Doe')
      })

      it('should sanitize HTML in display names', () => {
        const result = schemas.displayName.parse('<script>evil</script>John')
        expect(result).not.toContain('<script>')
        expect(result).toContain('John')
      })

      it('should reject empty display names', () => {
        expect(() => schemas.displayName.parse('')).toThrow()
      })

      it('should reject display names that are too long', () => {
        const longName = 'a'.repeat(51)
        expect(() => schemas.displayName.parse(longName)).toThrow()
      })
    })

    describe('bio', () => {
      it('should accept valid bios', () => {
        const result = schemas.bio.parse('Travel enthusiast')
        expect(result).toBe('Travel enthusiast')
      })

      it('should accept empty/undefined bios', () => {
        expect(() => schemas.bio.parse(undefined)).not.toThrow()
      })

      it('should reject bios that are too long', () => {
        const longBio = 'a'.repeat(501)
        expect(() => schemas.bio.parse(longBio)).toThrow()
      })
    })

    describe('albumTitle', () => {
      it('should accept valid titles', () => {
        const result = schemas.albumTitle.parse('My Trip to Paris')
        expect(result).toBe('My Trip to Paris')
      })

      it('should reject empty titles', () => {
        expect(() => schemas.albumTitle.parse('')).toThrow()
      })

      it('should reject titles that are too long', () => {
        const longTitle = 'a'.repeat(101)
        expect(() => schemas.albumTitle.parse(longTitle)).toThrow()
      })

      it('should sanitize HTML in titles', () => {
        const result = schemas.albumTitle.parse('<b>Bold</b> Title')
        expect(result).not.toContain('<b>')
      })
    })

    describe('location', () => {
      it('should accept valid locations', () => {
        const result = schemas.location.parse('Paris, France')
        expect(result).toBe('Paris, France')
      })

      it('should reject empty locations', () => {
        expect(() => schemas.location.parse('')).toThrow()
      })

      it('should reject locations that are too long', () => {
        const longLocation = 'a'.repeat(201)
        expect(() => schemas.location.parse(longLocation)).toThrow()
      })
    })

    describe('commentText', () => {
      it('should accept valid comments', () => {
        const result = schemas.commentText.parse('Great photo!')
        expect(result).toBe('Great photo!')
      })

      it('should reject empty comments', () => {
        expect(() => schemas.commentText.parse('')).toThrow()
      })

      it('should reject comments that are too long', () => {
        const longComment = 'a'.repeat(501)
        expect(() => schemas.commentText.parse(longComment)).toThrow()
      })
    })

    describe('url', () => {
      it('should accept valid URLs', () => {
        expect(() => schemas.url.parse('https://example.com')).not.toThrow()
        expect(() => schemas.url.parse('http://localhost:3000')).not.toThrow()
      })

      it('should reject invalid URLs', () => {
        expect(() => schemas.url.parse('not-a-url')).toThrow()
        expect(() => schemas.url.parse('example.com')).toThrow()
      })

      it('should reject URLs that are too long', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(2050)
        expect(() => schemas.url.parse(longUrl)).toThrow()
      })
    })

    describe('email', () => {
      it('should accept valid emails', () => {
        expect(() => schemas.email.parse('test@example.com')).not.toThrow()
        expect(() => schemas.email.parse('user.name+tag@domain.co.uk')).not.toThrow()
      })

      it('should reject invalid emails', () => {
        expect(() => schemas.email.parse('not-an-email')).toThrow()
        expect(() => schemas.email.parse('@domain.com')).toThrow()
        expect(() => schemas.email.parse('user@')).toThrow()
      })
    })

    describe('latitude', () => {
      it('should accept valid latitudes', () => {
        expect(() => schemas.latitude.parse(0)).not.toThrow()
        expect(() => schemas.latitude.parse(90)).not.toThrow()
        expect(() => schemas.latitude.parse(-90)).not.toThrow()
        expect(() => schemas.latitude.parse(48.8566)).not.toThrow()
      })

      it('should reject invalid latitudes', () => {
        expect(() => schemas.latitude.parse(91)).toThrow()
        expect(() => schemas.latitude.parse(-91)).toThrow()
      })
    })

    describe('longitude', () => {
      it('should accept valid longitudes', () => {
        expect(() => schemas.longitude.parse(0)).not.toThrow()
        expect(() => schemas.longitude.parse(180)).not.toThrow()
        expect(() => schemas.longitude.parse(-180)).not.toThrow()
        expect(() => schemas.longitude.parse(2.3522)).not.toThrow()
      })

      it('should reject invalid longitudes', () => {
        expect(() => schemas.longitude.parse(181)).toThrow()
        expect(() => schemas.longitude.parse(-181)).toThrow()
      })
    })
  })

  describe('validateImageFile', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      return {
        name,
        size,
        type
      } as File
    }

    it('should accept valid JPEG files', () => {
      const file = createMockFile('photo.jpg', 1024 * 1024, 'image/jpeg')
      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept valid PNG files', () => {
      const file = createMockFile('photo.png', 1024 * 1024, 'image/png')
      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })

    it('should accept valid WebP files', () => {
      const file = createMockFile('photo.webp', 1024 * 1024, 'image/webp')
      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })

    it('should accept valid HEIC files', () => {
      const file = createMockFile('photo.heic', 1024 * 1024, 'image/heic')
      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })

    it('should reject files that are too large', () => {
      const file = createMockFile('large.jpg', 11 * 1024 * 1024, 'image/jpeg') // 11MB
      const result = validateImageFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('10MB')
    })

    it('should accept files at exactly the size limit', () => {
      const file = createMockFile('exact.jpg', 10 * 1024 * 1024, 'image/jpeg') // Exactly 10MB
      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })

    it('should reject unsupported file types', () => {
      const file = createMockFile('document.pdf', 1024, 'application/pdf')
      const result = validateImageFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('JPEG')
    })

    it('should reject GIF files', () => {
      const file = createMockFile('animation.gif', 1024, 'image/gif')
      const result = validateImageFile(file)

      expect(result.valid).toBe(false)
    })

    it('should reject SVG files', () => {
      const file = createMockFile('vector.svg', 1024, 'image/svg+xml')
      const result = validateImageFile(file)

      expect(result.valid).toBe(false)
    })
  })
})
