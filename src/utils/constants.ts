export const API_HOSTNAME = import.meta.env.VITE_API_HOSTNAME || 'dev.kone.com'
export const API_AUTH_TOKEN_ENDPOINT_V2 = import.meta.env.VITE_API_AUTH_TOKEN_ENDPOINT || `https://${API_HOSTNAME}/api/v2/oauth2/token`
export const WEBSOCKET_ENDPOINT = import.meta.env.VITE_WEBSOCKET_ENDPOINT || `wss://${API_HOSTNAME}/stream-v2`
export const WEBSOCKET_SUBPROTOCOL = import.meta.env.VITE_WEBSOCKET_SUBPROTOCOL || 'koneapi'

export const getClientId = (): string => localStorage.getItem('userId') || import.meta.env.VITE_CLIENT_ID || ''
export const getClientSecret = (): string => localStorage.getItem('userPassword') || import.meta.env.VITE_CLIENT_SECRET || ''

export const BUILDING_ID: string = import.meta.env.VITE_BUILDING_ID || ''
export const GROUP_ID: string = import.meta.env.VITE_GROUP_ID || ''
export const BUILDING_ID_PREFIX = 'building:'
export const TARGET_BUILDING_ID: string = `${BUILDING_ID_PREFIX}${BUILDING_ID}`
