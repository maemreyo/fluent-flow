import { 
  validateInput, 
  validateApiRequest, 
  sanitizeText, 
  sanitizeUrl,
  validateEmail,
  validateUrl 
} from '../../lib/utils/validation'

describe('Validation Utils', () => {
  describe('validateInput', () => {
    it('should validate correct input', () => {
      const validInput = {
        input: 'Hello world',
        options: {
          timeout: 5000,
          retries: 2,
          priority: 'normal' as const
        }
      }

      const result = validateInput(validInput)
      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(validInput)
    })

    it('should reject empty input', () => {
      const invalidInput = { input: '' }
      const result = validateInput(invalidInput)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject input that is too long', () => {
      const longInput = { input: 'a'.repeat(10001) }
      const result = validateInput(longInput)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('too long')
    })

    it('should validate input with optional fields', () => {
      const minimalInput = { input: 'Test' }
      const result = validateInput(minimalInput)
      
      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(minimalInput)
    })
  })

  describe('validateApiRequest', () => {
    it('should validate allowed endpoints', () => {
      const result = validateApiRequest('example-api', { test: 'data' })
      expect(result.isValid).toBe(true)
    })

    it('should reject disallowed endpoints', () => {
      const result = validateApiRequest('malicious-endpoint', {})
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should validate custom endpoint with proper data', () => {
      const validData = {
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'GET' as const,
        headers: { 'Content-Type': 'application/json' }
      }
      
      const result = validateApiRequest('custom-endpoint', validData)
      expect(result.isValid).toBe(true)
    })
  })

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeText(input)
      expect(result).toBe('alert("xss")Hello')
    })

    it('should remove JavaScript protocols', () => {
      const input = 'javascript:alert("xss")'
      const result = sanitizeText(input)
      expect(result).toBe('alert("xss")')
    })

    it('should normalize whitespace', () => {
      const input = 'Hello    world\n\n\ntest'
      const result = sanitizeText(input)
      expect(result).toBe('Hello world test')
    })

    it('should limit text length', () => {
      const longText = 'a'.repeat(10001)
      const result = sanitizeText(longText)
      expect(result.length).toBe(10000)
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow HTTPS URLs', () => {
      const url = 'https://example.com/path'
      const result = sanitizeUrl(url)
      expect(result).toBe(url)
    })

    it('should allow localhost HTTP', () => {
      const url = 'http://localhost:3000/api'
      const result = sanitizeUrl(url)
      expect(result).toBe(url)
    })

    it('should reject non-HTTPS URLs', () => {
      const url = 'http://example.com/path'
      expect(() => sanitizeUrl(url)).toThrow('Invalid protocol')
    })

    it('should reject invalid URLs', () => {
      const url = 'not-a-url'
      expect(() => sanitizeUrl(url)).toThrow('Invalid URL format')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com'
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'ftp://files.example.com'
      ]

      validUrls.forEach(url => {
        expect(validateUrl(url)).toBe(true)
      })
    })

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://.com'
      ]

      invalidUrls.forEach(url => {
        expect(validateUrl(url)).toBe(false)
      })
    })
  })
})