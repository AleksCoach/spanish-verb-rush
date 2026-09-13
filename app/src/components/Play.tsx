import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { PERSONS, PERSON_LABEL, PERSON_SHORT, REFLEXIVE_PRONOUN, VERB_BY_INF } from '../data/verbs'
import { advance, newRound, submit, summarize } from '../game/engine'
import type { RoundState, SubmitResult } from '../game/engine'
import { accentDiffs, applyAccentShortcuts, grade } from '../game/grading'
import { sfx } from '../game/sound'
import { itemKey } from '../game/storage'
import type { Grade, ItemStat, LevelDef, Question } from '../game/types'
import { Decomposition, EndingsRow, FormsTable, GroupChip, VerbWord, fmtPoints } from './common'
import { useEnterKey } from './useEnterKey'

export type StatUpdate = { key: string; stat: ItemStat; grade: Grade } | null

type Props = {
  level: LevelDef
  stats: Record<string, ItemStat>
  xp: number
  onProgress: (xpDelta: number, combo: number, update: StatUpdate) => void
  onFinish: (round: RoundState) => void
  onQuit: () => void
}

type Feedback = SubmitResult & { at: number }
type Splash = 'boss' | 'exam' | 'recovery'

const CORRECT_MS = 750
const ALMOST_MS = 1900
const EXAM_SAVED_MS = 380
const READ_GUARD_MS = 450
const ACCENT_KEYS = ['á', 'é', 'í', 'ó', 'ú']

