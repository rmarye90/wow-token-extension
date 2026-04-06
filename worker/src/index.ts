interface Env {
  BNET_CLIENT_ID: string
  BNET_CLIENT_SECRET: string
}

interface Comparison {
  refPriceGold: number
  diffGold: number
  pct: string
  up: boolean
}

interface TokenResponse {
  price: number           // cuivre (Blizzard)
  lastUpdated: number     // ms epoch
  comparisons: {
    h1: Comparison | null
    week: Comparison | null
    month: Comparison | null
  }
}

interface Tp1pEntry {
  timestamp?: number
  date?: number
  price?: number
  average?: number
}

interface Tp1pResponse {
  over_day: Tp1pEntry[]
  month_avg: Tp1pEntry[]
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const OAUTH_URL = 'https://eu.battle.net/oauth/token'
const BLIZZARD_URL = 'https://eu.api.blizzard.com/data/wow/token/index?namespace=dynamic-eu'
const TP1P_URL = 'https://taspas1po.fr/wp-json/tp1p/v1/token?full=true'
const CACHE_KEY = 'https://wow-token-price.internal/v2'
const CACHE_TTL = 300 // 5 minutes

async function getAccessToken(env: Env): Promise<string> {
  const credentials = btoa(`${env.BNET_CLIENT_ID}:${env.BNET_CLIENT_SECRET}`)
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`OAuth failed: ${res.status}`)
  const body = await res.json() as { access_token: string }
  return body.access_token
}

function findClosest(entries: Tp1pEntry[], targetSec: number): Tp1pEntry | null {
  if (!entries.length) return null
  return entries.reduce((prev, curr) => {
    const tPrev = (prev.timestamp ?? prev.date ?? 0)
    const tCurr = (curr.timestamp ?? curr.date ?? 0)
    return Math.abs(tCurr - targetSec) < Math.abs(tPrev - targetSec) ? curr : prev
  })
}

function makeComparison(currentGold: number, ref: Tp1pEntry | null): Comparison | null {
  if (!ref) return null
  const refGold = ref.price ?? ref.average ?? 0
  if (!refGold) return null
  const diffGold = currentGold - refGold
  const pct = Math.abs((diffGold / refGold) * 100).toFixed(1)
  return { refPriceGold: refGold, diffGold, pct, up: diffGold >= 0 }
}

async function buildResponse(env: Env): Promise<TokenResponse> {
  const nowSec = Math.floor(Date.now() / 1000)

  const [token, tp1pRes] = await Promise.all([
    getAccessToken(env),
    fetch(TP1P_URL).then(r => r.ok ? r.json() as Promise<Tp1pResponse> : null).catch(() => null),
  ])

  const blizzardRes = await fetch(BLIZZARD_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!blizzardRes.ok) throw new Error(`Blizzard API failed: ${blizzardRes.status}`)

  const blizzard = await blizzardRes.json() as { price: number; last_updated_timestamp: number }
  const currentGold = Math.floor(blizzard.price / 10000)

  let comparisons: TokenResponse['comparisons'] = { h1: null, week: null, month: null }

  if (tp1pRes) {
    const ref1h = findClosest(
      tp1pRes.over_day.filter(e => (e.timestamp ?? 0) <= nowSec - 3600),
      nowSec - 3600,
    )
    const ref1week = findClosest(
      tp1pRes.month_avg.filter(e => (e.date ?? 0) <= nowSec - 7 * 86400),
      nowSec - 7 * 86400,
    )
    const ref1month = findClosest(
      tp1pRes.month_avg.filter(e => (e.date ?? 0) <= nowSec - 30 * 86400),
      nowSec - 30 * 86400,
    )

    comparisons = {
      h1: makeComparison(currentGold, ref1h),
      week: makeComparison(currentGold, ref1week),
      month: makeComparison(currentGold, ref1month),
    }
  }

  return {
    price: blizzard.price,
    lastUpdated: blizzard.last_updated_timestamp,
    comparisons,
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })

    const cache = caches.default
    const cached = await cache.match(CACHE_KEY)
    if (cached) {
      return new Response(cached.body, {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      })
    }

    try {
      const data = await buildResponse(env)
      const body = JSON.stringify(data)

      ctx.waitUntil(cache.put(CACHE_KEY, new Response(body, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL}` },
      })))

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
