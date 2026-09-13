import type { LevelDef, Person } from '../game/types'
import { EXAM_IRREGULAR } from './levels'
import { SPOKEN_MEANING } from './commentary'
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
          pl('Pierwsza osoba, czyli ja. Odcinasz końcówkę bezokolicznika i dopisujesz literę o. Posłuchaj:'),
          es('Hablar: yo hablo. Comer: yo como. Vivir: yo vivo.'),
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
          pl('Druga osoba, czyli ty. Czasowniki na ar dostają końcówkę as, a czasowniki na er i ir końcówkę es. Posłuchaj:'),
          es('Hablar: tú hablas. Comer: tú comes. Vivir: tú vives.'),
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
          pl('Trzecia osoba, czyli on albo ona. Tak jak przy drugiej osobie, tylko bez litery s na końcu. Posłuchaj:'),
          es('Él habla. Ella come. Él vive.'),
        ],
      }
    case 'full-team':
      return {
        title: 'Cała tabelka',
        rule: '-er i -ir różnią się tylko w NOSOTROS i VOSOTROS.',
        endingsTable: { persons: ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'], highlight: ['nosotros', 'vosotros'] },
        tip: 'vosotros ma akcent: -áis · -éis · -ís',
        speech: [
          pl('Teraz wszystkie osoby. Czasowniki na er i ir różnią się tylko w dwóch z nich. Posłuchaj i zwróć uwagę na akcent:'),
          es('Nosotros comemos, nosotros vivimos. Vosotros coméis, vosotros vivís.'),
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
          pl('Teraz nie ma kolorowej podpowiedzi. Najpierw sprawdź, czy czasownik kończy się na ar, er czy ir. Potem dobierz końcówkę do osoby.'),
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
          pl('Czasowniki zwrotne kończą się na se. Przed czasownikiem stawiasz zaimek, a końcówka jest taka jak zwykle. Posłuchaj:'),
          es('Yo me levanto. Tú te levantas. Él se levanta. Nosotros nos levantamos. Vosotros os levantáis. Ellos se levantan.'),
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
        pl(`Czasownik nieregularny. Po polsku: ${SPOKEN_MEANING[v.infinitive] ?? v.meaning}. Posłuchaj form:`),
        es(
          `${v.infinitive.charAt(0).toUpperCase()}${v.infinitive.slice(1)}. ` +
          (['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'] as Person[])
            .map((p) => `${PERSON_SHORT[p].charAt(0).toUpperCase()}${PERSON_SHORT[p].slice(1)} ${v.forms[p]}.`)
            .join(' '),
        ),
      ],
    }
  }

  return { title: level.code, rule: level.desc, speech: [pl(level.desc)] }
}

/** id nagrania ściągi w audio/manifest.json */
export const sheetLineId = (level: LevelDef): string => `sheet-${level.key}`

/** ściąga do nagrania i odtwarzania: sąsiednie fragmenty w tym samym języku sklejone (płynniej brzmi) */
export function sheetSpeech(level: LevelDef): Seg[] {
  const out: Seg[] = []
  for (const s of sheetFor(level).speech) {
    const last = out[out.length - 1]
    if (last && last.lang === s.lang) last.text = `${last.text} ${s.text}`
    else out.push({ ...s })
  }
  return out
}
