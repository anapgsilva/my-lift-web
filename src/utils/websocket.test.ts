import { describe, it, expect, beforeEach, vi } from 'vitest'
import { openWebSocketConnection } from '../utils/websocket'

describe('websocket', () => {
  let mockWs: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockWs = {
      url: 'wss://example.com?accessToken=test-token',
      onerror: null,
      onclose: null,
      onmessage: null,
      onopen: null
    }
    global.WebSocket = vi.fn(() => mockWs) as any
  })

  describe('openWebSocketConnection', () => {
    it('should create WebSocket with correct URL and subprotocol', () => {
      const onMessage = vi.fn()
      const onError = vi.fn()
      
      openWebSocketConnection('test-token', onMessage, onError)
      
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('?accessToken=test-token'),
        expect.any(String)
      )
    })

    it('should resolve with WebSocket on successful connection', async () => {
      const onMessage = vi.fn()
      const onError = vi.fn()
      
      const promise = openWebSocketConnection('test-token', onMessage, onError)
      mockWs.onopen()
      
      const result = await promise
      expect(result).toBe(mockWs)
    })

    it('should call onMessage when message received', () => {
      const onMessage = vi.fn()
      const onError = vi.fn()
      const messageData = { type: 'test', data: 'value' }
      
      openWebSocketConnection('test-token', onMessage, onError)
      mockWs.onmessage({ data: JSON.stringify(messageData) })
      
      expect(onMessage).toHaveBeenCalledWith(messageData)
    })

    it('should call onError and reject on connection error', async () => {
      const onMessage = vi.fn()
      const onError = vi.fn()
      
      const promise = openWebSocketConnection('test-token', onMessage, onError)
      mockWs.onerror(new Event('error'))
      
      expect(onError).toHaveBeenCalledWith('Failed to connect to the lift server. Please refresh page.')
      await expect(promise).rejects.toThrow()
    })

    it('should call onError and reject on connection close', async () => {
      const onMessage = vi.fn()
      const onError = vi.fn()
      
      const promise = openWebSocketConnection('test-token', onMessage, onError)
      mockWs.onclose({ code: 1006, reason: 'Connection lost' })
      
      expect(onError).toHaveBeenCalledWith('Connection to the lift server closed. Please refresh page.')
      await expect(promise).rejects.toBe(1006)
    })

    it('should reject on WebSocket constructor error', async () => {
      global.WebSocket = vi.fn(() => { throw new Error('Constructor error') }) as any
      const onMessage = vi.fn()
      const onError = vi.fn()
      
      const promise = openWebSocketConnection('test-token', onMessage, onError)
      
      expect(onError).toHaveBeenCalledWith('Failed to connect to the lift server. Please refresh page.')
      await expect(promise).rejects.toThrow('Constructor error')
    })
  })
})
