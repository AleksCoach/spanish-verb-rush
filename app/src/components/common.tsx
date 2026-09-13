import { ENDINGS, GROUP_LABEL, PERSONS, PERSON_SHORT, VERB_BY_INF, ruleForm, stemOf } from '../data/verbs'
import type { Group, Person } from '../game/types'

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

/** Bezokolicznik z pokolorowaną końcówką grupy (HABL·AR). */
export function VerbWord({ verb, colored }: { verb: string; colored: boolean }) {
  const up = verb.toUpperCase()
  if (!colored) return <>{up}</>
  const group = VERB_BY_INF[verb].group
  return (
    <>
      {up.slice(0, -2)}
      <span className={`ink-${group}`}>{up.slice(-2)}</span>
    </>
  )
}

/** Tabelka odmiany w układzie hiszpańskim: liczba pojedyncza | mnoga. */
export function FormsTable({ verb, highlight, compact = false }: { verb: string; highlight?: Person; compact?: boolean }) {
  const v = VERB_BY_INF[verb]
  return (
    <div className={`forms${compact ? ' forms-compact' : ''}`}>
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
  const form = v.forms[person]
  return (
    <div className="decomp" aria-label={`${stem} plus ${form.slice(stem.length)}`}>
      <span className="decomp-stem">{stem}</span>
      <span className="decomp-plus">+</span>
      <span className={`decomp-end glaze-${v.group}`}>{form.slice(stem.length)}</span>
    </div>
  )
}

export function EndingsRow({ group, highlight }: { group: Group; highlight: Person }) {
  return (
    <div className="endings">
      <span className={`chip chip-${group}`}>{GROUP_LABEL[group]}</span>
      {PERSONS.map((p) => (
        <span key={p} className={`ending${p === highlight ? ` is-target glaze-${group}` : ''}`}>
          {ENDINGS[group][p]}
        </span>
      ))}
    </div>
  )
}
