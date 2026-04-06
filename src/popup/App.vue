<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatGold } from '../types.js'
import { fetchTokenPrice } from '../api/worker.js'
import type { WorkerTokenResponse } from '../api/worker.js'

const tokenData = ref<WorkerTokenResponse | null>(null)
const loading = ref(false)
const error = ref(false)

const formatted = computed(() => {
  if (!tokenData.value) return null
  return formatGold(tokenData.value.price)
})

const lastUpdated = computed(() => {
  if (!tokenData.value) return null
  const diff = Date.now() - tokenData.value.lastUpdated
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes === 1) return 'il y a 1 min'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `il y a ${hours}h`
})

const PERIOD_LABELS: Record<'h1' | 'week' | 'month', string> = {
  h1: 'il y a 1h',
  week: 'il y a 1 sem',
  month: 'il y a 1 mois',
}

const comparisons = computed(() => {
  if (!tokenData.value) return []
  const c = tokenData.value.comparisons
  return (['h1', 'week', 'month'] as const).map(key => ({
    label: PERIOD_LABELS[key],
    data: c[key],
  }))
})

async function load(): Promise<void> {
  loading.value = true
  error.value = false
  try {
    tokenData.value = await fetchTokenPrice()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function openOptions(): void {
  chrome.runtime.openOptionsPage()
}

onMounted(load)
</script>

<template>
  <div class="popup">
    <header>
      <span class="title">WoW Token</span>
      <span class="region">EU</span>
    </header>

    <div v-if="loading" class="state">Chargement…</div>
    <div v-else-if="error" class="state err">Erreur de connexion.</div>

    <template v-else-if="tokenData">
      <div class="price-block">
        <div class="price-main">
          <span class="gold">{{ formatted!.gold.toLocaleString('fr-FR') }}</span><span class="unit">g</span>
        </div>
      </div>

      <div class="comparisons">
        <div v-for="c in comparisons" :key="c.label" class="row">
          <span class="period">{{ c.label }}</span>
          <span v-if="!c.data" class="na">—</span>
          <span v-else class="diff" :class="c.data.up ? 'up' : 'down'">
            {{ c.data.up ? '▲' : '▼' }}
            {{ c.data.diffGold > 0 ? '+' : '' }}{{ c.data.diffGold.toLocaleString('fr-FR') }}g
            <span class="pct">({{ c.data.up ? '+' : '-' }}{{ c.data.pct }}%)</span>
          </span>
        </div>
      </div>

      <div class="meta">MAJ Blizzard : {{ lastUpdated }}</div>
    </template>

    <footer>
      <button class="btn-icon" :disabled="loading" title="Rafraîchir" @click="load">
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

.state {
  text-align: center;
  font-size: 12px;
  color: #666;
  padding: 12px 0;
}
.state.err { color: #F44336; }

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

.gold { color: #FFD700; }
.unit { font-size: 12px; color: #666; margin-right: 4px; }

.comparisons {
  display: flex;
  flex-direction: column;
  gap: 5px;
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

.period { color: #666; }
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

footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
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
