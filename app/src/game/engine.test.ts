import { describe, expect, it } from 'vitest'
import { sheetFor } from '../data/cheatsheets'
import { LINES, LINES_BY_CAT, displayText, segmentsOf } from '../data/commentary'
import { EXAM_IRREGULAR, EXAM_LEVEL, LEVELS, isUnlocked, nextLevelToPlay } from '../data/levels'
import { PERSONS, REFLEXIVE_VERBS, VERBS, VERB_BY_INF, ruleForm } from '../data/verbs'
import { advance, examPlan, makeQuestion, newRound, schoolGrade, submit, summarize } from './engine'
import type { Rng, RoundState } from './engine'
import { accentDiffs, applyAccentShortcuts, grade, stripAccents } from './grading'
import { emptySave, itemKey, migrateSave } from './storage'
import type { ItemStat, LevelDef } from './types'

function mulberry32(seed: number): Rng {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('ocenianie odpowiedzi', () => {
  it('poprawna / prawie / błąd', () => {
    expect(grade('hablo', 'hablo')).toBe('correct')
    expect(grade('  Hablo. ', 'hablo')).toBe('correct')
    expect(grade('yo hablo', 'hablo')).toBe('correct')
    expect(grade('Yo hablo español.', 'hablo')).toBe('correct')
    expect(grade('HABLÁIS', 'habláis')).toBe('correct')
    expect(grade('hablais', 'habláis')).toBe('almost')
    expect(grade('hablaís', 'habláis')).toBe('almost')
    expect(grade('estas', 'estás')).toBe('almost')
    expect(grade('hablas', 'hablo')).toBe('wrong')
    expect(grade('', 'hablo')).toBe('wrong')
    expect(grade('comemos', 'coméis')).toBe('wrong')
  })

  it('zwrotne: zaimek + forma, w tej kolejności', () => {
    expect(grade('me levanto', 'me levanto')).toBe('correct')
    expect(grade('Yo me levanto a las siete.', 'me levanto')).toBe('correct')
    expect(grade('me levantó', 'me levanto')).toBe('almost')
    expect(grade('os acostais', 'os acostáis')).toBe('almost')
    expect(grade('levanto', 'me levanto')).toBe('wrong')
    expect(grade('te levanto', 'me levanto')).toBe('wrong')
    expect(grade('levanto me', 'me levanto')).toBe('wrong')
  })

  it('skróty akcentów i podświetlenie brakującego akcentu', () => {
    expect(applyAccentShortcuts("habla'is")).toBe('habláis')
    expect(applyAccentShortcuts("vivi's")).toBe('vivís')
    expect(accentDiffs('hablais', 'habláis')).toEqual([4])
    expect(accentDiffs('os acostais', 'os acostáis')).toEqual([8])
    expect(stripAccents('está')).toBe('esta')
  })
})

describe('dane czasowników', () => {
  it('regularne (też zwrotne) zgodne z regułą, formy unikalne, zdania dla czasowników z dopełnieniami', () => {
    for (const v of VERBS) {
      const forms = PERSONS.map((p) => v.forms[p])
      expect(new Set(forms).size, v.infinitive).toBe(6)
      if (v.type === 'regular') for (const p of PERSONS) expect(v.forms[p]).toBe(ruleForm(v.infinitive, p))
      expect(v.complements.length === 0 || v.complements.length >= 2, v.infinitive).toBe(true)
      if (v.reflexive) for (const p of PERSONS) expect(v.forms[p].split(' ').length, v.infinitive).toBe(2)
    }
    expect(VERB_BY_INF['levantarse'].forms.vosotros).toBe('os levantáis')
    expect(VERB_BY_INF['acostarse'].forms.yo).toBe('me acuesto')
    expect(VERB_BY_INF['ver'].forms.vosotros).toBe('veis')
  })

  it('zakres egzaminu jest w grze: regularne, zwrotne i nieregularne z listy', () => {
    for (const inf of EXAM_IRREGULAR) expect(VERB_BY_INF[inf]?.type, inf).toBe('irregular')
    expect(REFLEXIVE_VERBS.length).toBeGreaterThanOrEqual(4)
    expect(EXAM_LEVEL.verbs).toEqual(expect.arrayContaining([...EXAM_IRREGULAR, ...REFLEXIVE_VERBS]))
  })

  it('NAPRAW BŁĄD: zdanie zawiera złą formę, a poprawne zdanie dobrą', () => {
    const rng = mulberry32(7)
    for (const v of VERBS) {
      for (const p of PERSONS) {
        const q = makeQuestion(rng, 0, v.infinitive, p, 'fix', false, 'main')
        if (v.complements.length === 0) {
          expect(q.kind).toBe('conjugate')
          continue
        }
        expect(q.wrongSentence).toBeTruthy()
        expect(q.wrongSentence).not.toBe(q.rightSentence)
        expect(grade(q.rightSentence!, q.answer)).toBe('correct')
        expect(grade(q.wrongSentence!, q.answer)).toBe('wrong')
      }
    }
  })
})

type Sim = { state: RoundState; steps: number }

function simulate(level: LevelDef, seed: number, pCorrect = 0.65, pAlmost = 0.1): Sim {
  const rng = mulberry32(seed)
  const stats: Record<string, ItemStat> = {}
  let state = newRound(level, stats, rng)
  let steps = 0
  while (state.phase !== 'done') {
    const q = state.current
    if (!q) throw new Error('brak pytania w trakcie rundy')
    const r = rng()
    const input = r < pCorrect ? q.answer : r < pCorrect + pAlmost ? stripAccents(q.answer) : 'xxx'
    const res = submit(state, level, stats, input, rng)
    stats[itemKey(q.verb, q.person)] = res.stat
    state = advance(res.state, level, stats, rng)
    steps += 1
    if (steps > 500) throw new Error(`level ${level.id}: runda się nie kończy`)
  }
  return { state, steps }
}

describe('silnik rundy', () => {
  for (const level of LEVELS) {
    it(`level ${level.id} (${level.code}) zawsze się kończy i trzyma zasady`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const { state } = simulate(level, seed)
        const main = state.history.filter((h) => h.q.phase === 'main')
        const summary = summarize(state, level)

        if (level.kind === 'boss') {
          expect(state.bossHp).toBe(0)
          for (const p of PERSONS) {
            const hit = (state.bossHits[p] ?? 0) >= 1
            const failedKey = state.failed.includes(itemKey(level.bossVerb!, p))
            expect(hit || failedKey, `osoba ${p} pominięta`).toBe(true)
          }
        } else {
          expect(main.length).toBe(level.length)
        }

        const failed = new Set(main.filter((h) => h.grade === 'wrong').map((h) => itemKey(h.q.verb, h.q.person)))
        const rec = state.history.filter((h) => h.q.phase === 'recovery')
        for (const key of failed) {
          const last = [...rec].reverse().find((h) => itemKey(h.q.verb, h.q.person) === key)
          expect(last, `brak poprawy ${key}`).toBeTruthy()
          expect(last!.grade).not.toBe('wrong')
        }

        for (let i = 1; i < main.length; i++) {
          const a = itemKey(main[i - 1].q.verb, main[i - 1].q.person)
          const b = itemKey(main[i].q.verb, main[i].q.person)
          expect(a === b, `powtórka z rzędu: ${a}`).toBe(false)
        }

        for (const h of main) {
          expect((level.persons[h.q.person] ?? 0) > 0).toBe(true)
          expect(level.verbs.includes(h.q.verb), `${h.q.verb} spoza levelu`).toBe(true)
        }

        if (level.kind === 'exam') {
          expect(main.some((h) => h.q.retry)).toBe(false)
          expect(summary.exam).toBeTruthy()
          expect(summary.exam!.breakdown.reduce((a, b) => a + b.total, 0)).toBe(level.length)
        }

        expect(summary.total).toBe(main.length)
        expect(summary.xp).toBe(state.xp)
      }
    })
  }

  it('egzamin: zbalansowany zestaw, każdy nieregularny z listy, bez powtórzeń par', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const plan = examPlan(EXAM_LEVEL, mulberry32(seed))
      expect(plan.length).toBe(20)
      expect(new Set(plan.map((p) => p.key)).size).toBe(20)
      const verbs = plan.map((p) => VERB_BY_INF[p.key.split('|')[0]])
      expect(verbs.filter((v) => v.type === 'regular' && !v.reflexive).length).toBe(6)
      expect(verbs.filter((v) => v.type === 'regular' && v.reflexive).length).toBe(4)
      for (const inf of EXAM_IRREGULAR) expect(verbs.some((v) => v.infinitive === inf), inf).toBe(true)
      expect(plan.filter((p) => p.kind === 'fix').length).toBe(5)
    }
  })

  it('egzamin: PRAWIE = pół punktu, ocena orientacyjna', () => {
    const { state } = simulate(EXAM_LEVEL, 5, 0.5, 0.5)
    const s = summarize(state, EXAM_LEVEL)
    const main = state.history.filter((h) => h.q.phase === 'main')
    const expected = main.reduce((a, h) => a + (h.grade === 'correct' ? 1 : h.grade === 'almost' ? 0.5 : 0), 0) / 20
    expect(s.score).toBeCloseTo(expected)
    expect(schoolGrade(0.97).value).toBe(6)
    expect(schoolGrade(0.7).value).toBe(3)
    expect(schoolGrade(0.2).value).toBe(1)
  })

  it('błędne pytanie wraca w rundzie głównej po 3–6 pytaniach (albo trafia do poprawy)', () => {
    const level = LEVELS[3]
    for (let seed = 1; seed <= 80; seed++) {
      const { state } = simulate(level, seed, 0.7, 0)
      const main = state.history.filter((h) => h.q.phase === 'main')
      main.forEach((h, i) => {
        if (h.grade !== 'wrong') return
        const key = itemKey(h.q.verb, h.q.person)
        const back = main.findIndex((x, j) => j > i && itemKey(x.q.verb, x.q.person) === key)
        if (back === -1) return
        expect(back - i).toBeGreaterThanOrEqual(3)
        expect(main[back].q.retry).toBe(true)
      })
    }
  })

  it('bezbłędna runda daje bonus BEZ BŁĘDU, a odblokowanie wymaga 70%', () => {
    const level = LEVELS[0]
    const perfect = simulate(level, 3, 1, 0).state
    const s = summarize(perfect, level)
    expect(s.stars).toBe(3)
    expect(s.passed).toBe(true)
    expect(perfect.bonuses.some((b) => b.label === 'BEZ BŁĘDU')).toBe(true)
    expect(perfect.recoveryTotal).toBe(0)

    const weak = simulate(level, 3, 0.3, 0).state
    expect(summarize(weak, level).passed).toBe(false)
  })

  it('combo: +bonus przy ×5, zerowanie po błędzie, PRAWIE nie zeruje', () => {
    const level = LEVELS[0]
    const stats: Record<string, ItemStat> = {}
    const rng = mulberry32(11)
    let s = newRound(level, stats, rng)
    let bonusSeen = false
    for (let i = 0; i < 5; i++) {
      const res = submit(s, level, stats, s.current!.answer, rng)
      if (i === 4) bonusSeen = res.record.xp === 30
      s = advance(res.state, level, stats, rng)
    }
    expect(s.combo).toBe(5)
    expect(bonusSeen).toBe(true)
    const almost = submit(s, level, stats, s.current!.answer.slice(0, -1) + 'ó', rng)
    expect(almost.record.grade).toBe('almost')
    expect(almost.state.combo).toBe(5)
    s = advance(almost.state, level, stats, rng)
    const wrong = submit(s, level, stats, 'zzz', rng)
    expect(wrong.state.combo).toBe(0)
    expect(wrong.state.bestCombo).toBe(5)
  })
})