export function Play({ level, stats, xp, onProgress, onFinish, onQuit }: Props) {
  const statsRef = useRef(stats)
  useEffect(() => {
    statsRef.current = stats
  }, [stats])

  const isExam = level.kind === 'exam'
  const [round, setRound] = useState<RoundState>(() => newRound(level, stats))
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [input, setInput] = useState('')
  const [splashes, setSplashes] = useState<Splash[]>([])
  const [nudge, setNudge] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  /** egzamin: w trakcie nie zdradzamy, czy odpowiedź była dobra */
  const hidden = Boolean(isExam && feedback && feedback.record.q.phase === 'main')

  const goNext = useCallback(() => {
    if (!feedback) return
    const next = advance(round, level, statsRef.current)
    if (next.xp !== round.xp) onProgress(next.xp - round.xp, next.combo, null)
    const queue: Splash[] = []
    if (feedback.bossDefeated) queue.push('boss')
    if (level.kind === 'exam' && round.phase === 'main' && next.phase !== 'main') queue.push('exam')
    // egzamin: ekran wyniku ma już przycisk POPRAW BŁĘDY — bez drugiego ekranu
    if (level.kind !== 'exam' && round.phase === 'main' && next.phase === 'recovery') queue.push('recovery')
    setRound(next)
    setFeedback(null)
    setInput('')
    if (queue.length) setSplashes(queue)
    else if (next.phase === 'done') onFinish(next)
  }, [feedback, round, level, onProgress, onFinish])

  // poprawna / prawie / egzamin → samo idzie dalej; błąd → czeka na Enter
  useEffect(() => {
    if (!feedback) return
    const g = feedback.record.grade
    if (!hidden && g === 'wrong') return
    const ms = hidden ? EXAM_SAVED_MS : g === 'correct' ? CORRECT_MS : ALMOST_MS
    const t = window.setTimeout(goNext, ms)
    return () => window.clearTimeout(t)
  }, [feedback, goNext, hidden])

  useEffect(() => {
    if (!splashes.length) inputRef.current?.focus()
  }, [round.counter, splashes.length, feedback])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submitAnswer()
  }

  function submitAnswer() {
    sfx.unlock()
    if (splashes.length) return
    if (feedback) {
      if (!hidden && feedback.record.grade !== 'correct' && Date.now() - feedback.at < READ_GUARD_MS) return
      goNext()
      return
    }
    if (!round.current || round.phase === 'done') return
    if (!input.trim()) {
      setNudge((n) => n + 1)
      return
    }
    const res = submit(round, level, statsRef.current, input)
    const q = res.record.q
    onProgress(res.state.xp - round.xp, res.state.combo, { key: itemKey(q.verb, q.person), stat: res.stat, grade: res.record.grade })
    setRound(res.state)
    setFeedback({ ...res, at: Date.now() })

    const g = res.record.grade
    if (isExam && q.phase === 'main') sfx.tick()
    else if (res.bossDefeated) sfx.victory()
    else if (g === 'wrong') sfx.wrong()
    else if (g === 'almost') sfx.almost()
    else if (res.comboMilestone && res.comboMilestone >= 5) sfx.combo(res.comboMilestone)
    else if (res.bossHit) sfx.hit()
    else sfx.correct()
  }

  function dismissSplash() {
    const rest = splashes.slice(1)
    setSplashes(rest)
    if (!rest.length && round.phase === 'done') onFinish(round)
  }

  function insertChar(ch: string) {
    if (feedback || splashes.length) return
    const el = inputRef.current
    const start = el?.selectionStart ?? input.length
    const end = el?.selectionEnd ?? input.length
    setInput(input.slice(0, start) + ch + input.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + 1, start + 1)
    })
  }

  const q = round.current
  const bossVerb = level.bossVerb ? VERB_BY_INF[level.bossVerb] : null
  const g = hidden ? undefined : feedback?.record.grade
  const waiting = Boolean(feedback && !hidden && g !== 'correct')

  return (
    <div className="screen play">
      <header className="hud">
        <button type="button" className="hud-quit" onClick={onQuit} aria-label="Wyjdź do menu">
          ✕
        </button>
        <div className="hud-level">
          {isExam ? 'Egzamin próbny' : `Poziom ${level.id} · ${level.code}`}
          {round.phase === 'recovery' && <span className="hud-phase">do poprawy</span>}
        </div>
        <div className="hud-xp">
          pkt <b>{xp}</b>
        </div>
      </header>

      {!isExam ? (
        <div
          key={`combo-${round.combo}`}
          className={`combo${round.combo >= 2 ? ' is-on' : ''}${round.combo >= 5 ? ' is-hot' : ''}`}
          aria-live="polite"
        >
          <span aria-hidden="true">🔥</span> SERIA ×{round.combo}
        </div>
      ) : round.phase === 'main' && !splashes.length ? (
        <div className="combo exam-note">bez podpowiedzi · wynik na końcu</div>
      ) : null}

      {bossVerb && (
        <div className={`boss${feedback?.bossHit ? ' is-hit' : ''}${round.bossHp === 0 ? ' is-down' : ''}`}>
          <span className="boss-emoji" aria-hidden="true">
            {round.bossHp === 0 ? '💥' : bossVerb.boss?.emoji}
          </span>
          <div className="boss-body">
            <div className="boss-name">{bossVerb.boss?.name}</div>
            <div
              className="hp"
              role="progressbar"
              aria-label="Życie jefe"
              aria-valuemin={0}
              aria-valuemax={round.bossMaxHp}
              aria-valuenow={round.bossHp}
            >
              <div className="hp-fill" style={{ width: `${(round.bossHp / round.bossMaxHp) * 100}%` }} />
            </div>
          </div>
          <span className="hp-num">
            {round.bossHp}
            <small>/{round.bossMaxHp} ❤</small>
          </span>
        </div>
      )}

      {splashes[0] === 'boss' && bossVerb ? (
        <SplashCard
          eyebrow={`Poziom ${level.id} · jefe`}
          title="¡JEFE DERROTADO!"
          sub={`${bossVerb.infinitive.toUpperCase()} pokonany · +100 pkt`}
          cta="DALEJ ⏎"
          onContinue={dismissSplash}
        >
          <div className="splash-emoji" aria-hidden="true">
            💥{bossVerb.boss?.emoji}
          </div>
          <div className="plaque plaque-table">
            <FormsTable verb={bossVerb.infinitive} />
          </div>
        </SplashCard>
      ) : splashes[0] === 'exam' ? (
        <ExamResultSplash round={round} level={level} onContinue={dismissSplash} />
      ) : splashes[0] === 'recovery' ? (
        <SplashCard
          eyebrow="Ostatni etap rundy"
          title="DO POPRAWY"
          sub="Popraw te przykłady — wtedy runda się kończy."
          cta="POPRAWIAM ⏎"
          onContinue={dismissSplash}
        >
          <ul className="review-list">
            {round.recoveryQueue.map((k) => {
              const [verb, person] = k.split('|')
              return (
                <li key={k}>
                  <b>{verb}</b> / {PERSON_SHORT[person as keyof typeof PERSON_SHORT]}
                </li>
              )
            })}
          </ul>
        </SplashCard>
      ) : q ? (
        <>
          <section
            key={`${q.n}-${hidden ? 'saved' : (g ?? 'ask')}`}
            className={`plaque plaque-play${g ? ` is-${g}` : ''}${hidden ? ' is-saved' : ''}`}
            aria-live="polite"
          >
            {!feedback && <QuestionFace q={q} level={level} />}
            {hidden && <SavedFace />}
            {feedback && g === 'correct' && <CorrectFace fb={feedback} />}
            {feedback && g === 'almost' && <AlmostFace fb={feedback} />}
            {feedback && g === 'wrong' && <WrongFace fb={feedback} />}
          </section>

          <form className="answer" onSubmit={handleSubmit} autoComplete="off">
            <input
              key={`nudge-${nudge}`}
              ref={inputRef}
              className={`answer-input${g ? ` state-${g}` : ''}${nudge ? ' is-nudged' : ''}`}
              value={feedback ? feedback.record.input : input}
              onChange={(e) => {
                if (!feedback) setInput(applyAccentShortcuts(e.target.value))
              }}
              placeholder={q.kind === 'fix' ? 'poprawna forma…' : VERB_BY_INF[q.verb].reflexive ? 'zaimek + forma…' : 'wpisz formę…'}
              aria-label="Twoja odpowiedź"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="go"
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
                e.preventDefault()
                if (!e.repeat) submitAnswer()
              }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary answer-enter" onMouseDown={(e) => e.preventDefault()}>
              {waiting ? 'DALEJ' : 'SPRAWDŹ'} <span aria-hidden="true">⏎</span>
            </button>
          </form>

          <div className="accents" aria-label="Litery z akcentem">
            {ACCENT_KEYS.map((ch) => (
              <button
                type="button"
                key={ch}
                className="accent-key"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertChar(ch)}
                tabIndex={-1}
              >
                {ch}
              </button>
            ))}
            <span className="accent-tip">
              albo <kbd>a</kbd>+<kbd>'</kbd>
            </span>
          </div>

          <ProgressTiles round={round} level={level} />
        </>
      ) : null}
    </div>
  )
}

