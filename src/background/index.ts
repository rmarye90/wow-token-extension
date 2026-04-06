import { fetchTokenPrice } from '../api/worker.js'
import { formatBadge } from '../types.js'
import type { StoredData, StoredSettings, TokenSnapshot } from '../types.js'

const ALARM_NAME = 'wow-token-refresh'

async function getSettings(): Promise<StoredSettings> {
  const result = await chrome.storage.sync.get('settings')
  return (result.settings as StoredSettings) ?? { refreshInterval: 5 }
}

async function saveData(snapshot: TokenSnapshot): Promise<void> {
  await chrome.storage.local.set({ data: { current: snapshot } satisfies StoredData })
}

async function refresh(): Promise<void> {
  try {
    const result = await fetchTokenPrice()
    await saveData({ price: result.price, timestamp: Date.now() })
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
  await scheduleAlarm(settings.refreshInterval)
})

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings()
  await scheduleAlarm(settings.refreshInterval)
  await refresh()
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) await refresh()
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'refresh') {
    refresh().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }))
    return true
  }
  if (message.type === 'settingsUpdated') {
    scheduleAlarm(message.interval ?? 5).then(() => refresh()).catch(() => {})
    sendResponse({ ok: true })
  }
})