describe('komentatorzy', () => {
  it('każda kwestia dzieli się na fragmenty PL/ES, napisy bez znaczników', () => {
    for (const line of LINES) {
      const segs = segmentsOf(line)
      expect(segs.length, line.id).toBeGreaterThan(0)
      for (const seg of segs) expect(seg.text.trim().length, line.id).toBeGreaterThan(0)
      expect(displayText(line).includes('{'), line.id).toBe(false)
    }
    expect(segmentsOf({ id: 'x', cat: 'x', text: 'Teraz {es:tú!} Czasowniki' })).toEqual([
      { lang: 'pl', text: 'Teraz' },
      { lang: 'es', text: 'tú!' },
      { lang: 'pl', text: 'Czasowniki' },
    ])
  })

  it('są kwestie dla każdego poziomu, czasownika-jefe i słówka', () => {
    for (const level of LEVELS) expect(LINES_BY_CAT[`intro-${level.key}`]?.length, level.key).toBeGreaterThan(0)
    for (const v of VERBS) {
      expect(LINES_BY_CAT[`word-pl-${v.infinitive}`]?.length, v.infinitive).toBe(1)
      expect(LINES_BY_CAT[`word-es-${v.infinitive}`]?.length, v.infinitive).toBe(1)
      if (v.type === 'irregular') expect(LINES_BY_CAT[`hint-irr-${v.infinitive}`]?.length, v.infinitive).toBeGreaterThan(0)
    }
  })
})

