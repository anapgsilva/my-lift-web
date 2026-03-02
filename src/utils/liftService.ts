import axios, { type AxiosError, AxiosRequestConfig } from 'axios'
import _ from 'lodash'
import { AccessToken, DestinationCallPayload } from '../types/koneApi'
import { API_AUTH_TOKEN_ENDPOINT_V2, BUILDING_ID, getClientId, getClientSecret, GROUP_ID, TARGET_BUILDING_ID } from './constants'
import { koneApiMapping } from './mapping'
import { getRequestId } from './numbers'

export const validateClientIdAndClientSecret = (CLIENT_ID: string, CLIENT_SECRET: string) => {
  if (
    _.isEmpty(CLIENT_ID) ||
    _.isEmpty(CLIENT_SECRET) ||
    CLIENT_ID === 'YOUR_CLIENT_ID' ||
    CLIENT_SECRET === 'YOUR_CLIENT_SECRET'
  )
    throw Error('CLIENT_ID and CLIENT_SECRET need to be defined')
}

export async function fetchAccessToken(
  clientId: string,
  clientSecret: string,
  scopes?: string[]
): Promise<{ token: AccessToken; expiresIn: number }> {

  const requestConfig: AxiosRequestConfig = {
    method: 'POST',
    url: API_AUTH_TOKEN_ENDPOINT_V2,
    auth: {
      username: clientId,
      password: clientSecret,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: {
      grant_type: 'client_credentials',
      scope: scopes ? scopes.join(' ') : '',
    },
  }

  try {
    const requestResult = await axios(requestConfig)

    return {
      token: requestResult.data.access_token,
      expiresIn: requestResult.data.expires_in,
    }

  } catch (authError: unknown){
    let errorMsg = 'Error fetching the access token'

    const result = authError as AxiosError;

    if (result.response) {
      const responseData = result.response.data as { message?: string }
      errorMsg += `: ${result.response.status} ${responseData.message}`
    }

    console.error('Check that you have set the CLIENT_ID and CLIENT_SECRET environment variables correctly.')
    throw new Error(errorMsg)

  }
}

let tokenCache: { value: AccessToken; expiresAt: number } | null = null

export function _resetTokenCache(): void {
  tokenCache = null
}

export async function getAccessTokenForSocket(): Promise<AccessToken> {
  const CLIENT_ID = getClientId()
  const CLIENT_SECRET = getClientSecret()
  validateClientIdAndClientSecret(CLIENT_ID, CLIENT_SECRET)

  // Return cached token if still valid with at least 60 s to spare
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value
  }

  const { token, expiresIn } = await fetchAccessToken(CLIENT_ID, CLIENT_SECRET, [
    'application/inventory',
    `callgiving/group:${BUILDING_ID}:${GROUP_ID}`,
  ])
  tokenCache = { value: token, expiresAt: Date.now() + expiresIn * 1000 }
  console.info('AccessToken successfully fetched')
  return tokenCache.value
}

export function sendLiftCall(
  ws: WebSocket | null,
  floors: number[],
  onError: (msg: string) => void
): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      const payload: DestinationCallPayload = {
        type: 'lift-call-api-v2',
        buildingId: TARGET_BUILDING_ID,
        callType: 'action',
        groupId: GROUP_ID,
        payload: {
          request_id: getRequestId(),
          area: koneApiMapping[String(floors[0])],
          time: new Date().toISOString(),
          terminal: 1,
          call: {
            action: 2,
            destination: koneApiMapping[String(floors[1])],
          },
        }
      }
      ws.send(JSON.stringify(payload))
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  } else {
    console.warn("WebSocket not connected.")
    onError("Failed to call the lift because the connection to the lift server was interrupted. Please try again or refresh page.")
  }
}
