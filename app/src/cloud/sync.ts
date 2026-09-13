import type { Grade, SaveData } from '../game/types'

// Synchronizacja aktywności z panelem rodzica (Supabase, tylko funkcje RPC).
// Działa wyłącznie po połączeniu profilu kodem rodzica — bez kodu gra nic nie wysyła.

export const SUPABASE_URL = 'https://tahlvejjcflvegmpmjvh.supabase.co'
/** klucz publiczny (publishable) — do użycia w przeglądarce; dane chronią RLS i funkcje po stronie bazy */
export const SUPABASE_KEY = 'sb_publishable_GUEJtYh_kJzEF0VuXSfl7g_Ac1cf-Fo'

export async function rpc<T>(fn: string, args: Record<string, unknown>, keepalive = false): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    keepalive,
  })
  if (!res.ok) throw new Error(`${fn}: HTTP ${res.status}`)
  return (await res.json()) as T
}

type MinuteBucket = { activeSec: number; answers: number; correct: number }

export type RoundPayload = {
  id: string
  finishedAt: string
  levelKey: string
  levelName: string
  levelKind: string
  score: number
  stars: number
  answers: number
  correct: number
  durationSec: number
}

export type CloudState = {
  deviceId: string
  familyCode: string | null
  minutes: Record<string, MinuteBucket>
  rounds: RoundPayload[]
  lastSyncAt: number | null
  lastError: string | null
}

const storageKey = (profileId: string) => `svr.cloud.v1.${profileId}`
const memory = new Map<string, CloudState>()

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16))
  hex[12] = '4'
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  const h = hex.join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function loadCloud(profileId: string): CloudState {
  const cached = memory.get(profileId)
  if (cached) return cached
  let state: CloudState | null = null
  try {
    const raw = localStorage.getItem(storageKey(profileId))
    if (raw) state = JSON.parse(raw) as CloudState
  } catch {
    state = null
  }
  if (!state || !state.deviceId) {
    state = { deviceId: uuid(), familyCode: null, minutes: {}, rounds: [], lastSyncAt: null, lastError: null }
  }
  memory.set(profileId, state)
  return state
}

export function persistCloud(profileId: string): void {
  const state = memory.get(profileId)
  if (!state) return
  try {
    localStorage.setItem(storageKey(profileId), JSON.stringify(state))
  } catch {
    // brak miejsca / tryb prywatny — spróbujemy przy następnej okazji
  }
}

function minuteKey(d = new Date()): string {
  const m = new Date(d)
  m.setSeconds(0, 0)
  return m.toISOString()
}

function bucket(state: CloudState): MinuteBucket {
  const k = minuteKey()
  state.minutes[k] ??= { activeSec: 0, answers: 0, correct: 0 }
  return state.minutes[k]
}

export function isLinked(profileId: string): boolean {
  return Boolean(loadCloud(profileId).familyCode)
}

/** sekunda aktywnej nauki (wołane z zegara gry) */
export function cloudActiveSecond(profileId: string): void {
  const state = loadCloud(profileId)
  if (!state.familyCode) return
  const b = bucket(state)
  b.activeSec = Math.min(60, b.activeSec + 1)
}

export function cloudAnswer(profileId: string, grade: Grade): void {
  const state = loadCloud(profileId)
  if (!state.familyCode) return
  const b = bucket(state)
  b.answers += 1
  if (grade !== 'wrong') b.correct += 1
}

export function cloudRound(profileId: string, round: RoundPayload): void {
  const state = loadCloud(profileId)
  if (!state.familyCode) return
  state.rounds = [...state.rounds, round].slice(-200)
  persistCloud(profileId)
}

export type LinkResult = 'ok' | 'bad_code' | 'network'

export async function linkFamily(profileId: string, code: string, playerName: string): Promise<LinkResult> {
  const state = loadCloud(profileId)
  try {
    const ok = await rpc<boolean>('register_device', {
      p_family_code: code,
      p_device_id: state.deviceId,
      p_player_name: playerName,
    })
    if (!ok) return 'bad_code'
    state.familyCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    state.lastError = null
    persistCloud(profileId)
    return 'ok'
  } catch {
    return 'network'
  }
}

export function unlinkFamily(profileId: string): void {
  const state = loadCloud(profileId)
  state.familyCode = null
  state.minutes = {}
  state.rounds = []
  persistCloud(profileId)
}

let inFlight = false

/** Wysyła zaległe dane; zwraca true, gdy serwer je przyjął. */
export async function syncCloud(profileId: string, save: SaveData, playerName: string, keepalive = false): Promise<boolean> {
  const state = loadCloud(profileId)
  if (!state.familyCode || inFlight) return false
  inFlight = true
  const nowKey = minuteKey()
  const minuteKeys = Object.keys(state.minutes)
  const roundIds = new Set(state.rounds.map((r) => r.id))
  const days = Object.entries(save.activity)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([day, d]) => ({ day, ...d }))
  const args = {
    p_device_id: state.deviceId,
    p_minutes: minuteKeys.map((minute) => ({ minute, ...state.minutes[minute] })),
    p_days: days,
    p_rounds: state.rounds,
  }
  try {
    let ok = await rpc<boolean>('push_activity', args, keepalive)
    if (!ok) {
      // urządzenie nieznane (np. po resecie bazy) — rejestrujemy ponownie i próbujemy raz jeszcze
      const again = await rpc<boolean>('register_device', {
        p_family_code: state.familyCode,
        p_device_id: state.deviceId,
        p_player_name: playerName,
      })
      ok = again ? await rpc<boolean>('push_activity', args, keepalive) : false
    }
    if (ok) {
      for (const k of minuteKeys) if (k < nowKey) delete state.minutes[k]
      state.rounds = state.rounds.filter((r) => !roundIds.has(r.id))
      state.lastSyncAt = Date.now()
      state.lastError = null
    } else {
      state.lastError = 'kod rodzica nie działa'
    }
    persistCloud(profileId)
    return ok
  } catch {
    state.lastError = 'brak połączenia'
    persistCloud(profileId)
    return false
  } finally {
    inFlight = false
  }
}