describe('ściągi', () => {
  it('każdy poziom ma ściągę z regułą i tekstem do czytania PL/ES', () => {
    for (const level of LEVELS) {
      const sheet = sheetFor(level)
      expect(sheet.title.length, level.key).toBeGreaterThan(0)
      expect(sheet.rule.length, level.key).toBeGreaterThan(0)
      expect(sheet.speech.length, level.key).toBeGreaterThan(0)
      if (level.bossVerb) expect(sheet.formsOf).toBe(level.bossVerb)
    }
  })
})

describe('postęp i odblokowanie', () => {
  it('migracja zapisu v1 (numery leveli) na klucze + nowa kolejność', () => {
    const v1 = {
      version: 1,
      xp: 420,
      unlocked: 7,
      bestCombo: 9,
      levels: { 1: { stars: 3, bestAccuracy: 1, plays: 1, bestCombo: 12 }, 5: { stars: 1, bestAccuracy: 0.7, plays: 2, bestCombo: 4 }, 6: { stars: 1, bestAccuracy: 0.6, plays: 1, bestCombo: 3 } },
      stats: { 'hablar|yo': { attempts: 2, correct: 2, wrong: 0, streak: 2 } },
      sound: false,
    }
    const save = migrateSave(v1)
    expect(save.version).toBe(2)
    expect(save.xp).toBe(420)
    expect(save.sound).toBe(false)
    expect(save.levels['yo'].stars).toBe(3)
    expect(save.levels['mixed-verbs'].stars).toBe(1)
    expect(save.levels['boss-tener'].stars).toBe(1)
    expect(save.stats['hablar|yo'].correct).toBe(2)

    const byKey = (k: string) => LEVELS.find((l) => l.key === k)!
    expect(isUnlocked(byKey('zwrotne'), save)).toBe(true)
    expect(isUnlocked(byKey('boss-tener'), save)).toBe(true) // już grany
    expect(isUnlocked(byKey('boss-ser'), save)).toBe(true) // poprzedni (tener) zaliczony
    expect(isUnlocked(byKey('boss-estar'), save)).toBe(false)
    expect(isUnlocked(EXAM_LEVEL, emptySave())).toBe(true) // egzamin zawsze otwarty
    expect(nextLevelToPlay(save).key).toBe('tu')
  })
})
