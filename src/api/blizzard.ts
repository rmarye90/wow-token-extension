import type { WowTokenApiResponse } from '../types.js'

const OAUTH_URL = 'https://eu.battle.net/oauth/token'
const API_URL = 'https://eu.api.blizzard.com/data/wow/token/index'

interface CachedToken {
  token: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Échec OAuth: ${response.status} ${response.statusText}`)
  }

  const body = await response.json() as { access_token: string; expires_in: number }
  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  }
  return cachedToken.token
}

export async function fetchTokenPrice(clientId: string, clientSecret: string): Promise<WowTokenApiResponse> {
  const token = await getAccessToken(clientId, clientSecret)

  const url = new URL(API_URL)
  url.searchParams.set('namespace', 'dynamic-eu')
  url.searchParams.set('locale', 'fr_FR')

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Échec API: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<WowTokenApiResponse>
}
