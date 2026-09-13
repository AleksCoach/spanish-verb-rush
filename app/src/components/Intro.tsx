import { useEffect, useRef } from 'react'
import { EXAM_IRREGULAR } from '../data/levels'
import { PERSONS, PERSON_LABEL, VERB_BY_INF } from '../data/verbs'
import type { LevelDef } from '../game/types'
import { FormsTable, PronounTable, VerbWord } from './common'
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
  const startButton = (label: string) => (
    <button ref={btn} type="button" data-primary="1" className="btn btn-primary btn-xl" onClick={onStart}>
      {label} ⏎
    </button>
  )

  return (
    <div className="screen intro">
      <button type="button" className="link link-back" onClick={onBack}>
        ← menu
      </button>

      {level.kind === 'exam' ? (
        <>
          <p className="eyebrow">Egzamin próbny</p>
          <h1 className="intro-title">KOMPETENCJA 1</h1>
          <p className="intro-desc">Cały materiał na sprawdzian:</p>
          <ul className="scope-list">
            <li>
              <b>regularne</b> -ar · -er · -ir
            </li>
            <li>
              <b>zwrotne</b> -se (me, te, se, nos, os, se)
            </li>
            <li>
              <b>nieregularne:</b> {EXAM_IRREGULAR.join(', ')}
            </li>
          </ul>
          <p className="intro-rules">
            {level.length} pytań, bez podpowiedzi i bez sprawdzania w trakcie — jak na prawdziwym sprawdzianie. Brak
            akcentu = pół punktu. Na końcu wynik w %, ocena orientacyjna i poprawa błędów.
          </p>
          {startButton('ZACZYNAM EGZAMIN')}
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
                {boss.meaning} · {boss.reflexive ? 'zwrotny i nieregularny' : 'czasownik nieregularny'}
              </p>
            </div>
          </div>
          <div className="plaque plaque-table">
            <FormsTable verb={boss.infinitive} />
          </div>
          <p className="intro-note">{boss.note}</p>
          <p className="intro-rules">
            Zapamiętaj tabelkę. Jefe ma <b>{level.bossHp} żyć</b> — każda poprawna forma to jeden cios.
            Pomyłka nie boli: pokażę poprawną formę i pytanie wróci.
          </p>
          {startButton('WALCZ')}
        </>
      ) : (
        <>
          <p className="eyebrow">
            Poziom {level.id}
            {level.bonus ? ' · dodatkowy' : ''}
          </p>
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

          {level.key === 'zwrotne' && (
            <div className="example">
              <span className="example-label">Zaimek + forma czasownika</span>
              <PronounTable />
              <div className="example-row">
                <span className="example-verb">
                  <VerbWord verb="levantarse" colored />
                </span>
                <span className="example-op">+</span>
                <span className="chip chip-person">YO</span>
                <span className="example-op">→</span>
                <span className="example-answer">me levanto</span>
              </div>
            </div>
          )}

          {level.key === 'mixed-verbs' && (
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
          {startButton('ZACZYNAMY')}
        </>
      )}
    </div>
  )
}
