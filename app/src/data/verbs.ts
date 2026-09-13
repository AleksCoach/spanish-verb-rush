import type { Group, Person, Verb } from '../game/types'

export const PERSONS: Person[] = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos']

export const PERSON_LABEL: Record<Person, string> = {
  yo: 'YO',
  tu: 'TÚ',
  el: 'ÉL / ELLA',
  nosotros: 'NOSOTROS',
  vosotros: 'VOSOTROS',
  ellos: 'ELLOS / ELLAS',
}

export const PERSON_SHORT: Record<Person, string> = {
  yo: 'yo',
  tu: 'tú',
  el: 'él',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  ellos: 'ellos',
}

export const ENDINGS: Record<Group, Record<Person, string>> = {
  ar: { yo: 'o', tu: 'as', el: 'a', nosotros: 'amos', vosotros: 'áis', ellos: 'an' },
  er: { yo: 'o', tu: 'es', el: 'e', nosotros: 'emos', vosotros: 'éis', ellos: 'en' },
  ir: { yo: 'o', tu: 'es', el: 'e', nosotros: 'imos', vosotros: 'ís', ellos: 'en' },
}

export const REFLEXIVE_PRONOUN: Record<Person, string> = {
  yo: 'me',
  tu: 'te',
  el: 'se',
  nosotros: 'nos',
  vosotros: 'os',
  ellos: 'se',
}

/** czasownik zwrotny: levantarse, acostarse… */
export function isReflexive(infinitive: string): boolean {
  return /(ar|er|ir)se$/.test(infinitive)
}

/** bezokolicznik bez -se: levantarse → levantar */
export function baseOf(infinitive: string): string {
  return isReflexive(infinitive) ? infinitive.slice(0, -2) : infinitive
}

export function stemOf(infinitive: string): string {
  return baseOf(infinitive).slice(0, -2)
}

export function groupOf(infinitive: string): Group {
  return baseOf(infinitive).slice(-2) as Group
}

/** Forma utworzona wg reguły (dla regularnych = poprawna; dla nieregularnych = do porównania). */
export function ruleForm(infinitive: string, person: Person): string {
  const form = stemOf(infinitive) + ENDINGS[groupOf(infinitive)][person]
  return isReflexive(infinitive) ? `${REFLEXIVE_PRONOUN[person]} ${form}` : form
}

function regular(infinitive: string, meaning: string, complements: string[]): Verb {
  const forms = {} as Record<Person, string>
  for (const p of PERSONS) forms[p] = ruleForm(infinitive, p)
  return { infinitive, type: 'regular', reflexive: isReflexive(infinitive), group: groupOf(infinitive), meaning, forms, complements }
}

function irregular(
  infinitive: string,
  meaning: string,
  f: [string, string, string, string, string, string],
  complements: string[],
  note: string,
  boss: { emoji: string; name: string },
): Verb {
  const forms = {} as Record<Person, string>
  PERSONS.forEach((p, i) => (forms[p] = f[i]))
  return {
    infinitive,
    type: 'irregular',
    reflexive: isReflexive(infinitive),
    group: groupOf(infinitive),
    meaning,
    forms,
    complements,
    note,
    boss,
  }
}

