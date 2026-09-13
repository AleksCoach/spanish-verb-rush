import type { ItemStat, SaveData } from './types'

// Profile graczy i ich postęp trzymamy w localStorage przeglądarki (per urządzenie).
const PROFILES_KEY = 'svr.profiles.v1'
const ACTIVE_KEY = 'svr.active.v1'
const saveKey = (profileId: string) => `svr.save.v1.${profileId}`

export type Profile = {
  id: string
  name: string
  /** skrót PIN-u — blokada przed graniem na cudzym profilu, nie zabezpieczenie danych */
  pin: string
  created: number
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // tryb prywatny / zablokowany storage — gra działa dalej bez zapisu
  }
}

export function emptySave(): SaveData {
  return { version: 1, xp: 0, unlocked: 1, bestCombo: 0, levels: {}, stats: {}, sound: true }
}

export function loadProfiles(): Profile[] {
  const list = read<Profile[]>(PROFILES_KEY, [])
  return Array.isArray(list) ? list : []
}

export function hashPin(name: string, pin: string): string {
  // FNV-1a — wystarczy do porównania PIN-u, nie jest to kryptografia
  let h = 0x811c9dc5
  for (const ch of `${name.toLowerCase()}#${pin}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export function createProfile(name: string, pin: string): Profile {
  const profile: Profile = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    pin: hashPin(name.trim(), pin),
    created: Date.now(),
  }
  write(PROFILES_KEY, [...loadProfiles(), profile])
  return profile
}

export function updateProfilePin(profile: Profile, pin: string): Profile {
  const next = { ...profile, pin: hashPin(profile.name, pin) }
  write(
    PROFILES_KEY,
    loadProfiles().map((p) => (p.id === profile.id ? next : p)),
  )
  return next
}

export function checkPin(profile: Profile, pin: string): boolean {
  return profile.pin === hashPin(profile.name, pin)
}

export function getActiveProfile(): Profile | null {
  const id = read<string | null>(ACTIVE_KEY, null)
  return loadProfiles().find((p) => p.id === id) ?? null
}

export function setActiveProfile(id: string | null): void {
  write(ACTIVE_KEY, id)
}

export function loadSave(profileId: string): SaveData {
  const data = read<Partial<SaveData> | null>(saveKey(profileId), null)
  if (!data || data.version !== 1) return emptySave()
  return { ...emptySave(), ...data }
}

export function writeSave(profileId: string, data: SaveData): void {
  write(saveKey(profileId), data)
}

export function clearSave(profileId: string): void {
  write(saveKey(profileId), null)
}

export function itemKey(verb: string, person: string): string {
  return `${verb}|${person}`
}

export function emptyStat(): ItemStat {
  return { attempts: 0, correct: 0, wrong: 0, streak: 0 }
}
