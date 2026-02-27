import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { validateClientIdAndClientSecret, fetchAccessToken, getAccessTokenForSocket } from './liftService'
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
    it('should return access token on successful request', async () => {
      const mockToken = 'mock_access_token'
      vi.mocked(axios).mockResolvedValue({
        data: { access_token: mockToken }
      })

      const token = await fetchAccessToken('client', 'secret', ['scope1'])

      expect(token).toBe(mockToken)
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
        data: { access_token: mockToken }
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

    it('should throw error when credentials are invalid', async () => {
      vi.mocked(constants.getClientId).mockReturnValue('')
      vi.mocked(constants.getClientSecret).mockReturnValue('test-secret')

      await expect(getAccessTokenForSocket()).rejects.toThrow(
        'CLIENT_ID and CLIENT_SECRET need to be defined'
      )
    })
  })
})
