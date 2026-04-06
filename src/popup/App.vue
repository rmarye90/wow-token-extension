<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatGold, findClosest, diffFrom } from '../types.js'
import type { StoredData, TokenSnapshot } from '../types.js'

const data = ref<StoredData | null>(null)
const loading = ref(false)

const current = computed<TokenSnapshot | null>(() => data.value?.current ?? null)

const formatted = computed(() => {
  if (!current.value) return null
  return formatGold(current.value.price)
})

const lastUpdated = computed(() => {
  if (!current.value) return null
  const diff = Date.now() - current.value.timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes === 1) return 'il y a 1 min'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `il y a ${hours}h`
})

const PERIODS = [
  { label: '1h',    ms: 60 * 60_000 },
  { label: '1 sem', ms: 7 * 24 * 60 * 60_000 },
  { label: '1 mois', ms: 30 * 24 * 60 * 60_000 },
]

const comparisons = computed(() => {
  const curr = current.value
  const history = data.value?.history
  if (!curr || !history) return []

  return PERIODS.map(({ label, ms }) => {
    const target = curr.timestamp - ms
    const ref = findClosest(history.filter(s => s.timestamp <= curr.timestamp - ms * 0.5), target)
    if (!ref) return { label, available: false as const }
    const { diffGold, pct, up } = diffFrom(curr, ref)
    return { label, available: true as const, diffGold, pct, up }
  })
})

async function loadData(): Promise<void> {
  const result = await chrome.storage.local.get('data')
  data.value = (result.data as StoredData) ?? { current: null, history: [] }
}

async function refresh(): Promise<void> {
  loading.value = true
  await chrome.runtime.sendMessage({ type: 'refresh' })
  await loadData()
  loading.value = false
}

function openOptions(): void {
  chrome.runtime.openOptionsPage()
}

onMounted(loadData)
</script>

<template>
  <div class="popup">
    <header>
      <span class="title">WoW Token</span>
      <span class="region">EU</span>
    </header>

    <div v-if="!current" class="no-data">
      <p>Aucune donnée disponible.</p>
      <button class="btn-primary" :disabled="loading" @click="refresh">
        {{ loading ? '…' : 'Charger' }}
      </button>
    </div>

    <template v-else>
      <div class="price-block">
        <div class="price-main">
          <span class="gold">{{ formatted!.gold.toLocaleString('fr-FR') }}</span><span class="unit">g</span>
          <span class="silver">{{ String(formatted!.silver).padStart(2, '0') }}</span><span class="unit">s</span>
          <span class="copper-val">{{ String(formatted!.copper).padStart(2, '0') }}</span><span class="unit">c</span>
        </div>
      </div>

      <div class="comparisons">
        <div
          v-for="c in comparisons"
          :key="c.label"
          class="row"
        >
          <span class="period">{{ c.label }}</span>
          <span v-if="!c.available" class="na">—</span>
          <span v-else class="diff" :class="c.up ? 'up' : 'down'">
            {{ c.up ? '▲' : '▼' }}
            {{ c.diffGold > 0 ? '+' : '' }}{{ c.diffGold.toLocaleString('fr-FR') }}g
            <span class="pct">({{ c.up ? '+' : '-' }}{{ c.pct }}%)</span>
          </span>
        </div>
      </div>

      <div class="meta">MAJ : {{ lastUpdated }}</div>
    </template>

    <footer>
      <button class="btn-icon" :disabled="loading" title="Rafraîchir" @click="refresh">
        <span :class="{ spin: loading }">↻</span>
      </button>
      <button class="btn-icon" title="Options" @click="openOptions">⚙</button>
    </footer>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d0d14;
  color: #e0d8c8;
}

.popup {
  width: 240px;
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: #c8a84b;
  letter-spacing: 0.5px;
}

.region {
  font-size: 11px;
  background: #1e1e2e;
  color: #888;
  padding: 1px 6px;
  border-radius: 3px;
}

.price-block {
  text-align: center;
  padding: 6px 0 2px;
}

.price-main {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.gold      { color: #FFD700; }
.silver    { color: #C0C0C0; font-size: 15px; }
.copper-val { color: #B87333; font-size: 13px; }
.unit      { font-size: 12px; color: #666; margin-right: 4px; }

.comparisons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid #1e1e2e;
  border-bottom: 1px solid #1e1e2e;
  padding: 8px 0;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.period {
  color: #666;
  min-width: 48px;
}

.na { color: #444; font-size: 11px; }

.diff { font-weight: 600; }
.diff.up   { color: #4CAF50; }
.diff.down { color: #F44336; }

.pct {
  font-weight: 400;
  font-size: 11px;
  opacity: 0.8;
}

.meta {
  text-align: center;
  font-size: 11px;
  color: #555;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 12px;
  color: #888;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.btn-primary {
  background: #c8a84b;
  color: #0d0d14;
  border: none;
  border-radius: 4px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-icon {
  background: #1e1e2e;
  color: #888;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.15s;
}
.btn-icon:hover { color: #c8a84b; }
.btn-icon:disabled { opacity: 0.4; cursor: default; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 1s linear infinite; }
</style>
