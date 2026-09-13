// Komentator „Toni” — hiszpański komentator sportowy z Madrytu, który komentuje naukę jak mecz.
// Zasady: krótko (do ~12 słów), ciepło, nigdy nie wyśmiewa błędów; polski do wyjaśnień,
// hiszpański do okrzyków i form czasowników; im wyższy poziom, tym więcej hiszpańskiego.
// Bez imion (pliki audio są publiczne) — zwraca się „crack”, „campeón”, „mistrzu”.
// Ten plik czyta też skrypt generujący nagrania (scripts/generate-voice.mjs), więc bez importów.

export type Line = {
  id: string
  cat: string
  text: string
  /** język klipu: pl / es — tylko dla jednojęzycznych (słówka); reszta to mieszanka */
  lang?: 'pl' | 'es'
}

type Group = [cat: string, texts: string[]]

const GROUPS: Group[] = [
  // ---------- powitanie (ekran startowy, raz na sesję) ----------
  ['welcome', [
    '{es:¡Hola, campeón!} Tu komentator Toni. Gramy? {es:¡Vamos!}',
    '{es:¡Buenas!} Toni na stanowisku. Dziś trenujemy czasowniki. {es:¡A jugar!}',
    '{es:¡Hola, crack!} Stadion pełny, kibice czekają. Zaczynamy?',
    '{es:¡Bienvenido!} Rozgrzewka czasowników. {es:¡Venga, a por ello!}',
    '{es:¡Hola de nuevo!} Wracamy na boisko. {es:¡Vamos a conjugar!}',
    '{es:¡Qué alegría verte!} Kilka minut treningu i jesteś lepszy niż wczoraj.',
    '{es:¡Hola!} Krótki mecz z czasownikami? {es:¡Adelante!}',
    '{es:¡Hola, mistrzu!} Piłka w grze, czasowniki czekają.',
  ]],

  // ---------- zapowiedzi poziomów ----------
  ['intro-yo', [
    'Poziom pierwszy: {es:yo.} Odcinasz końcówkę i dopisujesz o. {es:Hablo, como, vivo. ¡Vamos!}',
    'Zaczynamy od {es:yo!} Zawsze na końcu o. {es:Hablo, como, vivo.}',
  ]],
  ['intro-tu', [
    'Teraz {es:tú!} Czasowniki na ar dostają as, na er i ir dostają es. {es:Hablas, comes, vives.}',
    '{es:Tú,} czyli ty: {es:hablas, comes, vives. ¡Adelante!}',
  ]],
  ['intro-mix', [
    '{es:¡Él y ella!} Tak jak {es:tú,} tylko krócej: {es:habla, come, vive. ¡Adelante!}',
    '{es:Yo, tú y él} w jednej drużynie. Uważaj, kto gra! {es:¡Concentración!}',
  ]],
  ['intro-full-team', [
    'Cała drużyna na boisku! Uważaj na {es:nosotros y vosotros. ¡Concentración!}',
    'Wszystkie osoby! {es:Nosotros:} mos na końcu. {es:Vosotros:} z akcentem. {es:¡Vamos!}',
  ]],
  ['intro-mixed-verbs', [
    'Bez kolorowych podpowiedzi! Najpierw sprawdź: ar, er czy ir. {es:¡Tú puedes!}',
    'Teraz naprawiasz błędy w zdaniach. Patrz na podmiot! {es:¡Ojo!}',
  ]],
  ['intro-zwrotne', [
    'Czasowniki zwrotne! Najpierw zaimek: {es:me, te, se, nos, os, se. ¡Me levanto!}',
    'Zwrotne na {es:se! Yo me ducho, tú te duchas.} Zaimek zawsze z przodu.',
  ]],
  ['intro-boss-tener', [
    '{es:¡Atención!} Wchodzi Smok {es:TENER.} Pamiętaj: {es:yo tengo, tú tienes. ¡A por él!}',
    'Smok {es:TENER} zieje ogniem! {es:Tengo, tienes, tiene. ¡Sin miedo!}',
  ]],
  ['intro-boss-ser', [
    '{es:¡Cuidado!} Duch {es:SER. Soy, eres, es, somos, sois, son. ¡Sin miedo!}',
    'Duch {es:SER} straszy! {es:Yo soy, tú eres, vosotros sois,} bez akcentu!',
  ]],
  ['intro-boss-estar', [
    'Golem {es:ESTAR} na boisku! {es:Estoy, estás, está.} I pilnuj akcentów!',
    'Golem {es:ESTAR} jest twardy jak skała. {es:¡Yo estoy! ¡A por él!}',
  ]],
  ['intro-boss-ir', [
    'Tornado {es:IR!} Formy są zupełnie inne: {es:voy, vas, va. ¡Vamos!}',
    'Tornado {es:IR} wiruje! {es:Yo voy, vosotros vais,} bez akcentu! {es:¡Aguanta!}',
  ]],
  ['intro-boss-ver', [
    'Oko {es:VER} patrzy! {es:Yo veo, vosotros veis,} bez akcentu. {es:¡Ojo!}',
    'Oko {es:VER} wszystko widzi. {es:Veo, ves, ve. ¡Concentración!}',
  ]],
  ['intro-boss-jugar', [
    'Kosmita {es:JUGAR!} U zmienia się w ue: {es:juego, juegas.} Ale {es:jugamos!}',
    'Kosmita {es:JUGAR} ląduje! {es:Juego, juegas, juega. ¡A jugar!}',
  ]],
  ['intro-boss-acostarse', [
    'Sowa {es:ACOSTARSE! Me acuesto, te acuestas,} ale {es:nos acostamos. ¡A por ella!}',
    'Sowa {es:ACOSTARSE} nie śpi! Zaimek i ue: {es:me acuesto. ¡Vamos!}',
  ]],
  ['intro-egzamin', [
    'Egzamin próbny! Dwadzieścia pytań, zero podpowiedzi. Pokaż, co umiesz. {es:¡Suerte!}',
    '{es:¡Silencio en el estadio!} Egzamin się zaczyna. Spokojnie i dokładnie.',
  ]],
  ['intro-boss-hacer', [
    'Robot {es:HACER!} Tylko {es:yo} jest dziwne: {es:hago.} Reszta normalnie. {es:¡Dale!}',
  ]],
  ['intro-boss-querer', [
    'Wampir {es:QUERER!} E zmienia się w ie: {es:quiero, quieres. ¡Tú puedes!}',
  ]],
  ['intro-boss-poder', [
    'Goryl {es:PODER!} O zmienia się w ue: {es:puedo, puedes. ¡Fuerza!}',
  ]],
  ['intro-boss-venir', [
    'Skorpion {es:VENIR! Yo vengo, tú vienes, nosotros venimos. ¡Cuidado!}',
  ]],
  ['intro-wielki-mix', [
    'Wielka mieszanka! Wszystko naraz. To jest finał, {es:crack. ¡Vamos!}',
  ]],

  // ---------- pochwały za serie ----------
  ['combo3', [
    '{es:¡Tres seguidas!} Trzy z rzędu!',
    '{es:¡Eso es!} Seria rośnie.',
    '{es:¡Muy bien!} Tak trzymaj.',
    '{es:¡Bien!} Trzecia z rzędu, jak po sznurku.',
    '{es:¡Olé!} Trzy trafienia!',
    '{es:¡Perfecto!} Rozkręcasz się.',
    '{es:¡Sí, señor!} Idzie jak z płatka.',
    '{es:¡Genial!} Seria trwa.',
    '{es:¡Bravo!} Trzy na trzy.',
    '{es:¡Qué bien!} Tak się gra.',
    '{es:¡Vamos!} Kolejne trafienie!',
    '{es:¡Buenísimo!} Seria w toku.',
  ]],
  ['combo5', [
    '{es:¡Golazo!} Pięć z rzędu!',
    '{es:¡Cinco seguidas!} Kibice wstają z miejsc!',
    '{es:¡Qué máquina!} Piątka bez błędu!',
    '{es:¡Increíble!} Pięć z rzędu!',
    '{es:¡Madre mía!} Pięć trafień z rzędu!',
    '{es:¡Espectacular!} Tak gra mistrz.',
    '{es:¡Imparable!} Pięć i lecimy dalej.',
    '{es:¡Fantástico!} Pięć na pięć!',
    '{es:¡Qué crack!} Nikt cię nie zatrzyma!',
    '{es:¡Olé, olé!} Pięć z rzędu!',
  ]],
  ['combo10', [
    '{es:¡No me lo creo!} Znowu bez błędu!',
    '{es:¡Golazo de chilena!} Co za seria!',
    '{es:¡Madre mía!} Seria rośnie i rośnie!',
    '{es:¡Campeón del mundo!} Seria nie do zatrzymania!',
    '{es:¡Qué pasada!} Kolejna piątka do serii!',
    '{es:¡Histórico!} Takiej serii dawno nie było!',
    '{es:¡Leyenda!} Stadion szaleje!',
  ]],

  // ---------- błąd naprawiony / prawie ----------
  ['fixed', [
    '{es:¡Eso es!} Błąd naprawiony.',
    '{es:¡Así se hace!} Tym razem idealnie.',
    '{es:¡Bien!} Wróciło i już siedzi w głowie.',
    '{es:¡Perfecto!} Poprawka jak z podręcznika.',
    '{es:¡Muy bien!} Uczysz się na błędach.',
    '{es:¡Sí!} Teraz już pamiętasz.',
    '{es:¡Genial!} Rewanż wygrany!',
    '{es:¡Bravo!} Tym razem gol!',
  ]],
  ['almost', [
    '{es:¡Casi, casi!} Pilnuj akcentu.',
    '{es:¡Uy!} Forma dobra, popraw akcent.',
    '{es:¡Casi perfecto!} Akcent też się liczy.',
    'Dobrze, ale kreska nad literą! {es:¡Ojo con la tilde!}',
    '{es:¡Muy cerca!} Popraw akcent i będzie {es:golazo.}',
    'Prawie! Na sprawdzianie akcent ma znaczenie.',
    '{es:¡Casi!} Akcent to mały szczegół, ale ważny.',
    'Dobra forma! Sprawdź jeszcze akcent. {es:¡Vamos!}',
  ]],

  // ---------- podpowiedzi po błędzie: końcówka dla osoby ----------
  ['hint-person-yo', [
    '{es:Yo} zawsze kończy się na o. {es:Hablo, como, vivo.}',
    'Dla {es:yo} końcówka o. {es:¡Tú puedes!}',
    'Uwaga, {es:yo!} Odcinasz końcówkę i dajesz o.',
    '{es:Yo,} czyli ja: {es:hablo, como, vivo.}',
  ]],
  ['hint-person-tu', [
    '{es:Tú:} as albo es. {es:Hablas, comes.}',
    '{es:Tú? Hablas, comes, vives!}',
    '{es:Tú?} Pamiętaj: as albo es.',
    '{es:Tú,} czyli ty: {es:hablas, comes, vives.}',
  ]],
  ['hint-person-el', [
    '{es:Él y ella: habla, come, vive.}',
    '{es:Él? Habla, come, vive.}',
    '{es:Él, ella:} krótko! {es:Habla, come, vive.}',
    'On albo ona: {es:habla, come, vive.}',
  ]],
  ['hint-person-nosotros', [
    '{es:Nosotros:} amos, emos albo imos.',
    'My, czyli {es:nosotros:} na końcu mos!',
    '{es:Nosotros? Hablamos, comemos, vivimos.}',
    'Dla {es:nosotros} zawsze mos na końcu.',
  ]],
  ['hint-person-vosotros', [
    '{es:Vosotros:} áis, éis albo ís, z akcentem!',
    'Wy, czyli {es:vosotros: habláis, coméis, vivís.}',
    '{es:Vosotros} lubi akcent: áis, éis, ís.',
    'Pamiętaj: {es:habláis, coméis, vivís,} z akcentem.',
  ]],
  ['hint-person-ellos', [
    '{es:Ellos y ellas: hablan, comen, viven.}',
    '{es:Ellos? Hablan, comen!}',
    '{es:Ellos?} An albo en. {es:¡Vamos!}',
    'Oni, czyli {es:ellos: hablan, comen, viven.}',
  ]],

  // ---------- podpowiedzi po błędzie: typowe pułapki ----------
  ['hint-er-ir', [
    'Er i ir różnią się w {es:nosotros y vosotros!}',
    'Uwaga: czasowniki na ir mają imos i ís. {es:Vivimos, vivís.}',
    'Er daje emos i éis, a ir daje imos i ís.',
    'Pułapka! {es:Comemos, coméis,} ale {es:vivimos, vivís.}',
  ]],
  ['hint-group', [
    'Sprawdź koniec bezokolicznika: ar, er czy ir?',
    'Ten czasownik jest z innej grupy! Zobacz koniec słowa.',
    'Najpierw grupa: ar, er czy ir. Potem końcówka.',
    '{es:¡Ojo!} Końcówki ar i er są różne: {es:hablas,} ale {es:comes.}',
  ]],
  ['hint-refl-missing', [
    'Brakuje zaimka! {es:Me levanto,} nie samo {es:levanto.}',
    'Czasownik zwrotny: najpierw zaimek. {es:Me, te, se.}',
    '{es:¡Ojo!} Bez zaimka ani rusz. {es:Me, te, se, nos, os, se.}',
    'Zaimek przed czasownikiem! {es:Yo me ducho.}',
    'Prawie, ale zwrotny potrzebuje zaimka!',
  ]],
  ['hint-refl-pronoun', [
    'Zły zaimek! {es:Yo: me, tú: te, él: se.}',
    'Zaimek musi pasować do osoby: {es:nos} dla {es:nosotros.}',
    'Pamiętaj: {es:os} dla {es:vosotros, se} dla {es:ellos.}',
    'Zaimek i końcówka muszą grać w jednej drużynie!',
  ]],
  ['hint-fix', [
    'W zdaniu patrz na podmiot. On mówi, jaka ma być forma.',
    'Najpierw podmiot, potem końcówka!',
    'Znajdź czasownik, który nie pasuje do osoby.',
    'Podmiot rządzi! Najpierw kto, potem forma.',
  ]],
  ['hint-generic', [
    '{es:¡Ánimo!} Błąd to część treningu.',
    'Spokojnie, to pytanie jeszcze wróci.',
    '{es:¡No pasa nada!} Następnym razem trafisz.',
    'Nawet najlepsi czasem pudłują. {es:¡Sigue!}',
    'Zobacz poprawną formę i lecimy dalej.',
    '{es:¡Venga!} Wróci za chwilę i będzie dobrze.',
    'Każdy błąd to lekcja. {es:¡Adelante!}',
    'Głowa do góry, {es:crack! ¡Vamos!}',
    'Nie szkodzi! Zapamiętaj i grasz dalej.',
    '{es:¡Tranquilo!} Z każdą rundą jest lepiej.',
    'Pudło, ale mecz trwa! {es:¡Vamos!}',
    'Popatrz na poprawną formę. Za chwilę rewanż!',
  ]],

  // ---------- podpowiedzi po błędzie: czasowniki nieregularne ----------
  ['hint-irr-tener', [
    '{es:Tener} jest nieregularny: {es:tengo, tienes, tiene.}',
    'E zmienia się w ie: {es:tienes, tiene, tienen.}',
    '{es:Nosotros} normalnie: {es:tenemos.} Ale {es:yo tengo!}',
  ]],
  ['hint-irr-ser', [
    '{es:Ser} trzeba znać na pamięć: {es:soy, eres, es.}',
    '{es:Somos, sois, son.} To też {es:ser!}',
    '{es:Yo soy, tú eres. ¡Sin excusas!}',
  ]],
  ['hint-irr-estar', [
    '{es:Estoy} bez akcentu, {es:estás y está} z akcentem!',
    '{es:Yo estoy,} tak jak {es:yo soy!}',
    '{es:Estamos, estáis, están.}',
  ]],
  ['hint-irr-ir', [
    'Formy {es:IR} są zupełnie inne: {es:voy, vas, va.}',
    '{es:Vamos, vais, van.} Tornado {es:IR!}',
    '{es:Yo voy.} Nie {es:ir,} tylko {es:voy!}',
  ]],
  ['hint-irr-ver', [
    '{es:Ver: yo veo, tú ves.}',
    '{es:Vosotros veis,} bez akcentu.',
    '{es:Veo, ves, ve, vemos, veis, ven.}',
  ]],
  ['hint-irr-jugar', [
    '{es:Jugar:} u zmienia się w ue. {es:Juego, juegas.}',
    'W {es:nosotros} bez zmiany: {es:jugamos!}',
    '{es:Juega, juegan:} ue w środku.',
  ]],
  ['hint-irr-acostarse', [
    '{es:Acostarse:} o zmienia się w ue. {es:Me acuesto.}',
    'Zaimek i ue: {es:te acuestas, se acuesta.}',
    '{es:Nosotros} bez zmiany: {es:nos acostamos.}',
  ]],
  ['hint-irr-hacer', [
    '{es:Hacer:} tylko {es:yo} jest inne. {es:Yo hago.}',
    '{es:Haces, hace, hacemos.} Reszta normalnie.',
  ]],
  ['hint-irr-querer', [
    '{es:Querer:} e zmienia się w ie. {es:Quiero, quieres.}',
    '{es:Queremos y queréis} bez zmiany.',
  ]],
  ['hint-irr-poder', [
    '{es:Poder:} o zmienia się w ue. {es:Puedo, puedes.}',
    '{es:Podemos y podéis} bez zmiany.',
  ]],
  ['hint-irr-venir', [
    '{es:Venir: yo vengo, tú vienes.}',
    '{es:Nosotros venimos, vosotros venís.} Jak {es:vivir!}',
  ]],

  // ---------- jefe pokonany ----------
  ['boss-defeated', [
    '{es:¡Jefe derrotado! ¡Qué partido!}',
    '{es:¡Victoria!} Wygrana walka!',
    '{es:¡Lo has conseguido!} Zwycięstwo!',
  ]],
  ['boss-defeated-tener', ['{es:¡Adiós, dragón!} Smok {es:TENER} pokonany!']],
  ['boss-defeated-ser', ['Duch {es:SER} znika! {es:¡Bravo!}']],
  ['boss-defeated-estar', ['Golem {es:ESTAR} rozsypany! {es:¡Olé!}']],
  ['boss-defeated-ir', ['Tornado {es:IR} ucichło! {es:¡Victoria!}']],
  ['boss-defeated-ver', ['Oko {es:VER} zamknięte! {es:¡Genial!}']],
  ['boss-defeated-jugar', ['Kosmita {es:JUGAR} odlatuje! {es:¡Golazo!}']],
  ['boss-defeated-acostarse', ['Sowa {es:ACOSTARSE} idzie spać! {es:¡Buenas noches!}']],
  ['boss-defeated-hacer', ['Robot {es:HACER} wyłączony! {es:¡Bravo!}']],
  ['boss-defeated-querer', ['Wampir {es:QUERER} uciekł! {es:¡Increíble!}']],
  ['boss-defeated-poder', ['Goryl {es:PODER} pokonany! {es:¡Qué fuerza!}']],
  ['boss-defeated-venir', ['Skorpion {es:VENIR} pokonany! {es:¡Campeón!}']],

  // ---------- runda do poprawy ----------
  ['recovery', [
    'Na koniec poprawki! Kilka przykładów i koniec rundy.',
    '{es:¡Última parte!} Naprawiamy błędy.',
    'Czas na rewanż z błędami! {es:¡Vamos!}',
    'Poprawki! Teraz już wiesz, jak to zrobić.',
    'Ostatnia prosta: błędy do poprawy!',
    'Dogrywka! Poprawiamy i schodzimy z boiska.',
  ]],

  // ---------- podsumowanie rundy ----------
  ['summary-3', [
    '{es:¡Perfecto!} Runda bez błędu. {es:¡Qué crack!}',
    '{es:¡Tres estrellas!} Mistrzostwo świata!',
    '{es:¡Impresionante!} Zero błędów!',
    '{es:¡Matrícula de honor!} Idealnie!',
    '{es:¡Espectacular!} Tak się gra!',
    '{es:¡Sin fallos!} Czysta klasa!',
  ]],
  ['summary-2', [
    '{es:¡Muy bien!} Świetna runda!',
    '{es:¡Dos estrellas!} Bardzo dobrze!',
    'Dobra robota! Jeszcze krok do perfekcji.',
    '{es:¡Bien jugado!} Prawie bez błędów.',
    '{es:¡Genial!} Tak trzymaj.',
    '{es:¡Muy buen partido!} Prawie idealnie.',
  ]],
  ['summary-1', [
    '{es:¡Bien!} Poziom zaliczony.',
    'Zaliczone! Kolejna runda będzie jeszcze lepsza.',
    '{es:¡Aprobado!} Idziemy dalej.',
    'Dobrze! Błędy już poprawione.',
    '{es:¡Vale!} Jedna gwiazdka, ale liczy się postęp.',
    'Mecz wygrany! Następnym razem więcej gwiazdek.',
  ]],
  ['summary-0', [
    'Jeszcze nie tym razem. Zagraj jeszcze raz!',
    '{es:¡Ánimo!} Druga runda będzie lepsza.',
    'Trening czyni mistrza. {es:¡Otra vez!}',
    'Blisko! Zajrzyj do ściągi i spróbuj znowu.',
    '{es:¡No te rindas!} Jeszcze jedna runda.',
    'Przegrany mecz to nie koniec ligi. {es:¡Otra vez!}',
  ]],
  ['unlocked', [
    '{es:¡Nuevo nivel!} Odblokowany kolejny poziom!',
    'Brama otwarta! Następny poziom czeka.',
    '{es:¡Adelante!} Nowy poziom odblokowany.',
    '{es:¡Subes de nivel! ¡Vamos!}',
    'Awans! Nowy poziom na ciebie czeka.',
  ]],

  // ---------- egzamin: wynik ----------
  ['exam-grade-6', [
    '{es:¡Sobresaliente!} Szóstka! Jesteś gotowy na sprawdzian!',
    '{es:¡Matrícula!} Celujący wynik!',
  ]],
  ['exam-grade-5', [
    '{es:¡Muy bien!} Piątka! Jeszcze trochę i szóstka.',
    'Bardzo dobry wynik! {es:¡Enhorabuena!}',
  ]],
  ['exam-grade-4', [
    '{es:¡Bien!} Czwórka. Popraw słabsze działy.',
    'Dobry wynik! Jeszcze jeden trening i będzie piątka.',
  ]],
  ['exam-grade-3', [
    'Trójka. Da się lepiej: przećwicz działy na czerwono.',
    '{es:¡Ánimo!} Powtórz poziomy i spróbuj znowu.',
  ]],
  ['exam-grade-2', [
    'Jeszcze sporo pracy. Ćwicz poziomy po kolei.',
    '{es:¡No pasa nada!} Trenujemy dalej i poprawimy wynik.',
  ]],
  ['exam-grade-1', [
    'Na razie słabo, ale od czegoś trzeba zacząć. {es:¡Vamos!}',
    'Spokojnie! Zacznij od poziomów i wróć na egzamin.',
  ]],
  ['exam-better', [
    '{es:¡Mejor que la última vez!} Postęp widać gołym okiem!',
    'Wynik lepszy niż ostatnio! {es:¡Bravo!}',
    'Idziesz w górę! Tak się trenuje.',
  ]],
]

