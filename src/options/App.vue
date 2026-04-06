<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { StoredSettings } from '../types.js'

const refreshInterval = ref(5)
const status = ref<'idle' | 'saved'>('idle')

async function load(): Promise<void> {
  const result = await chrome.storage.sync.get('settings')
  const s = result.settings as StoredSettings | undefined
  if (s) refreshInterval.value = s.refreshInterval
}

async function save(): Promise<void> {
  const settings: StoredSettings = { refreshInterval: refreshInterval.value }
  await chrome.storage.sync.set({ settings })
  await chrome.runtime.sendMessage({ type: 'settingsUpdated', interval: refreshInterval.value })
  status.value = 'saved'
  setTimeout(() => { status.value = 'idle' }, 2000)
}

onMounted(load)
</script>

<template>
  <div class="options">
    <h1>WoW Token Price — Options</h1>

    <section>
      <h2>Actualisation</h2>
      <div class="field">
        <label for="interval">Intervalle</label>
        <select id="interval" v-model="refreshInterval">
          <option :value="1">1 minute</option>
          <option :value="2">2 minutes</option>
          <option :value="5">5 minutes</option>
          <option :value="10">10 minutes</option>
          <option :value="30">30 minutes</option>
        </select>
      </div>
    </section>

    <div v-if="status === 'saved'" class="msg success">Paramètres enregistrés.</div>

    <button class="btn-save" @click="save">Enregistrer</button>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d0d14;
  color: #e0d8c8;
  padding: 24px;
}

.options {
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

h1 {
  font-size: 18px;
  color: #c8a84b;
  font-weight: 600;
}

section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #1e1e2e;
  padding-bottom: 6px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

label {
  font-size: 12px;
  color: #aaa;
  font-weight: 500;
}

select {
  background: #1e1e2e;
  border: 1px solid #2a2a3e;
  color: #e0d8c8;
  border-radius: 5px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}
select:focus { border-color: #c8a84b; }

.msg.success {
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 5px;
  background: #0a2a0a;
  color: #6BFF6B;
  border: 1px solid #1a5a1a;
}

.btn-save {
  background: #c8a84b;
  color: #0d0d14;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.15s;
}
.btn-save:hover { background: #debb5e; }
</style>
