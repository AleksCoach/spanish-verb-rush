import type { DayActivity, Grade, SaveData } from './types'

/** Czas aktywny liczy się tylko, gdy od ostatniego ruchu gracza minęło najwyżej tyle i gra jest na ekranie. */
export const IDLE_LIMIT_MS = 5000

const KEYS: (keyof DayActivity)[] = ['activeSec', 'answers', 'correct', 'almost', 'wrong', 'rounds', 'passed']

/** Lokalna data RRRR-MM-DD. */
export function dayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function emptyDay(): DayActivity {
  return { activeSec: 0, answers: 0, correct: 0, almost: 0, wrong: 0, rounds: 0, passed: 0 }
}

/** Dolicza liczniki do wskazanego dnia (domyślnie dziś). */
export function addActivity(save: SaveData, patch: Partial<DayActivity>, date = dayKey()): SaveData {
  const cur = { ...emptyDay(), ...save.activity[date] }
  const next = { ...cur }
  for (const k of KEYS) next[k] = cur[k] + (patch[k] ?? 0)
  return { ...save, activity: { ...save.activity, [date]: next } }
}

export function answerPatch(grade: Grade): Partial<DayActivity> {
  return {
    answers: 1,
    correct: grade === 'correct' ? 1 : 0,
    almost: grade === 'almost' ? 1 : 0,
    wrong: grade === 'wrong' ? 1 : 0,
  }
}