/** słówka: tłumaczenie po polsku + bezokolicznik po hiszpańsku (czytane przy każdym pytaniu) */
const WORDS: [infinitive: string, meaning: string][] = [
  ['hablar', 'mówić'], ['trabajar', 'pracować'], ['estudiar', 'uczyć się, studiować'], ['escuchar', 'słuchać'],
  ['mirar', 'patrzeć'], ['comprar', 'kupować'], ['bailar', 'tańczyć'], ['comer', 'jeść'], ['beber', 'pić'],
  ['aprender', 'uczyć się czegoś'], ['leer', 'czytać'], ['correr', 'biegać'], ['vender', 'sprzedawać'],
  ['vivir', 'mieszkać'], ['escribir', 'pisać'], ['abrir', 'otwierać'], ['recibir', 'dostawać'],
  ['subir', 'wchodzić na górę'], ['levantarse', 'wstawać'], ['ducharse', 'brać prysznic'], ['lavarse', 'myć się'],
  ['peinarse', 'czesać się'], ['quedarse', 'zostawać'], ['llamarse', 'nazywać się'], ['tener', 'mieć'],
  ['ser', 'być, kim albo jakim'], ['estar', 'być, gdzie albo jak'], ['ir', 'iść albo jechać'], ['ver', 'widzieć, oglądać'],
  ['acostarse', 'kłaść się spać'], ['hacer', 'robić'], ['querer', 'chcieć'], ['poder', 'móc'], ['jugar', 'grać'],
  ['venir', 'przychodzić'],
]

