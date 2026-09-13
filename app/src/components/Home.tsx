import { useEffect, useRef, useState } from 'react'
import { EXAM_LEVEL, LEVELS, isPassed, isUnlocked, nextLevelToPlay } from '../data/levels'
import { VERB_BY_INF } from '../data/verbs'
import { dayKey } from '../game/activity'
import type { SaveData } from '../game/types'
import { ParentLink } from './ParentLink'
import { Stars } from './common'
import { useEnterKey } from './useEnterKey'

type Props = {
  save: SaveData
  profileId: string
  playerName: string
  onPlay: (levelId: number) => void
  onToggleSound: () => void
  onReset: () => void
  onLogout: () => void
}

export function Home({ save, profileId, playerName, onPlay, onToggleSound, onReset, onLogout }: Props) {
  const next = nextLevelToPlay(save)
  const btn = useRef<HTMLButtonElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const passedCount = LEVELS.filter((l) => !l.alwaysOpen && isPassed(l, save)).length
  const lastExam = save.exams.length ? save.exams[save.exams.length - 1] : null
  const bestExam = save.exams.reduce((m, e) => Math.max(m, e.score), 0)
  const today = save.activity[dayKey()]

  useEffect(() => {
    btn.current?.focus()
  }, [])
  useEnterKey(() => onPlay(next.id), !confirmReset)

  return (
    <div className="screen home">
      <header className="plaque plaque-brand">
        <p className="brand-eyebrow">Presente de indicativo</p>
        <h1 className="brand-title">¡A conjugar!</h1>
        <p className="brand-sub">hiszpańskie czasowniki</p>
      </header>

      <div className="player-bar">
        <span>
          Gracz: <b>{playerName}</b>
        </span>
        <button type="button" className="link" onClick={onLogout}>
          zmień gracza
        </button>
      </div>

      <dl className="home-stats">
        <div>
          <dt>Punkty</dt>
          <dd>{save.xp}</dd>
        </div>
        <div>
          <dt>Najdłuższa seria</dt>
          <dd>{save.bestCombo}</dd>
        </div>
        <div>
          <dt>Zaliczone</dt>
          <dd>
            {passedCount}
            <small>/{LEVELS.length - 1}</small>
          </dd>
        </div>
      </dl>

      <button ref={btn} type="button" data-primary="1" className="btn btn-primary btn-xl btn-play" onClick={() => onPlay(next.id)}>
        <span>▶ GRAJ</span>
        <small>
          Poziom {next.id} · {next.code}
        </small>
      </button>

      <button type="button" className="btn btn-ghost btn-xl btn-exam" onClick={() => onPlay(EXAM_LEVEL.id)}>
        <span>🎓 EGZAMIN PRÓBNY</span>
        <small>
          {lastExam
            ? `ostatnio ${Math.round(lastExam.score * 100)}% · najlepiej ${Math.round(bestExam * 100)}%`
            : 'Kompetencja 1 · 20 pytań · sprawdź się'}
        </small>
      </button>

      {today && (
        <p className="today">
          Dziś: <b>{Math.round(today.activeSec / 60)} min</b> nauki · <b>{today.answers}</b> przykładów ·{' '}
          <b>{today.answers ? Math.round(((today.correct + today.almost) / today.answers) * 100) : 0}%</b> dobrze
        </p>
      )}

      <p className="howto">
        Widzisz czasownik i osobę → wpisujesz formę → <kbd>Enter</kbd>. Błędy wracają, aż je opanujesz.
      </p>

      <section className="map" aria-label="Poziomy">
        {LEVELS.map((l) => {
          const best = save.levels[l.key]
          const locked = !isUnlocked(l, save)
          const boss = l.bossVerb ? VERB_BY_INF[l.bossVerb].boss : undefined
          const icon = locked ? '🔒' : l.kind === 'exam' ? '🎓' : boss ? boss.emoji : ''
          return (
            <button
              key={l.key}
              type="button"
              className={`lvl lvl-${l.kind}${l.bonus ? ' is-bonus' : ''}${locked ? ' is-locked' : ''}${l.id === next.id ? ' is-next' : ''}`}
              disabled={locked}
              onClick={() => onPlay(l.id)}
              aria-label={`Poziom ${l.id}: ${l.code}${locked ? ' — zablokowany' : ''}`}
            >
              <span className="lvl-num">{l.id}</span>
              <span className="lvl-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="lvl-code">
                {l.code}
                {l.bonus && <em className="lvl-bonus">dodatkowy</em>}
              </span>
              <Stars n={best?.stars ?? 0} />
            </button>
          )
        })}
      </section>

      <ParentLink profileId={profileId} playerName={playerName} />

      <footer className="home-foot">
        <button type="button" className="link" onClick={onToggleSound}>
          {save.sound ? '🔊 dźwięk: wł.' : '🔇 dźwięk: wył.'}
        </button>
        {confirmReset ? (
          <span className="reset-confirm">
            Skasować postęp gracza {playerName}?{' '}
            <button type="button" className="link link-danger" onClick={onReset}>
              tak
            </button>{' '}
            <button type="button" className="link" onClick={() => setConfirmReset(false)}>
              nie
            </button>
          </span>
        ) : (
          <button type="button" className="link" onClick={() => setConfirmReset(true)}>
            reset postępu
          </button>
        )}
      </footer>
    </div>
  )
}
