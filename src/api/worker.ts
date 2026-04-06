export const WORKER_URL = 'https://wow-token-price.r-maryline90.workers.dev'

export interface Comparison {
  refPriceGold: number
  diffGold: number
  pct: string
  up: boolean
}

export interface WorkerTokenResponse {
  price: number        // en cuivre
  lastUpdated: number  // ms epoch
  comparisons: {
    h1: Comparison | null
    week: Comparison | null
    month: Comparison | null
  }
}

export async function fetchTokenPrice(): Promise<WorkerTokenResponse> {
  const response = await fetch(WORKER_URL)
  if (!response.ok) throw new Error(`Worker error: ${response.status}`)
  return response.json() as Promise<WorkerTokenResponse>
}
