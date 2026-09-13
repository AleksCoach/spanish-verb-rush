import {
  ENDINGS,
  GROUP_LABEL,
  PERSONS,
  PERSON_SHORT,
  REFLEXIVE_PRONOUN,
  VERB_BY_INF,
  ruleForm,
  stemOf,
} from '../data/verbs'
import type { Group, Person } from '../game/types'

/** 17 → "17", 16.5 → "16,5" */
export const fmtPoints = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

export function Stars({ n, big = false }: { n: number; big?: boolean }) {
  return (
    <span className={`stars${big ? ' stars-big' : ''}`} aria-label={`${n} z 3 gwiazdek`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'star is-on' : 'star'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

export function GroupChip({ group }: { group: Group }) {
  return <span className={`chip chip-${group}`}>{GROUP_LABEL[group]}</span>
}

/** Bezokolicznik z pokolorowaną końcówką grupy (HABL·AR, LEVANT·AR·SE). */
export function VerbWord({ verb, colored }: { verb: string; colored: boolean }) {
  const v = VERB_BY_INF[verb]
  const up = verb.toUpperCase()
  if (!colored) return <>{up}</>
  const base = v.reflexive ? up.slice(0, -2) : up
  return (
    <>
      {base.slice(0, -2)}
      <span className={`ink-${v.group}`}>{base.slice(-2)}</span>
      {v.reflexive && <span className="ink-se">SE</span>}
    </>
  )
}

/** Tabelka odmiany w układzie hiszpańskim: liczba pojedyncza | mnoga (długie formy zwrotne w jednej kolumnie). */
export function FormsTable({ verb, highlight, compact = false }: { verb: string; highlight?: Person; compact?: boolean }) {
  const v = VERB_BY_INF[verb]
  return (
    <div className={`forms${compact ? ' forms-compact' : ''}${v.reflexive ? ' forms-long' : ''}`}>
      {PERSONS.map((p) => {
        const form = v.forms[p]
        const odd = v.type === 'irregular' && form !== ruleForm(verb, p)
        return (
          <div key={p} className={`forms-cell${p === highlight ? ' is-target' : ''}`}>
            <span className="forms-person">{PERSON_SHORT[p]}</span>
            <span className={`forms-form${odd ? ' is-odd' : ''}`}>{form}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Decomposition({ verb, person }: { verb: string; person: Person }) {
  const v = VERB_BY_INF[verb]
  const stem = stemOf(verb)
  const bare = v.reflexive ? v.forms[person].split(' ').slice(1).join(' ') : v.forms[person]
  const ending = bare.slice(stem.length)
  return (
    <div className="decomp" aria-label={`${v.reflexive ? REFLEXIVE_PRONOUN[person] + ' plus ' : ''}${stem} plus ${ending}`}>
      {v.reflexive && (
        <>
          <span className="decomp-pron">{REFLEXIVE_PRONOUN[person]}</span>
          <span className="decomp-plus">+</span>
        </>
      )}
      <span className="decomp-stem">{stem}</span>
      <span className="decomp-plus">+</span>
      <span className={`decomp-end glaze-${v.group}`}>{ending}</span>
    </div>
  )
}

export function EndingsRow({ group, highlight, reflexive = false }: { group: Group; highlight: Person; reflexive?: boolean }) {
  return (
    <div className="endings">
      <span className={`chip chip-${group}`}>{GROUP_LABEL[group]}</span>
      {PERSONS.map((p) => (
        <span key={p} className={`ending${p === highlight ? ` is-target glaze-${group}` : ''}`}>
          {reflexive ? `${REFLEXIVE_PRONOUN[p]} -${ENDINGS[group][p]}` : ENDINGS[group][p]}
        </span>
      ))}
    </div>
  )
}

/** Tabelka zaimków zwrotnych: yo me · tú te · … */
export function PronounTable() {
  return (
    <div className="pronouns">
      {PERSONS.map((p) => (
        <span key={p} className="pronoun">
          <span className="pronoun-person">{PERSON_SHORT[p]}</span>
          <b>{REFLEXIVE_PRONOUN[p]}</b>
        </span>
      ))}
    </div>
  )
}
