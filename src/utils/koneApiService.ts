import axios, { type AxiosError, AxiosRequestConfig } from 'axios'
import _ from 'lodash'
import { AccessToken } from '../types/koneApi'
import { API_AUTH_TOKEN_ENDPOINT_V2, BUILDING_ID, CLIENT_ID, CLIENT_SECRET, GROUP_ID } from './constants'

export const validateClientIdAndClientSecret = (CLIENT_ID: string, CLIENT_SECRET: string) => {
  if (
    _.isEmpty(CLIENT_ID) ||
    _.isEmpty(CLIENT_SECRET) ||
    CLIENT_ID === 'YOUR_CLIENT_ID' ||
    CLIENT_SECRET === 'YOUR_CLIENT_SECRET'
  )
    throw Error('CLIENT_ID and CLIENT_SECRET needs to be defined')
}

export async function fetchAccessToken(
  clientId: string,
  clientSecret: string,
  scopes?: string[]
): Promise<AccessToken> {

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

    // get the accessToken from the response
    const accessToken = requestResult.data.access_token
    return accessToken

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

export async function getAccessTokenForSocket(): Promise<AccessToken> {
  // Establish connection to external API at startup
  validateClientIdAndClientSecret(CLIENT_ID, CLIENT_SECRET)
  let accessToken = await fetchAccessToken(CLIENT_ID, CLIENT_SECRET, [
    'application/inventory',
    `callgiving/group:${BUILDING_ID}:${GROUP_ID}`,
  ])
  console.log('AccessToken successfully fetched')
  return accessToken
}