function QuestionFace({ q, level }: { q: Question; level: LevelDef }) {
  const v = VERB_BY_INF[q.verb]
  const tags = (
    <div className="plaque-tags">
      {level.kind === 'exam' && q.phase === 'main' && <span className="tag tag-exam">egzamin</span>}
      {q.phase === 'recovery' && <span className="tag tag-recovery">do poprawy</span>}
      {q.retry && q.phase === 'main' && <span className="tag tag-retry">↺ wraca błąd</span>}
      {q.kind === 'fix' && <span className="tag tag-fix">✎ napraw błąd</span>}
      {q.kind === 'conjugate' && level.groupHint && <GroupChip group={v.group} />}
      {q.kind === 'conjugate' && level.groupHint && v.reflexive && <span className="chip chip-se">-SE</span>}
    </div>
  )
  if (q.kind === 'fix') {
    return (
      <>
        {tags}
        <p className="plaque-sentence">{q.wrongSentence}</p>
        <p className="plaque-hint">Znajdź zły czasownik i wpisz poprawną formę</p>
      </>
    )
  }
  return (
    <>
      {tags}
      <div className="plaque-verb">
        <VerbWord verb={q.verb} colored={level.groupHint} />
      </div>
      {level.kind !== 'exam' && <div className="plaque-meaning">{v.meaning}</div>}
      <div className="plaque-person">{PERSON_LABEL[q.person]}</div>
    </>
  )
}

