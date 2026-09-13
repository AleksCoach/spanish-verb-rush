import type { LevelDef, Person } from '../game/types'
import { EXAM_IRREGULAR } from './levels'
import { PERSON_SHORT, VERB_BY_INF } from './verbs'

/** fragment do czytania na głos: po polsku albo po hiszpańsku */
export type Seg = { lang: 'pl' | 'es'; text: string }

export type Sheet = {
  /** duży napis reguły, np. "TÚ → -as / -es" */
  title: string
  /** jedno zdanie po polsku */
  rule: string
  /** przykłady rozkładane na temat + końcówkę */
  examples?: { verb: string; person: Person }[]
  /** pokaż tabelkę końcówek (osoby × grupy) */
  endingsTable?: { persons: Person[]; highlight?: Person[] }
  /** pokaż zaimki zwrotne */
  pronouns?: boolean
  /** pokaż tabelkę form jednego czasownika (jefe) */
  formsOf?: string
  /** przykład zdania do poprawy */
  fixExample?: { wrong: string; right: string; answer: string }
  tip?: string
  speech: Seg[]
}

const pl = (text: string): Seg => ({ lang: 'pl', text })
const es = (text: string): Seg => ({ lang: 'es', text })

export function sheetFor(level: LevelDef): Sheet {
  switch (level.key) {
    case 'yo':
      return {
        title: 'YO → -o',
        rule: 'Odetnij -ar / -er / -ir i dopisz -o. W każdej grupie tak samo.',
        examples: [
          { verb: 'hablar', person: 'yo' },
          { verb: 'comer', person: 'yo' },
          { verb: 'vivir', person: 'yo' },
        ],
        speech: [
          pl('Osoba'), es('yo.'),
          pl('Odcinasz końcówkę bezokolicznika i dopisujesz o. Na przykład:'),
          es('hablar, hablo. Comer, como. Vivir, vivo.'),
        ],
      }
    case 'tu':
      return {
        title: 'TÚ → -as / -es',
        rule: '-ar → -as · -er i -ir → -es',
        examples: [
          { verb: 'hablar', person: 'tu' },
          { verb: 'comer', person: 'tu' },
          { verb: 'vivir', person: 'tu' },
        ],
        tip: 'Pamiętaj z poprzedniego poziomu: yo → -o',
        speech: [
          pl('Osoba'), es('tú.'),
          pl('Czasowniki na a r dostają a s. Czasowniki na e r i i r dostają e s. Na przykład:'),
          es('hablas, comes, vives.'),
        ],
      }
    case 'mix':
      return {
        title: 'ÉL / ELLA → -a / -e',
        rule: '-ar → -a · -er i -ir → -e (jak tú, tylko bez -s)',
        examples: [
          { verb: 'hablar', person: 'el' },
          { verb: 'comer', person: 'el' },
          { verb: 'vivir', person: 'el' },
        ],
        endingsTable: { persons: ['yo', 'tu', 'el'], highlight: ['el'] },
        speech: [
          pl('Osoba'), es('él, ella.'),
          pl('Tak jak przy tú, tylko bez s na końcu. Na przykład:'),
          es('habla, come, vive.'),
        ],
      }
    case 'full-team':
      return {
        title: 'Cała tabelka',
        rule: '-er i -ir różnią się tylko w NOSOTROS i VOSOTROS.',
        endingsTable: { persons: ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'], highlight: ['nosotros', 'vosotros'] },
        tip: 'vosotros ma akcent: -áis · -éis · -ís',
        speech: [
          pl('Teraz wszystkie osoby. Uważaj na'), es('nosotros'), pl('i'), es('vosotros.'),
          pl('Tu czasowniki na e r i i r się różnią:'),
          es('comemos, vivimos. Coméis, vivís.'),
          pl('I pamiętaj o akcencie w'), es('vosotros.'),
        ],
      }
    case 'mixed-verbs':
      return {
        title: 'Grupa → osoba → forma',
        rule: 'Najpierw sprawdź końcówkę bezokolicznika (-ar, -er, -ir), potem dobierz końcówkę do osoby.',
        endingsTable: { persons: ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'] },
        fixExample: { wrong: 'Yo hablas español.', right: 'Yo hablo español.', answer: 'hablo' },
        tip: 'Napraw błąd: podmiot (yo, tú…) mówi, jaka ma być końcówka.',
        speech: [
          pl('Teraz nie ma kolorowej podpowiedzi. Najpierw sprawdź, czy czasownik kończy się na a r, e r czy i r. Potem dobierz końcówkę do osoby.'),
          pl('Nowe zadanie: napraw błąd. Na przykład:'), es('Yo hablas español.'),
          pl('Poprawnie:'), es('Yo hablo español.'),
        ],
      }
    case 'zwrotne':
      return {
        title: 'zaimek + forma',
        rule: 'Czasownik zwrotny (-se) ma przed sobą zaimek. Końcówka jak zwykle.',
        pronouns: true,
        examples: [
          { verb: 'levantarse', person: 'yo' },
          { verb: 'levantarse', person: 'nosotros' },
        ],
        tip: 'Bez zaimka to błąd: „levanto” ✗ → „me levanto” ✓',
        speech: [
          pl('Czasowniki zwrotne kończą się na s e. Przed czasownikiem stawiasz zaimek:'),
          es('me, te, se, nos, os, se.'),
          pl('Na przykład:'), es('me levanto. Nos levantamos.'),
        ],
      }
    case 'egzamin':
      return {
        title: 'Egzamin próbny',
        rule: 'Wszystko z Kompetencji 1: regularne (-ar, -er, -ir), zwrotne (-se) i nieregularne. Bez podpowiedzi — tabelki trzeba mieć w głowie.',
        tip: `Nieregularne: ${EXAM_IRREGULAR.join(', ')}`,
        speech: [
          pl('Egzamin próbny. Dwadzieścia pytań z całego materiału, bez podpowiedzi. Brak akcentu to pół punktu. Powodzenia!'),
          es('¡Suerte!'),
        ],
      }
    case 'wielki-mix':
      return {
        title: 'Wszystko naraz',
        rule: 'Regularne, zwrotne i nieregularne — sprawdź grupę, osobę i czy jest -se.',
        endingsTable: { persons: ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'] },
        pronouns: true,
        speech: [pl('Wielka mieszanka: wszystko naraz. Sprawdzaj grupę, osobę i zaimek.'), es('¡Vamos!')],
      }
  }

  if (level.bossVerb) {
    const v = VERB_BY_INF[level.bossVerb]
    return {
      title: `${v.infinitive.toUpperCase()} — zapamiętaj`,
      rule: v.note ?? 'Czasownik nieregularny — zapamiętaj formy.',
      formsOf: v.infinitive,
      tip: 'Podkreślone formy są nieregularne.',
      speech: [
        pl('Czasownik'), es(`${v.infinitive}.`), pl(`Po polsku: ${v.meaning}. Posłuchaj form:`),
        ...(['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'] as Person[]).map((p) => es(`${PERSON_SHORT[p]} ${v.forms[p]}.`)),
      ],
    }
  }

  return { title: level.code, rule: level.desc, speech: [pl(level.desc)] }
}