export type Segment = { lang: 'pl' | 'es'; text: string }

/** 'Teraz {es:tú!} Czasowniki…' → [{es,'tú!'}, {pl,'Czasowniki…'}] — po polsku mówi Polak, po hiszpańsku Hiszpan */
export function segmentsOf(line: Line): Segment[] {
  if (line.lang) return [{ lang: line.lang, text: line.text }]
  const out: Segment[] = []
  const re = /\{es:([^}]*)\}/g
  let last = 0
  for (const m of line.text.matchAll(re)) {
    const before = line.text.slice(last, m.index).trim()
    if (before) out.push({ lang: 'pl', text: before })
    out.push({ lang: 'es', text: m[1].trim() })
    last = (m.index ?? 0) + m[0].length
  }
  const rest = line.text.slice(last).trim()
  if (rest) out.push({ lang: 'pl', text: rest })
  return out
}

/** tekst do napisów na ekranie (bez znaczników) */
export function displayText(line: Line): string {
  return segmentsOf(line).map((s) => s.text).join(' ')
}

export const LINES: Line[] = [
  ...GROUPS.flatMap(([cat, texts]) =>
    texts.map((text, i) => ({ id: `${cat}-${String(i + 1).padStart(2, '0')}`, cat, text })),
  ),
  ...WORDS.flatMap(([inf, meaning]) => [
    { id: `word-pl-${inf}`, cat: `word-pl-${inf}`, text: meaning, lang: 'pl' as const },
    { id: `word-es-${inf}`, cat: `word-es-${inf}`, text: inf, lang: 'es' as const },
  ]),
]

export const LINES_BY_CAT: Record<string, Line[]> = LINES.reduce<Record<string, Line[]>>((acc, line) => {
  ;(acc[line.cat] ??= []).push(line)
  return acc
}, {})