export const VERBS: Verb[] = [
  // -AR
  regular('hablar', 'mówić', ['español', 'con la profesora', 'por teléfono']),
  regular('trabajar', 'pracować', ['en casa', 'mucho', 'en un hospital']),
  regular('estudiar', 'uczyć się (studiować)', ['matemáticas', 'inglés', 'para el examen']),
  regular('escuchar', 'słuchać', ['música', 'la radio', 'a la profesora']),
  regular('mirar', 'patrzeć', ['la pizarra', 'por la ventana', 'las fotos']),
  regular('comprar', 'kupować', ['pan', 'un libro', 'ropa nueva']),
  regular('bailar', 'tańczyć', ['salsa', 'en la fiesta', 'muy bien']),
  // -ER
  regular('comer', 'jeść', ['pizza', 'una manzana', 'en casa']),
  regular('beber', 'pić', ['agua', 'leche', 'zumo de naranja']),
  regular('aprender', 'uczyć się (czegoś)', ['español', 'a nadar', 'muchas cosas']),
  regular('leer', 'czytać', ['un libro', 'cómics', 'el periódico']),
  regular('correr', 'biegać', ['en el parque', 'muy rápido', 'cada mañana']),
  regular('vender', 'sprzedawać', ['fruta', 'helados', 'el coche']),
  // -IR
  regular('vivir', 'mieszkać', ['en Madrid', 'en Polonia', 'cerca del colegio']),
  regular('escribir', 'pisać', ['un mensaje', 'una carta', 'en el cuaderno']),
  regular('abrir', 'otwierać', ['la ventana', 'la puerta', 'el libro']),
  regular('recibir', 'dostawać', ['un regalo', 'muchos mensajes', 'una carta']),
  regular('subir', 'wchodzić na górę', ['la escalera', 'a la montaña', 'al tercer piso']),
  // ZWROTNE (-se) — zaimek + forma; llamarse bez zdań (imię nie pasuje do wszystkich osób)
  regular('levantarse', 'wstawać', ['a las siete', 'temprano', 'tarde']),
  regular('ducharse', 'brać prysznic', ['por la mañana', 'por la noche', 'después del partido']),
  regular('lavarse', 'myć (się)', ['las manos', 'los dientes', 'la cara']),
  regular('peinarse', 'czesać się', ['rápido', 'delante del espejo', 'por la mañana']),
  regular('quedarse', 'zostawać', ['en casa', 'en el colegio', 'con los abuelos']),
  regular('llamarse', 'nazywać się', []),

  // NIEREGULARNE (bossowie)
  irregular(
    'tener', 'mieć',
    ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
    ['un perro', 'hambre', 'dos hermanos'],
    'yo → tengo · e→ie w tú, él, ellos · nosotros i vosotros normalnie',
    { emoji: '🐲', name: 'Smok TENER' },
  ),
  irregular(
    'ser', 'być (kim/jakim)',
    ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    ['de Polonia', 'de Madrid', 'de aquí'],
    'całkiem nieregularny — zapamiętaj: soy, eres, es, somos, sois, son',
    { emoji: '👻', name: 'Duch SER' },
  ),
  irregular(
    'estar', 'być (gdzie/jak)',
    ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    ['en casa', 'en el colegio', 'en la playa'],
    'yo → estoy · akcent: estás, está, estáis, están',
    { emoji: '🗿', name: 'Golem ESTAR' },
  ),
  irregular(
    'ir', 'iść / jechać',
    ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    ['al colegio', 'a la playa', 'al cine'],
    'wszystko na v-: voy, vas, va, vamos, vais, van',
    { emoji: '🌪️', name: 'Tornado IR' },
  ),
  irregular(
    'ver', 'widzieć / oglądać',
    ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
    ['la tele', 'una película', 'a los abuelos'],
    'yo → veo · vosotros → veis (bez akcentu) · reszta jak -ER',
    { emoji: '👁️', name: 'Oko VER' },
  ),
  irregular(
    'acostarse', 'kłaść się spać',
    ['me acuesto', 'te acuestas', 'se acuesta', 'nos acostamos', 'os acostáis', 'se acuestan'],
    ['a las diez', 'tarde', 'muy temprano'],
    'o→ue oprócz nosotros i vosotros · zaimek: me, te, se, nos, os, se',
    { emoji: '🦉', name: 'Sowa ACOSTARSE' },
  ),
  irregular(
    'hacer', 'robić',
    ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
    ['los deberes', 'deporte', 'una tarta'],
    'tylko yo jest dziwne: hago · reszta jak -ER',
    { emoji: '🤖', name: 'Robot HACER' },
  ),
  irregular(
    'querer', 'chcieć',
    ['quiero', 'quieres', 'quiere', 'queremos', 'queréis', 'quieren'],
    ['un helado', 'ir al cine', 'una bici'],
    'e→ie wszędzie oprócz nosotros i vosotros',
    { emoji: '🧛', name: 'Wampir QUERER' },
  ),
  irregular(
    'poder', 'móc',
    ['puedo', 'puedes', 'puede', 'podemos', 'podéis', 'pueden'],
    ['nadar', 'jugar al fútbol', 'venir mañana'],
    'o→ue wszędzie oprócz nosotros i vosotros',
    { emoji: '🦍', name: 'Goryl PODER' },
  ),
  irregular(
    'jugar', 'grać',
    ['juego', 'juegas', 'juega', 'jugamos', 'jugáis', 'juegan'],
    ['al fútbol', 'a los videojuegos', 'en el parque'],
    'u→ue wszędzie oprócz nosotros i vosotros',
    { emoji: '👾', name: 'Kosmita JUGAR' },
  ),
  irregular(
    'venir', 'przychodzić',
    ['vengo', 'vienes', 'viene', 'venimos', 'venís', 'vienen'],
    ['a la fiesta', 'del colegio', 'mañana'],
    'yo → vengo · e→ie · nosotros venimos, vosotros venís (jak -IR)',
    { emoji: '🦂', name: 'Skorpion VENIR' },
  ),
]

export const VERB_BY_INF: Record<string, Verb> = Object.fromEntries(VERBS.map((v) => [v.infinitive, v]))

/** regularne bez zwrotnych (levele 1–5) */
export const REGULAR_VERBS = VERBS.filter((v) => v.type === 'regular' && !v.reflexive).map((v) => v.infinitive)
/** regularne zwrotne (-se) */
export const REFLEXIVE_VERBS = VERBS.filter((v) => v.type === 'regular' && v.reflexive).map((v) => v.infinitive)
export const IRREGULAR_VERBS = VERBS.filter((v) => v.type === 'irregular').map((v) => v.infinitive)

export const GROUP_LABEL: Record<Group, string> = { ar: '-AR', er: '-ER', ir: '-IR' }
