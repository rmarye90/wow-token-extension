export interface TokenSnapshot {
  price: number      // en cuivre
  timestamp: number  // ms epoch
}

export interface StoredData {
  current: TokenSnapshot | null
  history: TokenSnapshot[]  // 30 jours max à ~5min d'intervalle
}

export interface StoredSettings {
  refreshInterval: number  // minutes, défaut 5
}

// 30 jours × 24h × 12 relevés/h = 8 640 max
export const MAX_HISTORY = 8_640

export function formatGold(copper: number): { gold: number; silver: number; copper: number } {
  return {
    gold: Math.floor(copper / 10000),
    silver: Math.floor((copper % 10000) / 100),
    copper: copper % 100,
  }
}

export function formatBadge(copper: number): string {
  const gold = Math.floor(copper / 10000)
  if (gold >= 1_000_000) return `${(gold / 1_000_000).toFixed(1)}M`
  if (gold >= 1_000) return `${Math.round(gold / 1_000)}k`
  return `${gold}`
}

// Trouve le snapshot le plus proche d'un timestamp cible
export function findClosest(history: TokenSnapshot[], targetMs: number): TokenSnapshot | null {
  if (!history.length) return null
  return history.reduce((prev, curr) =>
    Math.abs(curr.timestamp - targetMs) < Math.abs(prev.timestamp - targetMs) ? curr : prev
  )
}

// Retourne la diff en gold et le % entre deux snapshots
export function diffFrom(current: TokenSnapshot, reference: TokenSnapshot): {
  diffGold: number
  pct: string
  up: boolean
} {
  const diffCopper = current.price - reference.price
  const diffGold = Math.round(diffCopper / 10000)
  const pct = Math.abs((diffCopper / reference.price) * 100).toFixed(1)
  return { diffGold, pct, up: diffCopper >= 0 }
}
