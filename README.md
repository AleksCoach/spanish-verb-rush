# ¡A conjugar!

Gra webowa do nauki odmiany hiszpańskich czasowników w **Presente de indicativo**: krótkie rundy, natychmiastowa informacja zwrotna, serie, „jefes” (czasowniki nieregularne), czasowniki zwrotne, egzamin próbny i powtarzanie błędów aż do skutku.

**Graj:** https://alekscoach.github.io/spanish-verb-rush/

## Jak się gra

1. Wpisz imię i 4-cyfrowy PIN (profil gracza).
2. Na kafelku widać czasownik i osobę, np. `HABLAR` + `YO`. Wpisz formę (`hablo`) i naciśnij **Enter**.
3. Błąd nie kończy gry. Gra pokazuje poprawną formę i rozkład (`habl + o`), a pytanie wraca po kilku następnych. Na końcu każdej rundy jest etap **DO POPRAWY**.
4. Akcenty: przyciski `á é í ó ú` albo skrót `a` + `'` → `á`. Brak akcentu to **PRAWIE**, nie błąd.

## Poziomy

| # | Poziom | Co ćwiczy |
|---|--------|-----------|
| 1 | YO | tylko `yo`, czasowniki -AR / -ER / -IR z podpowiedzią grupy |
| 2 | TÚ | `yo` + `tú` |
| 3 | YO · TÚ · ÉL | `yo` · `tú` · `él/ella` |
| 4 | WSZYSCY | wszystkie 6 osób |
| 5 | MIESZANKA | bez podpowiedzi grup + tryb **NAPRAW BŁĄD** („Yo hablas español.” → `hablo`) |
| 6 | ZWROTNE -SE | zaimek + forma: `me levanto`, `os quedáis` |
| 7–13 | JEFE | tener · ser · estar · ir · ver · jugar · acostarse (10 żyć) |
| 14 | EGZAMIN | egzamin próbny „Kompetencja 1”: 20 pytań z całego zakresu, wynik w %, ocena orientacyjna, poprawa błędów |
| 15–19 | dodatkowe | hacer · querer · poder · venir · WIELKA MIESZANKA (poza zakresem egzaminu) |

Egzamin jest dostępny zawsze. Następny poziom odblokowuje się po 70% poprawnych odpowiedzi, a jefe da się zawsze pokonać.

## Głosy

Wszystko, co gra mówi, to nagrania ElevenLabs: po hiszpańsku mówi Hiszpan (Theo), po polsku Polak (Maciek). Nagrania są trzy:
- komentator Toni;
- słówko przy każdym pytaniu;
- ściąga przed poziomem (przycisk „🔊 posłuchaj”).

Gra nie używa syntezatora mowy z telefonu ani komputera. Gdy brakuje nagrań, milczy.

Otwarta gra sama wykrywa nową wersję na serwerze i przeładowuje się, gdy gracz jest w menu.

## Zapis postępu i panel rodzica

Profile, postęp i dzienna aktywność są zapisane w `localStorage` przeglądarki, na tym urządzeniu, na którym się gra. Dzienna aktywność to czas aktywny liczony tylko do 5 s bez ruchu, liczba przykładów i poprawność. PIN gracza chroni tylko przed przypadkowym graniem na cudzym profilu.

**Panel rodzica:** https://alekscoach.github.io/spanish-verb-rush/#panel
- Na ekranie startowym gry dziecko wybiera „📡 połącz z panelem rodzica” i wpisuje kod rodzica. Bez kodu gra nic nie wysyła.
- Połączona gra co minutę wysyła do Supabase aktywność minuta po minucie, sumy dzienne i wyniki rund. Odbywa się to wyłącznie przez funkcje RPC (`app/supabase/schema.sql`), a tabele mają RLS bez polityk.
- Panel pokazuje dla wybranego dnia: czas nauki, przykłady, poprawność, tempo, sesje z godzinami, 7 dni wstecz, rundy i egzaminy. Wejście wymaga kodu rodzica i PIN-u rodzica (ustawianego przy pierwszym wejściu). Po 8 błędnych PIN-ach następuje blokada na 15 minut.

## Dla dewelopera

```bash
cd app
npm install
npm run dev          # gra lokalnie (otwiera przeglądarkę)
npm test             # testy silnika, oceniania i danych (vitest)
npm run build:single # buduje docs/index.html + docs/version.json (GitHub Pages) i skrót GRAJ_Spanish_Verb_Rush.html
node scripts/generate-voice.mjs licz   # ile nagrań brakuje (bez API)
node scripts/generate-voice.mjs wszystko <głosES> <głosPL> eleven_v3   # dogrywa brakujące; klucz w app/.env.local
```

Stack: React 19 + TypeScript + Vite, czysty CSS, `localStorage`.

- `app/src/data/verbs.ts` — czasowniki. Formy regularne są liczone z reguły, nieregularne wpisane jawnie, do tego zdania do trybu NAPRAW BŁĄD.
- `app/src/data/levels.ts` — definicje leveli.
- `app/src/data/commentary.ts` i `app/src/data/cheatsheets.ts` — kwestie komentatora, słówka i ściągi. To teksty nagrań; znacznik `{es:…}` oznacza fragment, który mówi Hiszpan.
- `app/src/game/voice.ts` — kolejka nagrań (`docs/audio/manifest.json` + `docs/audio/seg/*.mp3`).
- `app/src/game/engine.ts` — silnik rundy: adaptacyjny dobór pytań, powrót błędu po 3–6 pytaniach, boss, runda DO POPRAWY, XP i combo.
- `app/src/game/grading.ts` — ocena odpowiedzi (poprawna / PRAWIE / błąd).
