export type Person = 'yo' | 'tu' | 'el' | 'nosotros' | 'vosotros' | 'ellos'
export type Group = 'ar' | 'er' | 'ir'

export type Verb = {
  infinitive: string
  type: 'regular' | 'irregular'
  group: Group
  meaning: string
  forms: Record<Person, string>
  /** dopełnienia do zdań w trybie NAPRAW BŁĄD, np. "español" */
  complements: string[]
  note?: string
  boss?: { emoji: string; name: string }
}

export type LevelKind = 'regular' | 'boss' | 'mix'

export type LevelDef = {
  id: number
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

export type SaveData = {
  version: 1
  xp: number
  unlocked: number
  bestCombo: number
  levels: Record<number, LevelBest>
  stats: Record<string, ItemStat>
  sound: boolean
}
