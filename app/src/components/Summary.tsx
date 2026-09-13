import { useEffect, useRef } from 'react'
import { LEVEL_BY_ID, MAX_LEVEL, PASS_ACCURACY } from '../data/levels'
import { VERB_BY_INF } from '../data/verbs'
import type { Summary as SummaryData } from '../game/engine'
import type { LevelDef } from '../game/types'
import { Stars } from './common'
import { useEnterKey } from './useEnterKey'

type Props = {
  level: LevelDef
  summary: SummaryData
  unlockedNow: boolean
  canNext: boolean
  onNext: () => void
  onReplay: () => void
  onHome: () => void
}

const GUARD_MS = 600

export function Summary({ level, summary, unlockedNow, canNext, onNext, onReplay, onHome }: Props) {
  const primary = useRef<HTMLButtonElement>(null)
  const mountedAt = useRef(0)
  useEffect(() => {
    mountedAt.current = Date.now()
    primary.current?.focus()
  }, [])
  const guarded = (fn: () => void) => () => {
    if (Date.now() - mountedAt.current > GUARD_MS) fn()
  }

  const nextAvailable = canNext && level.id < MAX_LEVEL
  useEnterKey(nextAvailable ? onNext : onReplay, true, GUARD_MS)

  const boss = level.bossVerb ? VERB_BY_INF[level.bossVerb] : null
  const nextLevel = level.id < MAX_LEVEL ? LEVEL_BY_ID[level.id + 1] : null
  const pct = Math.round(summary.accuracy * 100)

  let message: string
  if (!nextLevel && summary.passed) message = 'Wszystkie levele zaliczone! Graj WIELKI MIX i bij rekord combo.'
  else if (unlockedNow && nextLevel) message = `Odblokowany level ${nextLevel.id}: ${nextLevel.code}`
  else if (!summary.passed && nextLevel && !canNext)
    message = `Masz ${pct}%. Zdobądź ${Math.round(PASS_ACCURACY * 100)}%, żeby odblokować level ${nextLevel.id}.`
  else message = summary.stars === 3 ? 'Bez jednego błędu. Szacun.' : 'Każda runda wzmacnia pamięć. Jeszcze raz?'

  return (
    <div className="screen summary">
      <p className="eyebrow">
        Level {level.id} · {level.code}
      </p>
      <h1 className="summary-title">
        {boss ? (
          <>
            <span aria-hidden="true">{boss.boss?.emoji} </span>BOSS DEFEATED
          </>
        ) : (
          'RUNDA ZAKOŃCZONA'
        )}
      </h1>
      <Stars n={summary.stars} big />

      <dl className="summary-stats">
        <div>
          <dt>poprawnych</dt>
          <dd>
            {summary.ok}
            <small> / {summary.total}</small>
          </dd>
        </div>
        <div>
          <dt>best combo</dt>
          <dd>{summary.bestCombo}</dd>
        </div>
        <div>
          <dt>XP</dt>
          <dd className="xp">+{summary.xp}</dd>
        </div>
      </dl>

      {summary.bonuses.length > 0 && (
        <div className="bonuses">
          {summary.bonuses.map((b) => (
            <span key={b.label} className="bonus">
              {b.label} +{b.xp} XP
            </span>
          ))}
        </div>
      )}

      <div className="summary-lists">
        {summary.mastered.length > 0 && (
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
        )}
        {summary.toReview.length > 0 && (
          <section>
            <h2>Do powtórki</h2>
            <ul>
              {summary.toReview.slice(0, 6).map((r) => (
                <li key={r.label}>
                  <span className="mark-review" aria-hidden="true">
                    →
                  </span>{' '}
                  {r.label} <b>{r.form}</b>
                </li>
              ))}
              {summary.toReview.length > 6 && <li className="more">+{summary.toReview.length - 6} więcej</li>}
            </ul>
          </section>
        )}
      </div>

      <p className={`unlock-msg${unlockedNow ? ' is-unlocked' : ''}`}>{message}</p>

      <div className="summary-actions">
        {canNext && nextLevel && (
          <button ref={primary} type="button" data-primary="1" className="btn btn-primary btn-xl" onClick={guarded(onNext)}>
            NASTĘPNY LEVEL ▶
          </button>
        )}
        <button
          ref={canNext && nextLevel ? undefined : primary}
          type="button"
          data-primary={canNext && nextLevel ? undefined : '1'}
          className={canNext && nextLevel ? 'btn btn-ghost btn-xl' : 'btn btn-primary btn-xl'}
          onClick={guarded(onReplay)}
        >
          GRAM JESZCZE RAZ ↻
        </button>
      </div>
      <button type="button" className="link" onClick={onHome}>
        menu
      </button>
    </div>
  )
}
