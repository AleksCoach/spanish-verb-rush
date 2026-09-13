import { useEffect, useRef } from 'react'

/**
 * Enter = główna akcja ekranu, niezależnie od tego, gdzie jest fokus.
 * Przycisk z data-primary albo brak fokusu → akcja; inny przycisk (np. wybrany Tabem) działa natywnie.
 * guardMs chroni przed „przelotem" przez ekran przy przytrzymanym / podwójnym Enterze.
 */
export function useEnterKey(handler: () => void, enabled = true, guardMs = 400): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })

  useEffect(() => {
    if (!enabled) return
    const mountedAt = Date.now()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if ((tag === 'BUTTON' || tag === 'A') && !target?.dataset.primary) return
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      if (e.repeat || Date.now() - mountedAt < guardMs) return
      ref.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, guardMs])
}
