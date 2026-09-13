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

## Zapis postępu

Profile, postęp i dzienna aktywność (czas aktywny liczony do 5 s bez ruchu, liczba przykładów, poprawność) są zapisane w `localStorage` przeglądarki, na tym urządzeniu, na którym się gra. Nie ma jeszcze backendu ani panelu rodzica (etap 2). PIN tylko chroni przed przypadkowym graniem na cudzym profilu, nie jest zabezpieczeniem danych.

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
