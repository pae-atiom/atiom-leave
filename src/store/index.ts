// localStorage bridge: the single place that reads/writes persisted state.
// Everything else goes through getStore() / mutateStore(). On the server
// (SSR) localStorage is absent — we return an ephemeral seed so reads don't
// crash; the app runs in SPA mode so guarded content renders on the client.

import type { AppStore } from '#/types'
import { SEED_VERSION, buildSeedStore } from './seed'

const LS_KEY = 'atiom_leave_store'

let cache: AppStore | null = null

function loadFromStorage(): AppStore {
  if (typeof localStorage === 'undefined') {
    // SSR / non-browser: ephemeral seed, never persisted.
    return buildSeedStore()
  }
  const raw = localStorage.getItem(LS_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppStore
      if (parsed.seedVersion === SEED_VERSION) return parsed
    } catch {
      // fall through to re-seed on corrupt data
    }
  }
  const seeded = buildSeedStore()
  localStorage.setItem(LS_KEY, JSON.stringify(seeded))
  return seeded
}

export function getStore(): AppStore {
  if (!cache) cache = loadFromStorage()
  return cache
}

function persist(): void {
  if (typeof localStorage === 'undefined' || !cache) return
  localStorage.setItem(LS_KEY, JSON.stringify(cache))
}

/** Mutate the store in place and persist. Returns whatever the updater returns. */
export function mutateStore<T>(updater: (store: AppStore) => T): T {
  const store = getStore()
  const result = updater(store)
  persist()
  return result
}

/** Drop the in-memory cache so the next read reloads from localStorage. */
export function clearStoreCache(): void {
  cache = null
}

export * from './seed'
