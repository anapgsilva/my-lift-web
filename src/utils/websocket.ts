import { WEBSOCKET_ENDPOINT, WEBSOCKET_SUBPROTOCOL } from './constants'
import { AccessToken } from '../types/koneApi'

export function openWebSocketConnection(
  accessToken: AccessToken,
  onMessage: (response: any) => void,
  onError: (error: string) => void
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket

    try {
      // Try to open the connection. Note that we have to set also subprotocol
      ws = new WebSocket(`${WEBSOCKET_ENDPOINT}?accessToken=${accessToken}`, WEBSOCKET_SUBPROTOCOL)
      
      // error and close events are absorbed until connection has been established
      ws.onerror = (error) => {
        onError('Failed to connect to the lift server. Please refresh page.')
        reject(new Error(`WebSocket error: ${error}`))
      }
      ws.onclose = (event) => {
        onError('Connection to the lift server closed. Please refresh page.')
        console.error(`WebSocket closed: ${event.code} ${event.reason}`)
        reject(event.code)
      }
      ws.onmessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data)
        console.info('Message received from server:', response)
        onMessage(response)
      }
      ws.onopen = () => {
        console.info('Web socket connection opened at ', new Date())
        // Once the connection is open, resolve promise with the WebSocket instance
        resolve(ws)
      }    
    } catch (error) {
      console.error('Error while opening WebSocket connection', error)
      onError('Failed to connect to the lift server. Please refresh page.')
      reject(error)
    }
  })
}
