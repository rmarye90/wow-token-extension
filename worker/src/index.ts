interface Env {
  BNET_CLIENT_ID: string
  BNET_CLIENT_SECRET: string
}

interface TokenResponse {
  price: number
  lastUpdated: number
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const OAUTH_URL = 'https://eu.battle.net/oauth/token'
const API_URL = 'https://eu.api.blizzard.com/data/wow/token/index?namespace=dynamic-eu&locale=fr_FR'
const CACHE_KEY = 'https://wow-token-price.internal/cached'
const CACHE_TTL = 300 // 5 minutes

async function getAccessToken(env: Env): Promise<string> {
  const credentials = btoa(`${env.BNET_CLIENT_ID}:${env.BNET_CLIENT_SECRET}`)
  const response = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`OAuth failed: ${response.status}`)
  }

  const body = await response.json() as { access_token: string }
  return body.access_token
}

async function fetchFromBlizzard(env: Env): Promise<TokenResponse> {
  const token = await getAccessToken(env)
  const response = await fetch(API_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`API failed: ${response.status}`)
  }

  const body = await response.json() as { price: number; last_updated_timestamp: number }
  return { price: body.price, lastUpdated: body.last_updated_timestamp }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const cache = caches.default
    const cached = await cache.match(CACHE_KEY)
    if (cached) {
      return new Response(cached.body, {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      })
    }

    try {
      const data = await fetchFromBlizzard(env)
      const body = JSON.stringify(data)

      const responseToCache = new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL}`,
        },
      })
      ctx.waitUntil(cache.put(CACHE_KEY, responseToCache))

      return new Response(body, {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  },
}
