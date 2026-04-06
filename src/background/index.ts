import { fetchTokenPrice } from '../api/blizzard.js'
import { formatBadge } from '../types.js'
import type { StoredData, StoredSettings, TokenSnapshot } from '../types.js'

const ALARM_NAME = 'wow-token-refresh'
const MAX_HISTORY = 24

async function getSettings(): Promise<StoredSettings | null> {
  const result = await chrome.storage.sync.get('settings')
  return (result.settings as StoredSettings) ?? null
}

async function getStoredData(): Promise<StoredData> {
  const result = await chrome.storage.local.get('data')
  return (result.data as StoredData) ?? { current: null, history: [] }
}

async function saveData(snapshot: TokenSnapshot): Promise<void> {
  const existing = await getStoredData()
  const history = [...existing.history, snapshot].slice(-MAX_HISTORY)
  await chrome.storage.local.set({ data: { current: snapshot, history } satisfies StoredData })
}

async function refresh(): Promise<void> {
  const settings = await getSettings()
  if (!settings?.clientId || !settings?.clientSecret) {
    chrome.action.setBadgeText({ text: '?' })
    chrome.action.setBadgeBackgroundColor({ color: '#666666' })
    return
  }

  try {
    const result = await fetchTokenPrice(settings.clientId, settings.clientSecret)
    const snapshot: TokenSnapshot = {
      price: result.price,
      timestamp: Date.now(),
    }
    await saveData(snapshot)

    chrome.action.setBadgeText({ text: formatBadge(result.price) })
    chrome.action.setBadgeBackgroundColor({ color: '#C69B3A' })
  } catch {
    chrome.action.setBadgeText({ text: 'ERR' })
    chrome.action.setBadgeBackgroundColor({ color: '#CC0000' })
  }
}

async function scheduleAlarm(intervalMinutes: number): Promise<void> {
  await chrome.alarms.clear(ALARM_NAME)
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: intervalMinutes,
    delayInMinutes: 0,
  })
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings()
  await scheduleAlarm(settings?.refreshInterval ?? 5)
})

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings()
  await scheduleAlarm(settings?.refreshInterval ?? 5)
  await refresh()
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await refresh()
  }
})

// Écoute les messages depuis le popup (ex: refresh manuel)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'refresh') {
    refresh().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }))
    return true // async response
  }
  if (message.type === 'settingsUpdated') {
    scheduleAlarm(message.interval ?? 5).then(() => refresh()).catch(() => {})
    sendResponse({ ok: true })
  }
})
