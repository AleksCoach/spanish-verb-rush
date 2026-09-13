import type { LevelDef } from '../game/types'
import { REGULAR_VERBS, VERBS } from './verbs'

const ALL = { yo: 1, tu: 1, el: 1, nosotros: 1, vosotros: 1, ellos: 1 }

function boss(id: number, verb: string, fixRatio: number): LevelDef {
  return {
    id,
    code: verb.toUpperCase(),
    kind: 'boss',
    desc: 'Boss: czasownik nieregularny',
    persons: ALL,
    verbs: [verb],
    groupHint: false,
    length: 0,
    fixRatio,
    bossVerb: verb,
    bossHp: 10,
  }
}

export const LEVELS: LevelDef[] = [
  {
    id: 1, code: 'YO', kind: 'regular', desc: 'Tylko YO — złap wzór',
    persons: { yo: 1 }, verbs: REGULAR_VERBS, groupHint: true, length: 12, fixRatio: 0,
  },
  {
    id: 2, code: 'TÚ', kind: 'regular', desc: 'Dochodzi TÚ',
    persons: { yo: 1, tu: 2 }, verbs: REGULAR_VERBS, groupHint: true, length: 12, fixRatio: 0,
  },
  {
    id: 3, code: 'MIX', kind: 'regular', desc: 'YO · TÚ · ÉL/ELLA',
    persons: { yo: 1, tu: 1, el: 2 }, verbs: REGULAR_VERBS, groupHint: true, length: 14, fixRatio: 0,
  },
  {
    id: 4, code: 'FULL TEAM', kind: 'regular', desc: 'Wszystkie 6 osób',
    persons: { yo: 1, tu: 1, el: 1, nosotros: 2, vosotros: 2, ellos: 2 },
    verbs: REGULAR_VERBS, groupHint: true, length: 16, fixRatio: 0,
  },
  {
    id: 5, code: 'MIXED VERBS', kind: 'regular', desc: 'Bez podpowiedzi grup + NAPRAW BŁĄD',
    persons: ALL, verbs: REGULAR_VERBS, groupHint: false, length: 16, fixRatio: 0.3,
  },
  boss(6, 'tener', 0),
  boss(7, 'ser', 0.2),
  boss(8, 'estar', 0.2),
  boss(9, 'ir', 0.2),
  {
    id: 10, code: 'BOSS RUSH', kind: 'mix', desc: 'Powtórka: tener · ser · estar · ir',
    persons: ALL, verbs: [...REGULAR_VERBS, 'tener', 'ser', 'estar', 'ir'],
    groupHint: false, length: 16, fixRatio: 0.3, irregularBoost: 5,
  },
  boss(11, 'hacer', 0.2),
  boss(12, 'querer', 0.2),
  boss(13, 'poder', 0.2),
  boss(14, 'jugar', 0.2),
  boss(15, 'venir', 0.2),
  {
    id: 16, code: 'WIELKI MIX', kind: 'mix', desc: 'Wszystko naraz — bij rekord combo',
    persons: ALL, verbs: VERBS.map((v) => v.infinitive),
    groupHint: false, length: 20, fixRatio: 0.3, irregularBoost: 2,
  },
]

export const LEVEL_BY_ID: Record<number, LevelDef> = Object.fromEntries(LEVELS.map((l) => [l.id, l]))
export const MAX_LEVEL = LEVELS.length

/** próg odblokowania następnego poziomu (poziomy nie-bossowe) */
export const PASS_ACCURACY = 0.7
