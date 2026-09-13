import { GROUP_LABEL, PERSONS, PERSON_LABEL, PERSON_SHORT, VERB_BY_INF } from '../data/verbs'
import { grade } from './grading'
import { emptyStat, itemKey } from './storage'
import type { AnswerRecord, Grade, Group, ItemStat, LevelDef, Person, Question } from './types'

export type Rng = () => number

export type Bonus = { label: string; xp: number }

export type RoundState = {
  levelId: number
  phase: 'main' | 'recovery' | 'done'
  mainAnswered: number
  history: AnswerRecord[]
  /** błędne pytania czekające na powrót w rundzie głównej */
  retries: { key: string; due: number; kind: Question['kind'] }[]
  /** egzamin: z góry ułożony, zbalansowany zestaw pytań */
  examQueue: { key: string; kind: Question['kind'] }[]
  /** klucze z błędem w tej rundzie (kolejność pierwszego błędu) */
  failed: string[]
  recoveryQueue: string[]
  recoveryTotal: number
  asked: Record<string, number>
  recent: string[]
  groupBag: Group[]
  combo: number
  bestCombo: number
  xp: number
  bonuses: Bonus[]
  bossHp: number
  bossMaxHp: number
  bossHits: Partial<Record<Person, number>>
  current: Question | null
  counter: number
  /** znacznik startu rundy (ms) — do czasu trwania w panelu rodzica */
  startedAt: number
}

export type SubmitResult = {
  state: RoundState
  record: AnswerRecord
  stat: ItemStat
  comboMilestone: number | null
  bossHit: boolean
  bossDefeated: boolean
  fixedError: boolean
}

const CONFUSIONS: Record<Person, Person[]> = {
  yo: ['tu', 'el'],
  tu: ['yo', 'el'],
  el: ['tu', 'ellos', 'yo'],
  nosotros: ['vosotros', 'ellos'],
  vosotros: ['nosotros', 'tu'],
  ellos: ['el', 'nosotros'],
}

const SUBJECTS: Record<Person, string[]> = {
  yo: ['Yo'],
  tu: ['Tú'],
  el: ['Él', 'Ella'],
  nosotros: ['Nosotros'],
  vosotros: ['Vosotros'],
  ellos: ['Ellos', 'Ellas'],
}

