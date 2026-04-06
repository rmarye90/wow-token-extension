// URL du Worker Cloudflare déployé.
// Après `wrangler deploy`, remplacer par l'URL réelle.
export const WORKER_URL = 'https://wow-token-price.r-maryline90.workers.dev'

export interface WorkerTokenResponse {
  price: number
  lastUpdated: number
}

export async function fetchTokenPrice(): Promise<WorkerTokenResponse> {
  const response = await fetch(WORKER_URL)

  if (!response.ok) {
    throw new Error(`Worker error: ${response.status}`)
  }

  return response.json() as Promise<WorkerTokenResponse>
}
