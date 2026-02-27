import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkLogoutParam, isUserLoggedIn, login, logout } from './auth'

describe('auth', () => {
  beforeEach(() => {
    localStorage.clear()
    delete (window as any).location
    window.location = { search: '', pathname: '/' } as any
    window.history.replaceState = vi.fn()
  })

  describe('login', () => {
    it('should save userId and userPassword to localStorage', () => {
      login('test-user', 'test-password')
      
      expect(localStorage.getItem('userId')).toBe('test-user')
      expect(localStorage.getItem('userPassword')).toBe('test-password')
    })
  })

  describe('logout', () => {
    it('should remove userId and userPassword from localStorage', () => {
      localStorage.setItem('userId', 'test-user')
      localStorage.setItem('userPassword', 'test-password')
      
      logout()
      
      expect(localStorage.getItem('userId')).toBeNull()
      expect(localStorage.getItem('userPassword')).toBeNull()
    })
  })

  describe('isUserLoggedIn', () => {
    it('should return true when both userId and userPassword exist', () => {
      localStorage.setItem('userId', 'test-user')
      localStorage.setItem('userPassword', 'test-password')
      
      expect(isUserLoggedIn()).toBe(true)
    })

    it('should return false when userId is missing', () => {
      localStorage.setItem('userPassword', 'test-password')
      
      expect(isUserLoggedIn()).toBe(false)
    })

    it('should return false when userPassword is missing', () => {
      localStorage.setItem('userId', 'test-user')
      
      expect(isUserLoggedIn()).toBe(false)
    })

    it('should return false when both are missing', () => {
      expect(isUserLoggedIn()).toBe(false)
    })
  })

  describe('checkLogoutParam', () => {
    it('should return true and logout when logout param is true', () => {
      localStorage.setItem('userId', 'test-user')
      localStorage.setItem('userPassword', 'test-password')
      window.location.search = '?logout=true'
      
      const result = checkLogoutParam()
      
      expect(result).toBe(true)
      expect(localStorage.getItem('userId')).toBeNull()
      expect(localStorage.getItem('userPassword')).toBeNull()
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/')
    })

    it('should return false when logout param is not present', () => {
      window.location.search = ''
      
      const result = checkLogoutParam()
      
      expect(result).toBe(false)
      expect(window.history.replaceState).not.toHaveBeenCalled()
    })

    it('should return false when logout param is not true', () => {
      window.location.search = '?logout=false'
      
      const result = checkLogoutParam()
      
      expect(result).toBe(false)
      expect(window.history.replaceState).not.toHaveBeenCalled()
    })
  })
})
