import type { LevelDef, SaveData } from '../game/types'
import { REFLEXIVE_VERBS, REGULAR_VERBS, VERBS } from './verbs'

const ALL = { yo: 1, tu: 1, el: 1, nosotros: 1, vosotros: 1, ellos: 1 }

type Draft = Omit<LevelDef, 'id'>

function boss(verb: string, fixRatio: number, bonus = false): Draft {
  return {
    key: `boss-${verb}`,
    code: verb.toUpperCase(),
    kind: 'boss',
    desc: 'Jefe: czasownik nieregularny',
    persons: ALL,
    verbs: [verb],
    groupHint: false,
    length: 0,
    fixRatio,
    bossVerb: verb,
    bossHp: 10,
    bonus,
  }
}

/** Zakres egzaminu (Kompetencja 1): regularne, zwrotne i te nieregularne. */
export const EXAM_IRREGULAR = ['tener', 'ir', 'ver', 'jugar', 'ser', 'estar', 'acostarse']

const DRAFTS: Draft[] = [
  {
    key: 'yo', code: 'YO', kind: 'regular', desc: 'Tylko YO — złap wzór',
    persons: { yo: 1 }, verbs: REGULAR_VERBS, groupHint: true, length: 12, fixRatio: 0,
  },
  {
    key: 'tu', code: 'TÚ', kind: 'regular', desc: 'Dochodzi TÚ',
    persons: { yo: 1, tu: 2 }, verbs: REGULAR_VERBS, groupHint: true, length: 12, fixRatio: 0,
  },
  {
    key: 'mix', code: 'YO · TÚ · ÉL', kind: 'regular', desc: 'YO · TÚ · ÉL/ELLA',
    persons: { yo: 1, tu: 1, el: 2 }, verbs: REGULAR_VERBS, groupHint: true, length: 14, fixRatio: 0,
  },
  {
    key: 'full-team', code: 'WSZYSCY', kind: 'regular', desc: 'Wszystkie 6 osób',
    persons: { yo: 1, tu: 1, el: 1, nosotros: 2, vosotros: 2, ellos: 2 },
    verbs: REGULAR_VERBS, groupHint: true, length: 16, fixRatio: 0,
  },
  {
    key: 'mixed-verbs', code: 'MIESZANKA', kind: 'regular', desc: 'Bez podpowiedzi grup + NAPRAW BŁĄD',
    persons: ALL, verbs: REGULAR_VERBS, groupHint: false, length: 16, fixRatio: 0.3,
  },
  {
    key: 'zwrotne', code: 'ZWROTNE -SE', kind: 'regular', desc: 'Czasowniki zwrotne: me · te · se · nos · os · se',
    persons: ALL, verbs: REFLEXIVE_VERBS, groupHint: true, length: 14, fixRatio: 0.2,
  },
  boss('tener', 0),
  boss('ser', 0.2),
  boss('estar', 0.2),
  boss('ir', 0.2),
  boss('ver', 0.2),
  boss('jugar', 0.2),
  boss('acostarse', 0.2),
  {
    key: 'egzamin', code: 'EGZAMIN', kind: 'exam', desc: 'Kompetencja 1: regularne · zwrotne · nieregularne',
    persons: ALL, verbs: [...REGULAR_VERBS, ...REFLEXIVE_VERBS, ...EXAM_IRREGULAR],
    groupHint: false, length: 20, fixRatio: 0.25, alwaysOpen: true,
  },
  boss('hacer', 0.2, true),
  boss('querer', 0.2, true),
  boss('poder', 0.2, true),
  boss('venir', 0.2, true),
  {
    key: 'wielki-mix', code: 'WIELKA MIESZANKA', kind: 'mix', desc: 'Wszystko naraz — pobij rekord serii',
    persons: ALL, verbs: VERBS.map((v) => v.infinitive),
    groupHint: false, length: 20, fixRatio: 0.3, irregularBoost: 2, bonus: true,
  },
]

export const LEVELS: LevelDef[] = DRAFTS.map((d, i) => ({ ...d, id: i + 1 }))
export const LEVEL_BY_ID: Record<number, LevelDef> = Object.fromEntries(LEVELS.map((l) => [l.id, l]))
export const MAX_LEVEL = LEVELS.length
export const EXAM_LEVEL = LEVELS.find((l) => l.kind === 'exam')!

/** próg odblokowania następnego poziomu (poziomy nie-bossowe) */
export const PASS_ACCURACY = 0.7

/** Kolejność sprzed dodania zwrotnych i egzaminu (zapis v1 trzymał numery leveli). */
export const V1_LEVEL_KEYS = [
  'yo', 'tu', 'mix', 'full-team', 'mixed-verbs', 'boss-tener', 'boss-ser', 'boss-estar', 'boss-ir',
  'boss-rush', 'boss-hacer', 'boss-querer', 'boss-poder', 'boss-jugar', 'boss-venir', 'wielki-mix',
]

export function isPassed(level: LevelDef, save: SaveData): boolean {
  return (save.levels[level.key]?.stars ?? 0) >= 1
}

/** Otwarty: pierwszy, zawsze otwarty, już grany, albo poprzedni (pomijając egzamin) zaliczony. */
export function isUnlocked(level: LevelDef, save: SaveData): boolean {
  if (level.id === 1 || level.alwaysOpen || save.levels[level.key]) return true
  for (let id = level.id - 1; id >= 1; id--) {
    const prev = LEVEL_BY_ID[id]
    if (prev.alwaysOpen) continue
    return isPassed(prev, save)
  }
  return true
}

/** Level pod przyciskiem GRAJ: pierwszy otwarty i jeszcze niezaliczony. */
export function nextLevelToPlay(save: SaveData): LevelDef {
  return (
    LEVELS.find((l) => !l.alwaysOpen && isUnlocked(l, save) && !isPassed(l, save)) ?? LEVELS[LEVELS.length - 1]
  )
}
