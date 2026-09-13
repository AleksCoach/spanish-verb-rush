import { useEffect, useRef } from 'react'
import { VERB_BY_INF } from '../data/verbs'
import type { LevelDef } from '../game/types'
import { CheatSheet } from './CheatSheet'
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
  const isExam = level.kind === 'exam'
  const label = isExam ? 'ZACZYNAM EGZAMIN' : boss ? 'WALCZ' : 'ZACZYNAMY'

  return (
    <div className="screen intro">
      <button type="button" className="link link-back" onClick={onBack}>
        ← menu
      </button>

      {isExam ? (
        <>
          <p className="eyebrow">Egzamin próbny</p>
          <h1 className="intro-title">KOMPETENCJA 1</h1>
        </>
      ) : boss ? (
        <>
          <p className="eyebrow">
            Poziom {level.id} · jefe{level.bonus ? ' · dodatkowy (poza egzaminem)' : ''}
          </p>
          <div className="intro-boss">
            <span className="intro-boss-emoji" aria-hidden="true">
              {boss.boss?.emoji}
            </span>
            <div>
              <h1 className="intro-title">{boss.infinitive.toUpperCase()}</h1>
              <p className="intro-desc">
                {boss.meaning} · {boss.reflexive ? 'zwrotny i nieregularny' : 'nieregularny'}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="eyebrow">
            Poziom {level.id}
            {level.bonus ? ' · dodatkowy' : ''}
          </p>
          <h1 className="intro-title">{level.code}</h1>
        </>
      )}

      <CheatSheet level={level} />

      <p className="intro-rules">
        {isExam ? (
          <>
            {level.length} pytań, bez podpowiedzi i bez sprawdzania w trakcie. Brak akcentu = pół punktu. Na końcu wynik w
            %, ocena orientacyjna i poprawa błędów.
          </>
        ) : boss ? (
          <>
            Jefe ma <b>{level.bossHp} żyć</b> — każda poprawna forma to jeden cios. Pomyłka nie boli: pokażę poprawną
            formę i pytanie wróci.
          </>
        ) : (
          <>
            {level.length} pytań · wpisz formę i naciśnij <kbd>Enter</kbd> · błędy wracają, na końcu runda „do poprawy”
          </>
        )}
      </p>

      <button ref={btn} type="button" data-primary="1" className="btn btn-primary btn-xl" onClick={onStart}>
        {label} ⏎
      </button>
    </div>
  )
}
