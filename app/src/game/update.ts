// Nowa wersja gry na serwerze? Telefon trzyma otwartą kartę tygodniami, więc sprawdzamy sami
// (docs/version.json powstaje przy każdym buildzie) i przeładowujemy, gdy gracz jest w menu.

declare const __BUILD_ID__: string

const RELOADED_KEY = 'svr.reloaded-for'

export async function newerBuild(): Promise<string | null> {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const { id } = (await res.json()) as { id?: unknown }
    return typeof id === 'string' && id && id !== __BUILD_ID__ ? id : null
  } catch {
    return null
  }
}

/** przeładowanie pod nowym adresem (?v=…), żeby przeglądarka nie wzięła starej wersji z pamięci */
export function reloadTo(id: string): void {
  try {
    // najwyżej raz na wersję w tej karcie — bez pętli, gdyby serwer jeszcze podawał starą stronę
    if (sessionStorage.getItem(RELOADED_KEY) === id) return
    sessionStorage.setItem(RELOADED_KEY, id)
  } catch {
    return
  }
  const url = new URL(window.location.href)
  url.searchParams.set('v', id)
  window.location.replace(url.toString())
}
