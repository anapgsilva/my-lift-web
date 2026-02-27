import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getClientId, getClientSecret } from './constants'

describe('constants', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getClientId', () => {
    it('should return userId from localStorage', () => {
      localStorage.setItem('userId', 'test-user-id')
      expect(getClientId()).toBe('test-user-id')
    })

    it('should return empty string when userId is not in localStorage', () => {
      expect(getClientId()).toBe('')
    })
  })

  describe('getClientSecret', () => {
    it('should return userPassword from localStorage', () => {
      localStorage.setItem('userPassword', 'test-password')
      expect(getClientSecret()).toBe('test-password')
    })

    it('should return empty string when userPassword is not in localStorage', () => {
      expect(getClientSecret()).toBe('')
    })
  })
})
