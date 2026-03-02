import { WEBSOCKET_ENDPOINT, WEBSOCKET_SUBPROTOCOL } from './constants'
import { AccessToken } from '../types/koneApi'

const WEBSOCKET_CONNECT_TIMEOUT_MS = 10_000

export function openWebSocketConnection(
  accessToken: AccessToken,
  onMessage: (response: any) => void,
  onError: (error: string) => void
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket
    let settled = false

    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      fn()
    }

    const timeout = setTimeout(() => {
      settle(() => {
        ws?.close()
        onError('Failed to connect to the lift server. Please refresh page.')
        reject(new Error('WebSocket connection timed out'))
      })
    }, WEBSOCKET_CONNECT_TIMEOUT_MS)

    try {
      // Try to open the connection. Note that we have to set also subprotocol
      ws = new WebSocket(`${WEBSOCKET_ENDPOINT}?accessToken=${accessToken}`, WEBSOCKET_SUBPROTOCOL)

      // error and close events are absorbed until connection has been established
      ws.onerror = (error) => {
        settle(() => {
          onError('Failed to connect to the lift server. Please refresh page.')
          reject(new Error(`WebSocket error: ${error}`))
        })
      }
      ws.onclose = (event) => {
        settle(() => {
          onError('Connection to the lift server closed. Please refresh page.')
          console.error(`WebSocket closed: ${event.code} ${event.reason}`)
          reject(event.code)
        })
      }
      ws.onmessage = (event: MessageEvent) => {
        let response: unknown
        try {
          response = JSON.parse(event.data)
        } catch {
          console.error('Failed to parse WebSocket message:', event.data)
          return
        }
        console.info('Message received from server:', response)
        onMessage(response)
      }
      ws.onopen = () => {
        settle(() => {
          console.info('Web socket connection opened at ', new Date())
          ws.onclose = (event) => {
            console.error(`WebSocket closed after connect: ${event.code} ${event.reason}`)
            onError('Connection to the lift server closed. Please refresh page.')
          }
          ws.onerror = (error) => {
            console.error('WebSocket error after connect:', error)
            onError('Connection to the lift server lost. Please refresh page.')
          }
          resolve(ws)
        })
      }
    } catch (error) {
      settle(() => {
        console.error('Error while opening WebSocket connection', error)
        onError('Failed to connect to the lift server. Please refresh page.')
        reject(error)
      })
    }
  })
}
