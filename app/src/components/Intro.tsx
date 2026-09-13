import { useEffect, useRef } from 'react'
import { PERSONS, PERSON_LABEL, VERB_BY_INF } from '../data/verbs'
import type { LevelDef } from '../game/types'
import { FormsTable, VerbWord } from './common'
import { useEnterKey } from './useEnterKey'

type Props = {
  level: LevelDef
  onStart: () => void
  onBack: () => void
}

export function Intro({ level, onStart, onBack }: Props) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus()
  }, [])
  useEnterKey(onStart)

  const boss = level.bossVerb ? VERB_BY_INF[level.bossVerb] : null
  const persons = PERSONS.filter((p) => (level.persons[p] ?? 0) > 0)

  return (
    <div className="screen intro">
      <button type="button" className="link link-back" onClick={onBack}>
        ← menu
      </button>

      {boss ? (
        <>
          <p className="eyebrow">Level {level.id} · boss</p>
          <div className="intro-boss">
            <span className="intro-boss-emoji" aria-hidden="true">
              {boss.boss?.emoji}
            </span>
            <div>
              <h1 className="intro-title">{boss.infinitive.toUpperCase()}</h1>
              <p className="intro-desc">{boss.meaning} · czasownik nieregularny</p>
            </div>
          </div>
          <div className="plaque plaque-table">
            <FormsTable verb={boss.infinitive} />
          </div>
          <p className="intro-note">{boss.note}</p>
          <p className="intro-rules">
            Zapamiętaj tabelkę. Boss ma <b>{level.bossHp} HP</b> — każda poprawna forma to jeden cios.
            Pomyłka nie boli: pokażę poprawną formę i pytanie wróci.
          </p>
          <button ref={btn} type="button" data-primary="1" className="btn btn-primary btn-xl" onClick={onStart}>
            WALCZ ⏎
          </button>
        </>
      ) : (
        <>
          <p className="eyebrow">Level {level.id}</p>
          <h1 className="intro-title">{level.code}</h1>
          <p className="intro-desc">{level.desc}</p>
          <div className="intro-chips">
            {persons.map((p) => (
              <span key={p} className="chip chip-person">
                {PERSON_LABEL[p]}
              </span>
            ))}
          </div>

          {level.id === 1 && (
            <div className="example">
              <span className="example-label">Tak to działa</span>
              <div className="example-row">
                <span className="example-verb">
                  <VerbWord verb="hablar" colored />
                </span>
                <span className="example-op">+</span>
                <span className="chip chip-person">YO</span>
                <span className="example-op">→</span>
                <span className="example-answer">hablo</span>
                <kbd>Enter</kbd>
              </div>
            </div>
          )}

          {level.fixRatio > 0 && (
            <div className="example">
              <span className="example-label">Nowość: napraw błąd</span>
              <div className="example-row">
                <span className="example-sentence">
                  Yo <s>hablas</s> español.
                </span>
                <span className="example-op">→</span>
                <span className="example-answer">hablo</span>
              </div>
            </div>
          )}

          <p className="intro-rules">
            {level.length} pytań · błędy wracają · na końcu runda „do poprawy”
          </p>
          <button ref={btn} type="button" data-primary="1" className="btn btn-primary btn-xl" onClick={onStart}>
            START ⏎
          </button>
        </>
      )}
    </div>
  )
}
