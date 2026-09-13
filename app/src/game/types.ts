export type Person = 'yo' | 'tu' | 'el' | 'nosotros' | 'vosotros' | 'ellos'
export type Group = 'ar' | 'er' | 'ir'

export type Verb = {
  infinitive: string
  type: 'regular' | 'irregular'
  /** zwrotny (-se): formy zawierają zaimek, np. me levanto */
  reflexive: boolean
  group: Group
  meaning: string
  forms: Record<Person, string>
  /** dopełnienia do zdań w trybie NAPRAW BŁĄD, np. "español" (puste = bez zdań) */
  complements: string[]
  note?: string
  boss?: { emoji: string; name: string }
}

export type LevelKind = 'regular' | 'boss' | 'mix' | 'exam'

export type LevelDef = {
  /** numer wyświetlany (kolejność na mapie) */
  id: number
  /** stały identyfikator do zapisu postępu — nie zmieniać po wydaniu */
  key: string
  code: string
  kind: LevelKind
  desc: string
  /** wagi osób — brak klucza = osoba nie występuje */
  persons: Partial<Record<Person, number>>
  verbs: string[]
  /** kolor i etykieta grupy (-AR/-ER/-IR) na karcie + rotacja grup */
  groupHint: boolean
  /** liczba pytań w rundzie głównej (dla bossa ignorowane) */
  length: number
  /** udział pytań NAPRAW BŁĄD */
  fixRatio: number
  /** mnożnik wagi czasowników nieregularnych w poziomach mix */
  irregularBoost?: number
  bossVerb?: string
  bossHp?: number
  /** dostępny zawsze (egzamin próbny) */
  alwaysOpen?: boolean
  /** poza zakresem egzaminu */
  bonus?: boolean
}

export type Item = { verb: string; person: Person }

export type Question = {
  n: number
  kind: 'conjugate' | 'fix'
  verb: string
  person: Person
  answer: string
  wrongSentence?: string
  rightSentence?: string
  /** to pytanie wraca po wcześniejszym błędzie */
  retry: boolean
  phase: 'main' | 'recovery'
}

export type Grade = 'correct' | 'almost' | 'wrong'

export type AnswerRecord = {
  q: Question
  input: string
  grade: Grade
  xp: number
}

export type ItemStat = {
  attempts: number
  correct: number
  wrong: number
  streak: number
}

export type LevelBest = {
  stars: number
  bestAccuracy: number
  plays: number
  bestCombo: number
}

export type ExamResult = { at: number; score: number }

/** aktywność jednego dnia (do monitorowania nauki) */
export type DayActivity = {
  /** sekundy aktywnej gry: liczone tylko, gdy ostatni ruch gracza był ≤ 5 s temu i gra jest na ekranie */
  activeSec: number
  answers: number
  correct: number
  almost: number
  wrong: number
  rounds: number
  passed: number
}

export type SaveData = {
  version: 2
  xp: number
  bestCombo: number
  /** wyniki leveli po LevelDef.key */
  levels: Record<string, LevelBest>
  stats: Record<string, ItemStat>
  sound: boolean
  /** historia egzaminów próbnych (ostatnie 20) */
  exams: ExamResult[]
  /** aktywność per dzień, klucz RRRR-MM-DD */
  activity: Record<string, DayActivity>
}