function SavedFace() {
  return (
    <>
      <div className="fb-label saved">zapisane</div>
      <div className="fb-title saved">✓</div>
    </>
  )
}

function CorrectFace({ fb }: { fb: Feedback }) {
  const q = fb.record.q
  return (
    <>
      <div className="fb-title ok">
        <span aria-hidden="true">✓</span> {q.answer.toUpperCase()}
      </div>
      {q.kind === 'fix' && <p className="fb-sentence">{q.rightSentence}</p>}
      <div className="fb-xp">
        +{fb.record.xp} pkt{fb.fixedError ? ' · błąd naprawiony!' : ''}
      </div>
      {fb.comboMilestone && <div className="fb-combo">SERIA ×{fb.comboMilestone}!</div>}
    </>
  )
}

function AlmostFace({ fb }: { fb: Feedback }) {
  const q = fb.record.q
  const diffs = accentDiffs(fb.record.input, q.answer)
  const letters = Array.from(q.answer.toUpperCase())
  return (
    <>
      <div className="fb-label almost">PRAWIE!</div>
      <div className="fb-title almost">
        {letters.map((ch, i) => (
          <span key={i} className={diffs.includes(i) ? 'accent-miss' : undefined}>
            {ch}
          </span>
        ))}
      </div>
      {q.kind === 'fix' && <p className="fb-sentence">{q.rightSentence}</p>}
      <p className="fb-hint">Forma dobra — pilnuj akcentu. Skrót: a + ' → á</p>
      <div className="fb-xp">+{fb.record.xp} pkt</div>
    </>
  )
}

function WrongFace({ fb }: { fb: Feedback }) {
  const q = fb.record.q
  const v = VERB_BY_INF[q.verb]
  const input = fb.record.input
  const mistakenFor = PERSONS.find((p) => p !== q.person && grade(input, v.forms[p]) !== 'wrong')
  // zwrotny bez zaimka: "levanto" zamiast "me levanto"
  const bare = v.reflexive ? q.answer.split(' ').slice(1).join(' ') : ''
  const missingPronoun = v.reflexive && !mistakenFor && grade(input, bare) !== 'wrong'
  return (
    <>
      <div className="fb-label bad">Nie tym razem</div>
      <div className="fb-line">
        <span className="fb-person">{PERSON_SHORT[q.person]}</span>
        <span aria-hidden="true">→</span>
        <b>{q.answer.toUpperCase()}</b>
      </div>
      {q.kind === 'fix' && <p className="fb-sentence">{q.rightSentence}</p>}
      {v.type === 'regular' ? (
        <>
          <Decomposition verb={q.verb} person={q.person} />
          <EndingsRow group={v.group} highlight={q.person} reflexive={v.reflexive} />
        </>
      ) : (
        <>
          <FormsTable verb={q.verb} highlight={q.person} compact />
          <p className="fb-hint">{v.note}</p>
        </>
      )}
      <p className="fb-your">
        Twoje: <s>{input}</s>
        {mistakenFor && (
          <>
            {' '}
            — to forma dla <b>{PERSON_SHORT[mistakenFor]}</b>
          </>
        )}
        {missingPronoun && (
          <>
            {' '}
            — brakuje zaimka <b>{REFLEXIVE_PRONOUN[q.person]}</b>
          </>
        )}
        <span className="fb-later">{q.phase === 'main' ? ' · wróci za chwilę ↺' : ' · jeszcze raz za moment'}</span>
      </p>
    </>
  )
}

