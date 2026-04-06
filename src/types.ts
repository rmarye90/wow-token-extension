export interface TokenSnapshot {
  price: number      // en cuivre
  timestamp: number  // ms epoch
}

export interface StoredData {
  current: TokenSnapshot | null
}

export interface StoredSettings {
  refreshInterval: number  // minutes, défaut 5
}

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