export const XP = {
  correct: 10,
  almost: 5,
  fixedError: 15,
  combo5: 20,
  combo10: 50,
  boss: 100,
  perfect: 100,
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function splitKey(key: string): { verb: string; person: Person } {
  const [verb, person] = key.split('|')
  return { verb, person: person as Person }
}

/** Adaptacja: więcej błędów → częściej, seria poprawnych → rzadziej. */
export function itemWeight(stat: ItemStat | undefined): number {
  if (!stat || stat.attempts === 0) return 1.2
  const difficulty = Math.max(0, stat.wrong * 1.5 - stat.correct * 0.5)
  const w = (1 + difficulty) / (1 + Math.min(stat.streak, 5) * 0.6)
  return Math.min(6, Math.max(0.15, w))
}

export function makeQuestion(
  rng: Rng,
  n: number,
  verb: string,
  person: Person,
  kind: Question['kind'],
  retry: boolean,
  phase: Question['phase'],
): Question {
  const v = VERB_BY_INF[verb]
  const answer = v.forms[person]
  // bez dopełnień (np. llamarse) nie da się zbudować zdania → zwykłe pytanie
  const safeKind = kind === 'fix' && v.complements.length === 0 ? 'conjugate' : kind
  const q: Question = { n, kind: safeKind, verb, person, answer, retry, phase }
  if (safeKind === 'fix') {
    const options = CONFUSIONS[person].filter((p) => v.forms[p] !== answer)
    const wrongPerson = pick(rng, options.length ? options : PERSONS.filter((p) => v.forms[p] !== answer))
    const subject = pick(rng, SUBJECTS[person])
    const complement = pick(rng, v.complements)
    q.wrongSentence = `${subject} ${v.forms[wrongPerson]} ${complement}.`
    q.rightSentence = `${subject} ${answer} ${complement}.`
  }
  return q
}

function levelPool(level: LevelDef): string[] {
  const keys: string[] = []
  for (const verb of level.verbs) {
    for (const p of PERSONS) if ((level.persons[p] ?? 0) > 0) keys.push(itemKey(verb, p))
  }
  return keys
}

export function newRound(level: LevelDef, stats: Record<string, ItemStat>, rng: Rng = Math.random): RoundState {
  const hp = level.kind === 'boss' ? (level.bossHp ?? 10) : 0
  const state: RoundState = {
    levelId: level.id,
    phase: 'main',
    mainAnswered: 0,
    history: [],
    retries: [],
    examQueue: level.kind === 'exam' ? examPlan(level, rng) : [],
    failed: [],
    recoveryQueue: [],
    recoveryTotal: 0,
    asked: {},
    // przykład z podpowiedzi (hablar → hablo) nie może być pierwszym pytaniem
    recent: level.id === 1 ? ['hablar|yo'] : [],
    groupBag: [],
    combo: 0,
    bestCombo: 0,
    xp: 0,
    bonuses: [],
    bossHp: hp,
    bossMaxHp: hp,
    bossHits: {},
    current: null,
    counter: 0,
    startedAt: Date.now(),
  }
  return advance(state, level, stats, rng)
}

function mainFinished(s: RoundState, level: LevelDef): boolean {
  return level.kind === 'boss' ? s.bossHp <= 0 : s.mainAnswered >= level.length
}

/** Ustawia następne pytanie albo przechodzi do rundy DO POPRAWY / końca. */
export function advance(prev: RoundState, level: LevelDef, stats: Record<string, ItemStat>, rng: Rng = Math.random): RoundState {
  const s: RoundState = { ...prev, current: null }

  if (s.phase === 'main' && mainFinished(s, level)) {
    s.retries = []
    if (s.failed.length > 0) {
      s.phase = 'recovery'
      s.recoveryQueue = [...s.failed]
      s.recoveryTotal = s.failed.length
    } else {
      finish(s)
      return s
    }
  }

  if (s.phase === 'recovery') {
    if (s.recoveryQueue.length === 0) {
      finish(s)
      return s
    }
    const { verb, person } = splitKey(s.recoveryQueue[0])
    s.current = makeQuestion(rng, s.counter, verb, person, 'conjugate', true, 'recovery')
    s.counter += 1
    return s
  }

  if (s.phase === 'done') return s

  // egzamin: kolejne pytanie z ułożonego zestawu, bez powtórek w trakcie
  if (level.kind === 'exam') {
    const [next, ...rest] = s.examQueue
    s.examQueue = rest
    const { verb, person } = splitKey(next.key)
    s.current = makeQuestion(rng, s.counter, verb, person, next.kind, false, 'main')
    s.counter += 1
    return s
  }

  // runda główna: najpierw zaległe powtórki błędów
  const dueIdx = s.retries.findIndex((r) => r.due <= s.mainAnswered)
  if (dueIdx >= 0) {
    const r = s.retries[dueIdx]
    s.retries = s.retries.filter((_, i) => i !== dueIdx)
    const { verb, person } = splitKey(r.key)
    s.current = makeQuestion(rng, s.counter, verb, person, r.kind, true, 'main')
    s.counter += 1
    return s
  }

  const key = pickFresh(s, level, stats, rng)
  const pending = s.retries.find((r) => r.key === key)
  if (pending) s.retries = s.retries.filter((r) => r.key !== key)
  const { verb, person } = splitKey(key)
  const allowFix =
    level.fixRatio > 0 && (level.kind === 'boss' ? s.mainAnswered >= 3 : s.mainAnswered >= 1)
  const kind: Question['kind'] = pending ? pending.kind : allowFix && rng() < level.fixRatio ? 'fix' : 'conjugate'
  s.current = makeQuestion(rng, s.counter, verb, person, kind, Boolean(pending), 'main')
  s.counter += 1
  return s
}

/** Egzamin: 6 regularnych (po 2 z -AR/-ER/-IR), 4 zwrotne, każdy nieregularny min. 1×, reszta losowo; osoby rozłożone równo. */
export function examPlan(level: LevelDef, rng: Rng): { key: string; kind: Question['kind'] }[] {
  const verbs = level.verbs.map((inf) => VERB_BY_INF[inf])
  const regular = verbs.filter((v) => v.type === 'regular' && !v.reflexive)
  const reflexive = verbs.filter((v) => v.type === 'regular' && v.reflexive)
  const irregular = shuffle(rng, verbs.filter((v) => v.type === 'irregular')).map((v) => v.infinitive)
  const picks: string[] = []
  for (const g of ['ar', 'er', 'ir'] as Group[]) {
    picks.push(...shuffle(rng, regular.filter((v) => v.group === g)).slice(0, 2).map((v) => v.infinitive))
  }
  picks.push(...shuffle(rng, reflexive).slice(0, 4).map((v) => v.infinitive))
  picks.push(...irregular)
  picks.push(...shuffle(rng, irregular).slice(0, Math.max(0, level.length - picks.length)))

  let bag: Person[] = []
  const used = new Set<string>()
  const keys = picks.slice(0, level.length).map((verb) => {
    for (let tries = 0; tries < 12; tries++) {
      if (!bag.length) bag = shuffle(rng, PERSONS)
      const key = itemKey(verb, bag.shift()!)
      if (!used.has(key)) {
        used.add(key)
        return key
      }
    }
    const key = itemKey(verb, PERSONS.find((p) => !used.has(itemKey(verb, p)))!)
    used.add(key)
    return key
  })

  const order = shuffle(rng, keys)
  const fixable = order.map((k, i) => ({ k, i })).filter(({ k }) => VERB_BY_INF[splitKey(k).verb].complements.length > 0)
  const fixIdx = new Set(shuffle(rng, fixable).slice(0, Math.round(order.length * level.fixRatio)).map(({ i }) => i))
  return order.map((key, i) => ({ key, kind: fixIdx.has(i) ? 'fix' : 'conjugate' }))
}

function pickFresh(s: RoundState, level: LevelDef, stats: Record<string, ItemStat>, rng: Rng): string {
  const pool = levelPool(level)
  const pendingKeys = new Set(s.retries.map((r) => r.key))
  const recentN = level.kind === 'boss' ? 2 : 4
  const recent = s.recent.slice(-recentN)
  const last = s.recent.slice(-1)

  let cands = pool.filter((k) => !pendingKeys.has(k) && !recent.includes(k))
  if (!cands.length) cands = pool.filter((k) => !pendingKeys.has(k) && !last.includes(k))
  if (!cands.length) cands = pool.filter((k) => !last.includes(k))
  if (!cands.length) cands = pool

  if (level.kind === 'boss') {
    // boss: najpierw każda osoba przynajmniej raz, potem te z najmniejszą liczbą trafień
    const hits = (k: string) => s.bossHits[splitKey(k).person] ?? 0
    const min = Math.min(...cands.map(hits))
    cands = cands.filter((k) => hits(k) === min)
  } else {
    if (level.groupHint) {
      if (!s.groupBag.length) s.groupBag = shuffle(rng, ['ar', 'er', 'ir'] as Group[])
      const group = s.groupBag[0]
      s.groupBag = s.groupBag.slice(1)
      const inGroup = cands.filter((k) => VERB_BY_INF[splitKey(k).verb].group === group)
      if (inGroup.length) cands = inGroup
    }
    const lastVerb = last.length ? splitKey(last[0]).verb : null
    const otherVerb = cands.filter((k) => splitKey(k).verb !== lastVerb)
    if (otherVerb.length) cands = otherVerb
  }

  const weights = cands.map((k) => {
    const { verb, person } = splitKey(k)
    const v = VERB_BY_INF[verb]
    let w = itemWeight(stats[k]) * (level.persons[person] ?? 1)
    if (v.type === 'irregular' && level.irregularBoost) w *= level.irregularBoost
    w *= Math.pow(0.35, s.asked[k] ?? 0)
    return w
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < cands.length; i++) {
    r -= weights[i]
    if (r <= 0) return cands[i]
  }
  return cands[cands.length - 1]
}

function finish(s: RoundState): void {
  s.phase = 'done'
  s.current = null
  const mainWrong = s.history.some((h) => h.q.phase === 'main' && h.grade === 'wrong')
  if (!mainWrong && s.history.length > 0 && !s.bonuses.some((b) => b.label === 'BEZ BŁĘDU')) {
    s.bonuses = [...s.bonuses, { label: 'BEZ BŁĘDU', xp: XP.perfect }]
    s.xp += XP.perfect
  }
}

export function submit(
  prev: RoundState,
  level: LevelDef,
  stats: Record<string, ItemStat>,
  input: string,
  rng: Rng = Math.random,
): SubmitResult {
  const q = prev.current
  if (!q) throw new Error('Brak aktywnego pytania')
  const s: RoundState = { ...prev }
  const key = itemKey(q.verb, q.person)
  const g: Grade = grade(input, q.answer)
  const hadError = s.failed.includes(key)

  // XP i combo
  let xp = 0
  let comboMilestone: number | null = null
  let fixedError = false
  if (g === 'correct') {
    fixedError = hadError
    xp = hadError ? XP.fixedError : XP.correct
    s.combo += 1
    if (level.kind !== 'exam') {
      if ([2, 3, 5, 10].includes(s.combo) || (s.combo > 10 && s.combo % 5 === 0)) comboMilestone = s.combo
      if (s.combo === 10) xp += XP.combo10
      else if (s.combo % 5 === 0) xp += XP.combo5
    }
  } else if (g === 'almost') {
    xp = XP.almost
  } else {
    s.combo = 0
  }
  s.bestCombo = Math.max(s.bestCombo, s.combo)
  s.xp += xp

  // statystyka czasownik + osoba
  const old = stats[key] ?? emptyStat()
  const stat: ItemStat = {
    attempts: old.attempts + 1,
    correct: old.correct + (g === 'wrong' ? 0 : 1),
    wrong: old.wrong + (g === 'wrong' ? 1 : 0),
    streak: g === 'wrong' ? 0 : old.streak + 1,
  }

  s.asked = { ...s.asked, [key]: (s.asked[key] ?? 0) + 1 }
  s.recent = [...s.recent, key].slice(-6)
  const record: AnswerRecord = { q, input, grade: g, xp }
  s.history = [...s.history, record]

  let bossHit = false
  let bossDefeated = false

  if (q.phase === 'main') {
    s.mainAnswered += 1
    if (g === 'wrong') {
      if (!hadError) s.failed = [...s.failed, key]
      if (level.kind !== 'exam') {
        const gap = level.kind === 'boss' ? randInt(rng, 2, 3) : randInt(rng, 3, 6)
        s.retries = [...s.retries.filter((r) => r.key !== key), { key, due: s.mainAnswered + gap, kind: q.kind }]
      }
    } else if (level.kind === 'boss') {
      bossHit = true
      s.bossHp = Math.max(0, s.bossHp - 1)
      s.bossHits = { ...s.bossHits, [q.person]: (s.bossHits[q.person] ?? 0) + 1 }
      if (s.bossHp === 0) {
        bossDefeated = true
        s.bonuses = [...s.bonuses, { label: 'JEFE POKONANY', xp: XP.boss }]
        s.xp += XP.boss
      }
    }
  } else if (q.phase === 'recovery') {
    const [head, ...rest] = s.recoveryQueue
    s.recoveryQueue = g === 'wrong' ? [...rest, head] : rest
  }

  return { state: s, record, stat, comboMilestone, bossHit, bossDefeated, fixedError }
}

export type Summary = {
  ok: number
  total: number
  accuracy: number
  /** wynik punktowy: PRAWIE = pół punktu (egzamin); w levelach = accuracy */
  score: number
  stars: number
  passed: boolean
  bestCombo: number
  xp: number
  bonuses: Bonus[]
  recovered: number
  mastered: string[]
  toReview: { label: string; form: string }[]
  exam?: {
    grade: { value: number; label: string }
    breakdown: { label: string; points: number; total: number }[]
    errors: { prompt: string; input: string; answer: string; grade: Grade }[]
  }
}

/** Ocena orientacyjna wg typowej szkolnej skali procentowej. */
export function schoolGrade(score: number): { value: number; label: string } {
  if (score >= 0.96) return { value: 6, label: 'celujący' }
  if (score >= 0.86) return { value: 5, label: 'bardzo dobry' }
  if (score >= 0.71) return { value: 4, label: 'dobry' }
  if (score >= 0.51) return { value: 3, label: 'dostateczny' }
  if (score >= 0.31) return { value: 2, label: 'dopuszczający' }
  return { value: 1, label: 'niedostateczny' }
}

function kindLabel(verb: string): string {
  const v = VERB_BY_INF[verb]
  if (v.type === 'irregular') return verb.toUpperCase()
  return v.reflexive ? 'ZWROTNE' : GROUP_LABEL[v.group]
}

function categoryLabel(verb: string, person: Person): string {
  return `${kindLabel(verb)} / ${PERSON_LABEL[person]}`
}

function examCategory(verb: string): string {
  const v = VERB_BY_INF[verb]
  if (v.type === 'irregular') return verb
  return v.reflexive ? 'zwrotne (-se)' : 'regularne (-ar/-er/-ir)'
}

const points = (h: AnswerRecord) => (h.grade === 'correct' ? 1 : h.grade === 'almost' ? 0.5 : 0)

export function summarize(s: RoundState, level: LevelDef): Summary {
  const main = s.history.filter((h) => h.q.phase === 'main')
  const ok = main.filter((h) => h.grade !== 'wrong').length
  const total = main.length
  const accuracy = total ? ok / total : 0
  const isExam = level.kind === 'exam'
  const score = isExam ? (total ? main.reduce((a, h) => a + points(h), 0) / total : 0) : accuracy

  let stars: number
  if (isExam) stars = score >= 0.95 ? 3 : score >= 0.85 ? 2 : score >= 0.7 ? 1 : 0
  else stars = accuracy >= 1 ? 3 : accuracy >= 0.85 ? 2 : accuracy >= 0.7 ? 1 : 0
  if (level.kind === 'boss') stars = Math.max(1, stars)

  const cat = new Map<string, { ok: number; wrong: number }>()
  for (const h of main) {
    const label = categoryLabel(h.q.verb, h.q.person)
    const c = cat.get(label) ?? { ok: 0, wrong: 0 }
    if (h.grade === 'wrong') c.wrong += 1
    else c.ok += 1
    cat.set(label, c)
  }
  const mastered = [...cat.entries()]
    .filter(([, c]) => c.wrong === 0 && c.ok > 0)
    .sort((a, b) => b[1].ok - a[1].ok)
    .map(([label]) => label)

  const toReview = s.failed.map((k) => {
    const { verb, person } = splitKey(k)
    const v = VERB_BY_INF[verb]
    const label = v.type === 'irregular' ? categoryLabel(verb, person) : `${categoryLabel(verb, person)} (${verb})`
    return { label, form: v.forms[person] }
  })

  let exam: Summary['exam']
  if (isExam) {
    const groups = new Map<string, { points: number; total: number }>()
    for (const h of main) {
      const label = examCategory(h.q.verb)
      const g = groups.get(label) ?? { points: 0, total: 0 }
      g.points += points(h)
      g.total += 1
      groups.set(label, g)
    }
    const order = (label: string) => (label.startsWith('regularne') ? 0 : label.startsWith('zwrotne') ? 1 : 2)
    exam = {
      grade: schoolGrade(score),
      breakdown: [...groups.entries()]
        .sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]))
        .map(([label, g]) => ({ label, ...g })),
      errors: main
        .filter((h) => h.grade !== 'correct')
        .map((h) => ({
          prompt: h.q.kind === 'fix' ? (h.q.wrongSentence ?? '') : `${h.q.verb.toUpperCase()} · ${PERSON_SHORT[h.q.person]}`,
          input: h.input,
          answer: h.q.answer,
          grade: h.grade,
        })),
    }
  }

  return {
    ok,
    total,
    accuracy,
    score,
    stars,
    passed: stars >= 1,
    bestCombo: s.bestCombo,
    xp: s.xp,
    bonuses: s.bonuses,
    recovered: s.recoveryTotal,
    mastered,
    toReview,
    exam,
  }
}
