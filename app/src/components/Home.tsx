import { useEffect, useRef, useState } from 'react'
import { LEVELS, LEVEL_BY_ID, MAX_LEVEL } from '../data/levels'
import { VERB_BY_INF } from '../data/verbs'
import type { SaveData } from '../game/types'
import { Stars } from './common'
import { useEnterKey } from './useEnterKey'

type Props = {
  save: SaveData
  playerName: string
  onPlay: (levelId: number) => void
  onToggleSound: () => void
  onReset: () => void
  onLogout: () => void
}

export function Home({ save, playerName, onPlay, onToggleSound, onReset, onLogout }: Props) {
  const nextId = Math.min(save.unlocked, MAX_LEVEL)
  const next = LEVEL_BY_ID[nextId]
  const btn = useRef<HTMLButtonElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    btn.current?.focus()
  }, [])
  useEnterKey(() => onPlay(nextId), !confirmReset)

  return (
    <div className="screen home">
      <header className="plaque plaque-brand">
        <p className="brand-eyebrow">Presente de indicativo</p>
        <h1 className="brand-title">
          Spanish <span>Verb Rush</span>
        </h1>
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
          <dt>XP</dt>
          <dd>{save.xp}</dd>
        </div>
        <div>
          <dt>Best combo</dt>
          <dd>{save.bestCombo}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>
            {nextId}
            <small>/{MAX_LEVEL}</small>
          </dd>
        </div>
      </dl>

      <button ref={btn} type="button" data-primary="1" className="btn btn-primary btn-xl btn-play" onClick={() => onPlay(nextId)}>
        <span>▶ GRAJ</span>
        <small>
          Level {nextId} · {next.code}
        </small>
      </button>

      <p className="howto">
        Widzisz czasownik i osobę → wpisujesz formę → <kbd>Enter</kbd>. Błędy wracają, aż je opanujesz.
      </p>

      <section className="map" aria-label="Levele">
        {LEVELS.map((l) => {
          const best = save.levels[l.id]
          const locked = l.id > save.unlocked
          const boss = l.bossVerb ? VERB_BY_INF[l.bossVerb].boss : undefined
          return (
            <button
              key={l.id}
              type="button"
              className={`lvl lvl-${l.kind}${locked ? ' is-locked' : ''}${l.id === nextId ? ' is-next' : ''}`}
              disabled={locked}
              onClick={() => onPlay(l.id)}
              aria-label={`Level ${l.id}: ${l.code}${locked ? ' — zablokowany' : ''}`}
            >
              <span className="lvl-num">{l.id}</span>
              <span className="lvl-icon" aria-hidden="true">
                {locked ? '🔒' : boss ? boss.emoji : ''}
              </span>
              <span className="lvl-code">{l.code}</span>
              <Stars n={best?.stars ?? 0} />
            </button>
          )
        })}
      </section>

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