function ProgressTiles({ round, level }: { round: RoundState; level: LevelDef }) {
  if (round.phase === 'recovery') {
    const done = round.recoveryTotal - round.recoveryQueue.length
    return (
      <div className="progress">
        <span className="progress-label">Do poprawy</span>
        <div className="tiles" style={{ gridTemplateColumns: `repeat(${round.recoveryTotal}, 1fr)` }}>
          {Array.from({ length: round.recoveryTotal }, (_, i) => (
            <span key={i} className={`tile${i < done ? ' is-correct' : i === done ? ' is-current' : ''}`} />
          ))}
        </div>
        <span className="progress-num">
          {done}/{round.recoveryTotal}
        </span>
      </div>
    )
  }
  if (level.kind === 'boss') return null
  const main = round.history.filter((h) => h.q.phase === 'main')
  const exam = level.kind === 'exam'
  return (
    <div className="progress">
      <div className="tiles" style={{ gridTemplateColumns: `repeat(${level.length}, 1fr)` }}>
        {Array.from({ length: level.length }, (_, i) => {
          const rec = main[i]
          const cls = rec ? (exam ? ' is-answered' : ` is-${rec.grade}`) : i === main.length ? ' is-current' : ''
          return <span key={i} className={`tile${cls}`} />
        })}
      </div>
      <span className="progress-num">
        {main.length}/{level.length}
      </span>
    </div>
  )
}

function ExamResultSplash({ round, level, onContinue }: { round: RoundState; level: LevelDef; onContinue: () => void }) {
  const summary = summarize(round, level)
  const exam = summary.exam
  if (!exam) return null
  const pct = Math.round(summary.score * 100)
  const hasErrors = round.recoveryTotal > 0
  return (
    <SplashCard
      eyebrow="Egzamin próbny · wynik"
      title={`${pct}%`}
      sub={`Ocena orientacyjna: ${exam.grade.value} (${exam.grade.label})`}
      cta={hasErrors ? 'POPRAW BŁĘDY ⏎' : 'ZAKOŃCZ ⏎'}
      onContinue={onContinue}
    >
      <div className="exam-breakdown">
        {exam.breakdown.map((b) => (
          <div key={b.label} className="exam-row">
            <span className="exam-label">{b.label}</span>
            <span className="exam-bar" aria-hidden="true">
              <span
                className={`exam-fill${b.points / b.total >= 0.7 ? ' is-good' : ' is-weak'}`}
                style={{ width: `${(b.points / b.total) * 100}%` }}
              />
            </span>
            <span className="exam-num">
              {fmtPoints(b.points)}/{b.total}
            </span>
          </div>
        ))}
      </div>
      {exam.errors.length > 0 && (
        <ul className="exam-errors">
          {exam.errors.map((e, i) => (
            <li key={i}>
              <span className="exam-prompt">{e.prompt}</span>
              <span className="exam-fix">
                <s>{e.input}</s> → <b>{e.answer}</b>
                {e.grade === 'almost' && <em> (akcent, ½ pkt)</em>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SplashCard>
  )
}

function SplashCard({
  eyebrow,
  title,
  sub,
  cta,
  onContinue,
  children,
}: {
  eyebrow: string
  title: string
  sub: string
  cta: string
  onContinue: () => void
  children?: ReactNode
}) {
  const btn = useRef<HTMLButtonElement>(null)
  const mountedAt = useRef(0)
  useEffect(() => {
    mountedAt.current = Date.now()
    btn.current?.focus()
  }, [])
  useEnterKey(onContinue, true, READ_GUARD_MS)
  return (
    <section className="splash">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="splash-title">{title}</h2>
      <p className="splash-sub">{sub}</p>
      {children}
      <button
        ref={btn}
        type="button"
        data-primary="1"
        className="btn btn-primary btn-xl"
        onClick={() => {
          if (Date.now() - mountedAt.current > READ_GUARD_MS) onContinue()
        }}
      >
        {cta}
      </button>
    </section>
  )
}
