export interface TokenSnapshot {
  price: number      // en cuivre
  timestamp: number  // ms epoch
}

export interface StoredData {
  current: TokenSnapshot | null
  history: TokenSnapshot[]  // les 24 derniers relevés
}

export interface StoredSettings {
  refreshInterval: number  // minutes, défaut 5
}

// Formate un prix en cuivre → { gold, silver, copper }
export function formatGold(copper: number): { gold: number; silver: number; copper: number } {
  return {
    gold: Math.floor(copper / 10000),
    silver: Math.floor((copper % 10000) / 100),
    copper: copper % 100,
  }
}

// Badge : "284k" pour 284 235g
export function formatBadge(copper: number): string {
  const gold = Math.floor(copper / 10000)
  if (gold >= 1_000_000) return `${(gold / 1_000_000).toFixed(1)}M`
  if (gold >= 1_000) return `${Math.round(gold / 1_000)}k`
  return `${gold}`
}
