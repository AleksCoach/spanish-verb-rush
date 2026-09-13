# Spanish Verb Rush

Gra webowa do nauki odmiany hiszpańskich czasowników w **Presente de indicativo**: krótkie rundy, natychmiastowy feedback, combo, bossowie-czasowniki nieregularne i powtarzanie błędów aż do skutku.

**Graj:** https://alekscoach.github.io/spanish-verb-rush/

## Jak się gra

1. Wpisz imię i 4-cyfrowy PIN (profil gracza).
2. Na kafelku widać czasownik i osobę, np. `HABLAR` + `YO`. Wpisz formę (`hablo`) i naciśnij **Enter**.
3. Błąd nie kończy gry. Gra pokazuje poprawną formę i rozkład (`habl + o`), a pytanie wraca po kilku następnych. Na końcu każdej rundy jest etap **DO POPRAWY**.
4. Akcenty: przyciski `á é í ó ú` albo skrót `a` + `'` → `á`. Brak akcentu to **PRAWIE**, nie błąd.

## Levele

| # | Level | Co ćwiczy |
|---|-------|-----------|
| 1 | YO | tylko `yo`, czasowniki -AR / -ER / -IR z podpowiedzią grupy |
| 2 | TÚ | `yo` + `tú` |
| 3 | MIX | `yo` · `tú` · `él/ella` |
| 4 | FULL TEAM | wszystkie 6 osób |
| 5 | MIXED VERBS | bez podpowiedzi grup + tryb **NAPRAW BŁĄD** („Yo hablas español.” → `hablo`) |
| 6–9 | BOSS | tener · ser · estar · ir (boss ma 10 HP) |
| 10 | BOSS RUSH | powtórka tener/ser/estar/ir + regularne |
| 11–15 | BOSS | hacer · querer · poder · jugar · venir |
| 16 | WIELKI MIX | wszystko naraz |

Następny level odblokowuje się po zdobyciu 70% poprawnych odpowiedzi. Bossa zawsze da się pokonać.

## Zapis postępu

Profile i postęp są zapisane w `localStorage` przeglądarki, na tym urządzeniu, na którym się gra. Nie ma backendu ani kont w chmurze. PIN tylko chroni przed przypadkowym graniem na cudzym profilu, nie jest zabezpieczeniem danych.

## Dla dewelopera

```bash
cd app
npm install
npm run dev          # gra lokalnie (otwiera przeglądarkę)
npm test             # testy silnika, oceniania i danych (vitest)
npm run build:single # buduje docs/index.html (GitHub Pages) + GRAJ_Spanish_Verb_Rush.html (offline)
```

Stack: React 19 + TypeScript + Vite, czysty CSS, `localStorage`.

- `app/src/data/verbs.ts` — czasowniki. Formy regularne są liczone z reguły, nieregularne wpisane jawnie, do tego zdania do trybu NAPRAW BŁĄD.
- `app/src/data/levels.ts` — definicje leveli.
- `app/src/game/engine.ts` — silnik rundy: adaptacyjny dobór pytań, powrót błędu po 3–6 pytaniach, boss, runda DO POPRAWY, XP i combo.
- `app/src/game/grading.ts` — ocena odpowiedzi (poprawna / PRAWIE / błąd).
