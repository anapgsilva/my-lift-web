import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { validateClientIdAndClientSecret, fetchAccessToken, getAccessTokenForSocket, _resetTokenCache } from './liftService'
import * as constants from '../utils/constants'

vi.mock('axios')
vi.mock('../utils/constants', async () => {
  const actual = await vi.importActual('../utils/constants')
  return {
    ...actual,
    getClientId: vi.fn(),
    getClientSecret: vi.fn(),
    BUILDING_ID: 'test-building',
    GROUP_ID: 'test-group'
  }
})

describe('koneApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetTokenCache()
  })

  describe('validateClientIdAndClientSecret', () => {
    it('should throw error when CLIENT_ID is empty', () => {
      expect(() => validateClientIdAndClientSecret('', 'secret')).toThrow(
        'CLIENT_ID and CLIENT_SECRET need to be defined'
      )
    })

    it('should throw error when CLIENT_SECRET is empty', () => {
      expect(() => validateClientIdAndClientSecret('client', '')).toThrow(
        'CLIENT_ID and CLIENT_SECRET need to be defined'
      )
    })

    it('should throw error when CLIENT_ID is placeholder', () => {
      expect(() => validateClientIdAndClientSecret('YOUR_CLIENT_ID', 'secret')).toThrow(
        'CLIENT_ID and CLIENT_SECRET need to be defined'
      )
    })

    it('should throw error when CLIENT_SECRET is placeholder', () => {
      expect(() => validateClientIdAndClientSecret('client', 'YOUR_CLIENT_SECRET')).toThrow(
        'CLIENT_ID and CLIENT_SECRET need to be defined'
      )
    })

    it('should not throw error with valid credentials', () => {
      expect(() => validateClientIdAndClientSecret('valid_client', 'valid_secret')).not.toThrow()
    })
  })

  describe('fetchAccessToken', () => {
    it('should return access token and expiry on successful request', async () => {
      const mockToken = 'mock_access_token'
      vi.mocked(axios).mockResolvedValue({
        data: { access_token: mockToken, expires_in: 3600 }
      })

      const result = await fetchAccessToken('client', 'secret', ['scope1'])

      expect(result).toEqual({ token: mockToken, expiresIn: 3600 })
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          auth: {
            username: 'client',
            password: 'secret'
          },
          data: {
            grant_type: 'client_credentials',
            scope: 'scope1'
          }
        })
      )
    })

    it('should throw error on failed request', async () => {
      vi.mocked(axios).mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      })

      await expect(fetchAccessToken('client', 'secret')).rejects.toThrow(
        'Error fetching the access token: 401 Unauthorized'
      )
    })
  })

  describe('getAccessTokenForSocket', () => {
    it('should fetch access token with credentials from localStorage', async () => {
      const mockToken = 'socket_access_token'
      vi.mocked(constants.getClientId).mockReturnValue('test-client')
      vi.mocked(constants.getClientSecret).mockReturnValue('test-secret')
      vi.mocked(axios).mockResolvedValue({
        data: { access_token: mockToken, expires_in: 3600 }
      })

      const token = await getAccessTokenForSocket()

      expect(token).toBe(mockToken)
      expect(constants.getClientId).toHaveBeenCalled()
      expect(constants.getClientSecret).toHaveBeenCalled()
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            username: 'test-client',
            password: 'test-secret'
          },
          data: expect.objectContaining({
            scope: expect.stringContaining('application/inventory')
          })
        })
      )
    })

    it('should return cached token without re-fetching when still valid', async () => {
      const mockToken = 'socket_access_token'
      vi.mocked(constants.getClientId).mockReturnValue('test-client')
      vi.mocked(constants.getClientSecret).mockReturnValue('test-secret')
      vi.mocked(axios).mockResolvedValue({
        data: { access_token: mockToken, expires_in: 3600 }
      })

      await getAccessTokenForSocket()
      const token = await getAccessTokenForSocket()

      expect(token).toBe(mockToken)
      expect(axios).toHaveBeenCalledTimes(1)
    })

    it('should re-fetch token when cached token is expired', async () => {
      vi.mocked(constants.getClientId).mockReturnValue('test-client')
      vi.mocked(constants.getClientSecret).mockReturnValue('test-secret')
      vi.mocked(axios).mockResolvedValue({
        data: { access_token: 'first_token', expires_in: 1 }
      })

      await getAccessTokenForSocket()

      // Advance time past expiry + 60s buffer
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 62_000)

      vi.mocked(axios).mockResolvedValue({
        data: { access_token: 'refreshed_token', expires_in: 3600 }
      })
      const token = await getAccessTokenForSocket()

      expect(token).toBe('refreshed_token')
      expect(axios).toHaveBeenCalledTimes(2)
    })

    it('should throw error when credentials are invalid', async () => {
      vi.mocked(constants.getClientId).mockReturnValue('')
      vi.mocked(constants.getClientSecret).mockReturnValue('test-secret')

      await expect(getAccessTokenForSocket()).rejects.toThrow(
        'CLIENT_ID and CLIENT_SECRET need to be defined'
      )
    })
  })
})
