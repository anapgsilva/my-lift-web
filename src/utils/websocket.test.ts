import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openWebSocketConnection } from './websocket'

describe('openWebSocketConnection', () => {
  let mockWs: any

  beforeEach(() => {
    mockWs = {
      onopen: null as any,
      onclose: null as any,
      onerror: null as any,
      onmessage: null as any,
      close: vi.fn(),
    }
    vi.stubGlobal('WebSocket', vi.fn(() => mockWs))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates WebSocket with correct URL and subprotocol', () => {
    openWebSocketConnection('test-token', vi.fn(), vi.fn())
    expect(global.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('?accessToken=test-token'),
      expect.any(String)
    )
  })

  it('resolves with the WebSocket instance when connection opens', async () => {
    const promise = openWebSocketConnection('token', vi.fn(), vi.fn())
    mockWs.onopen()
    expect(await promise).toBe(mockWs)
  })

  it('rejects and calls onError when WebSocket constructor throws', async () => {
    vi.stubGlobal('WebSocket', vi.fn(() => { throw new Error('Constructor error') }))
    const onError = vi.fn()
    const promise = openWebSocketConnection('token', vi.fn(), onError)
    expect(onError).toHaveBeenCalledWith('Failed to connect to the lift server. Please try again.')
    await expect(promise).rejects.toThrow('Constructor error')
  })

  it('calls onError and rejects when error fires before open', async () => {
    const onError = vi.fn()
    const promise = openWebSocketConnection('token', vi.fn(), onError)
    mockWs.onerror(new Event('error'))
    await expect(promise).rejects.toThrow()
    expect(onError).toHaveBeenCalledWith('Failed to connect to the lift server. Please try again.')
  })

  it('calls onError and rejects when socket closes before open', async () => {
    const onError = vi.fn()
    const promise = openWebSocketConnection('token', vi.fn(), onError)
    mockWs.onclose({ code: 1006, reason: '' })
    await expect(promise).rejects.toBeDefined()
    expect(onError).toHaveBeenCalledWith('Connection to the lift server closed. Please try again.')
  })

  it('calls onError when socket closes after open', async () => {
    const onError = vi.fn()
    const promise = openWebSocketConnection('token', vi.fn(), onError)
    mockWs.onopen()
    await promise
    mockWs.onclose({ code: 1006, reason: 'Server closed' })
    expect(onError).toHaveBeenCalledWith('Connection to the lift server closed. Please try again or refresh page.')
  })

  it('calls onError when socket errors after open', async () => {
    const onError = vi.fn()
    const promise = openWebSocketConnection('token', vi.fn(), onError)
    mockWs.onopen()
    await promise
    mockWs.onerror(new Event('error'))
    expect(onError).toHaveBeenCalledWith('Connection to the lift server lost. Please try again or refresh page.')
  })

  it('calls onMessage when a valid JSON message is received', async () => {
    const onMessage = vi.fn()
    const promise = openWebSocketConnection('token', onMessage, vi.fn())
    mockWs.onopen()
    await promise
    mockWs.onmessage({ data: JSON.stringify({ statusCode: 201 }) })
    expect(onMessage).toHaveBeenCalledWith({ statusCode: 201 })
  })

  it('does not call onMessage when message contains invalid JSON', async () => {
    const onMessage = vi.fn()
    const promise = openWebSocketConnection('token', onMessage, vi.fn())
    mockWs.onopen()
    await promise
    mockWs.onmessage({ data: 'not-json' })
    expect(onMessage).not.toHaveBeenCalled()
  })

  describe('connection timeout', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('rejects and calls onError if connection does not open within 10 s', async () => {
      const onError = vi.fn()
      const promise = openWebSocketConnection('token', vi.fn(), onError)
      vi.advanceTimersByTime(10_000)
      await expect(promise).rejects.toThrow('WebSocket connection timed out')
      expect(onError).toHaveBeenCalledWith('Failed to connect to the lift server. Please try again.')
    })

    it('does not reject after timeout if connection already opened', async () => {
      const onError = vi.fn()
      const promise = openWebSocketConnection('token', vi.fn(), onError)
      mockWs.onopen()
      vi.advanceTimersByTime(10_000)
      await expect(promise).resolves.toBe(mockWs)
      expect(onError).not.toHaveBeenCalled()
    })

    it('calls onError only once when onerror fires before timeout', async () => {
      const onError = vi.fn()
      const promise = openWebSocketConnection('token', vi.fn(), onError)
      mockWs.onerror(new Event('error'))
      vi.advanceTimersByTime(10_000)
      await expect(promise).rejects.toThrow()
      expect(onError).toHaveBeenCalledTimes(1)
    })
  })
})
