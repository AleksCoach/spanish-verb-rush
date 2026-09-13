import { useEffect, useRef } from 'react'
import { LEVELS, LEVEL_BY_ID, MAX_LEVEL, PASS_ACCURACY } from '../data/levels'
import { VERB_BY_INF } from '../data/verbs'
import type { Summary as SummaryData } from '../game/engine'
import type { ExamResult, LevelDef } from '../game/types'
import { Stars, fmtPoints } from './common'
import { useEnterKey } from './useEnterKey'

type Props = {
  level: LevelDef
  summary: SummaryData
  unlockedNow: boolean
  canNext: boolean
  /** historia egzaminów (tylko dla egzaminu) */
  exams: ExamResult[]
  onNext: () => void
  onReplay: () => void
  onHome: () => void
}

const GUARD_MS = 600

/** gdzie ćwiczyć słaby dział egzaminu */
function practiceLevel(category: string) {
  const key = category.startsWith('regularne') ? 'mixed-verbs' : category.startsWith('zwrotne') ? 'zwrotne' : `boss-${category}`
  return LEVELS.find((l) => l.key === key)
}

export function Summary({ level, summary, unlockedNow, canNext, exams, onNext, onReplay, onHome }: Props) {
  const primary = useRef<HTMLButtonElement>(null)
  const mountedAt = useRef(0)
  useEffect(() => {
    mountedAt.current = Date.now()
    primary.current?.focus()
  }, [])
  const guarded = (fn: () => void) => () => {
    if (Date.now() - mountedAt.current > GUARD_MS) fn()
  }

  const isExam = level.kind === 'exam'
  const nextLevel = level.id < MAX_LEVEL ? LEVEL_BY_ID[level.id + 1] : null
  const showNext = Boolean(canNext && nextLevel && !isExam)
  useEnterKey(showNext ? onNext : isExam ? onHome : onReplay, true, GUARD_MS)

  const boss = level.bossVerb ? VERB_BY_INF[level.bossVerb] : null
  const pct = Math.round(summary.score * 100)

  let message: string
  if (isExam) {
    const prev = exams.length >= 2 ? Math.round(exams[exams.length - 2].score * 100) : null
    message =
      prev === null
        ? 'Pierwszy egzamin za Tobą. Słabsze działy przećwicz w levelach i spróbuj znowu.'
        : pct > prev
          ? `Lepiej niż ostatnio (${prev}% → ${pct}%). Tak trzymaj!`
          : `Poprzednio: ${prev}%. Przećwicz słabsze działy i spróbuj znowu.`
  } else if (!nextLevel && summary.passed) message = 'Wszystkie poziomy zaliczone! Graj WIELKĄ MIESZANKĘ i bij rekord serii.'
  else if (unlockedNow && nextLevel) message = `Odblokowany poziom ${nextLevel.id}: ${nextLevel.code}`
  else if (!summary.passed && nextLevel && !canNext)
    message = `Masz ${pct}%. Zdobądź ${Math.round(PASS_ACCURACY * 100)}%, żeby odblokować poziom ${nextLevel.id}.`
  else message = summary.stars === 3 ? 'Bez jednego błędu. Szacun.' : 'Każda runda wzmacnia pamięć. Jeszcze raz?'

  const points = summary.exam ? summary.exam.breakdown.reduce((a, b) => a + b.points, 0) : 0

  return (
    <div className="screen summary">
      <p className="eyebrow">{isExam ? 'Egzamin próbny · Kompetencja 1' : `Poziom ${level.id} · ${level.code}`}</p>
      <h1 className="summary-title">
        {isExam ? (
          `WYNIK ${pct}%`
        ) : boss ? (
          <>
            <span aria-hidden="true">{boss.boss?.emoji} </span>¡JEFE DERROTADO!
          </>
        ) : (
          'RUNDA ZAKOŃCZONA'
        )}
      </h1>
      <Stars n={summary.stars} big />

      {isExam && summary.exam ? (
        <dl className="summary-stats">
          <div>
            <dt>punkty</dt>
            <dd>
              {fmtPoints(points)}
              <small> / {summary.total}</small>
            </dd>
          </div>
          <div>
            <dt>ocena (orient.)</dt>
            <dd>{summary.exam.grade.value}</dd>
          </div>
          <div>
            <dt>punkty</dt>
            <dd className="xp">+{summary.xp}</dd>
          </div>
        </dl>
      ) : (
        <dl className="summary-stats">
          <div>
            <dt>poprawnych</dt>
            <dd>
              {summary.ok}
              <small> / {summary.total}</small>
            </dd>
          </div>
          <div>
            <dt>najdłuższa seria</dt>
            <dd>{summary.bestCombo}</dd>
          </div>
          <div>
            <dt>punkty</dt>
            <dd className="xp">+{summary.xp}</dd>
          </div>
        </dl>
      )}

      {summary.bonuses.length > 0 && (
        <div className="bonuses">
          {summary.bonuses.map((b) => (
            <span key={b.label} className="bonus">
              {b.label} +{b.xp} pkt
            </span>
          ))}
        </div>
      )}

      <div className="summary-lists">
        {isExam && summary.exam ? (
          <section>
            <h2>Działy</h2>
            <ul>
              {summary.exam.breakdown.map((b) => (
                <li key={b.label}>
                  <span className={b.points / b.total >= 0.7 ? 'mark-ok' : 'mark-review'} aria-hidden="true">
                    {b.points / b.total >= 0.7 ? '✓' : '→'}
                  </span>{' '}
                  {b.label} <b>{fmtPoints(b.points)}/{b.total}</b>
                  {b.points / b.total < 0.7 && practiceLevel(b.label) && (
                    <span className="more"> · ćwicz: poziom {practiceLevel(b.label)!.id}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          summary.mastered.length > 0 && (
            <section>
              <h2>Opanowane</h2>
              <ul>
                {summary.mastered.slice(0, 6).map((m) => (
                  <li key={m}>
                    <span className="mark-ok" aria-hidden="true">
                      ✓
                    </span>{' '}
                    {m}
                  </li>
                ))}
                {summary.mastered.length > 6 && <li className="more">+{summary.mastered.length - 6} więcej</li>}
              </ul>
            </section>
          )
        )}
        {summary.toReview.length > 0 && (
          <section>
            <h2>Do powtórki</h2>
            <ul>
              {summary.toReview.slice(0, 8).map((r) => (
                <li key={r.label}>
                  <span className="mark-review" aria-hidden="true">
                    →
                  </span>{' '}
                  {r.label} <b>{r.form}</b>
                </li>
              ))}
              {summary.toReview.length > 8 && <li className="more">+{summary.toReview.length - 8} więcej</li>}
            </ul>
          </section>
        )}
      </div>

      <p className={`unlock-msg${unlockedNow ? ' is-unlocked' : ''}`}>{message}</p>

      <div className="summary-actions">
        {showNext && (
          <button ref={primary} type="button" data-primary="1" className="btn btn-primary btn-xl" onClick={guarded(onNext)}>
            NASTĘPNY POZIOM ▶
          </button>
        )}
        {isExam && (
          <button ref={primary} type="button" data-primary="1" className="btn btn-primary btn-xl" onClick={guarded(onHome)}>
            MENU — ĆWICZ SŁABSZE DZIAŁY
          </button>
        )}
        <button
          ref={showNext || isExam ? undefined : primary}
          type="button"
          data-primary={showNext || isExam ? undefined : '1'}
          className={showNext || isExam ? 'btn btn-ghost btn-xl' : 'btn btn-primary btn-xl'}
          onClick={guarded(onReplay)}
        >
          {isExam ? 'NOWY EGZAMIN ↻' : 'GRAM JESZCZE RAZ ↻'}
        </button>
      </div>
      {!isExam && (
        <button type="button" className="link" onClick={onHome}>
          menu
        </button>
      )}
    </div>
  )
}
