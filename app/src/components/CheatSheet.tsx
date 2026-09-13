import { useEffect, useState } from 'react'
import { sheetFor } from '../data/cheatsheets'
import { ENDINGS, GROUP_LABEL, PERSON_SHORT } from '../data/verbs'
import { canSpeak, speak, stopSpeaking } from '../game/speech'
import type { Group, LevelDef, Person } from '../game/types'
import { Decomposition, FormsTable, PronounTable, VerbWord } from './common'

const GROUPS: Group[] = ['ar', 'er', 'ir']

/** Ściąga przed poziomem: reguła, przykłady, tabelka — jeden ekran, z opcją czytania na głos (PL/ES). */
export function CheatSheet({ level }: { level: LevelDef }) {
  const sheet = sheetFor(level)
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => () => stopSpeaking(), [])

  const toggleVoice = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    speak(sheet.speech, () => setSpeaking(false))
  }

  return (
    <section className="plaque sheet" aria-label="Ściąga">
      <div className="sheet-head">
        <span className="tag tag-sheet">ściąga</span>
        {canSpeak() && (
          <button type="button" className="sheet-voice" onClick={toggleVoice}>
            {speaking ? '■ stop' : '🔊 posłuchaj'}
          </button>
        )}
      </div>

      <h2 className="sheet-title">{sheet.title}</h2>
      <p className="sheet-rule">{sheet.rule}</p>

      {sheet.examples && (
        <div className="sheet-examples">
          {sheet.examples.map((ex) => (
            <div key={`${ex.verb}-${ex.person}`} className="sheet-example">
              <span className="sheet-inf">
                <VerbWord verb={ex.verb} colored />
              </span>
              <span className="sheet-person">{PERSON_SHORT[ex.person]} →</span>
              <Decomposition verb={ex.verb} person={ex.person} />
            </div>
          ))}
        </div>
      )}

      {sheet.endingsTable && <EndingsTable persons={sheet.endingsTable.persons} highlight={sheet.endingsTable.highlight} />}
      {sheet.pronouns && <PronounTable />}
      {sheet.formsOf && <FormsTable verb={sheet.formsOf} />}

      {sheet.fixExample && (
        <p className="sheet-fix">
          <s>{sheet.fixExample.wrong}</s> → <b>{sheet.fixExample.right}</b>
        </p>
      )}

      {sheet.tip && <p className="sheet-tip">{sheet.tip}</p>}
    </section>
  )
}

function EndingsTable({ persons, highlight = [] }: { persons: Person[]; highlight?: Person[] }) {
  return (
    <div className="sheet-table-wrap">
      <table className="sheet-table">
        <thead>
          <tr>
            <th aria-label="osoba" />
            {GROUPS.map((g) => (
              <th key={g} className={`th-${g}`}>
                {GROUP_LABEL[g]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {persons.map((p) => (
            <tr key={p} className={highlight.includes(p) ? 'is-hl' : undefined}>
              <th scope="row">{PERSON_SHORT[p]}</th>
              {GROUPS.map((g) => (
                <td key={g}>-{ENDINGS[g][p]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
