import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { linkFamily, loadCloud } from '../cloud/sync'

type Props = { profileId: string; playerName: string }

/** Połączenie profilu z panelem rodzica (kod rodzica). Gracz widzi, że rodzic ma podgląd nauki. */
export function ParentLink({ profileId, playerName }: Props) {
  const [state, setState] = useState(() => loadCloud(profileId))
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'bad_code' | 'network'>('idle')

  useEffect(() => {
    const t = window.setInterval(() => setState({ ...loadCloud(profileId) }), 10_000)
    return () => window.clearInterval(t)
  }, [profileId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (code.trim().length < 6) return setStatus('bad_code')
    setStatus('busy')
    const res = await linkFamily(profileId, code, playerName)
    if (res === 'ok') {
      setState({ ...loadCloud(profileId) })
      setOpen(false)
      setStatus('idle')
    } else {
      setStatus(res)
    }
  }

  if (state.familyCode) {
    const time = state.lastSyncAt
      ? new Date(state.lastSyncAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
      : null
    return (
      <p className="parent-link is-linked">
        <span aria-hidden="true">📡</span> Rodzic widzi czas nauki i wyniki
        <small>{state.lastError ? ` · ${state.lastError}` : time ? ` · wysłano ${time}` : ' · wyślę przy następnej okazji'}</small>
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" className="link parent-link-open" onClick={() => setOpen(true)}>
        📡 połącz z panelem rodzica
      </button>
    )
  }

  return (
    <form className="parent-link-form" onSubmit={submit}>
      <label className="field">
        Kod rodzica
        <input
          className="answer-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 14))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="np. ABCD234567"
        />
      </label>
      {status === 'bad_code' && <p className="login-error">Nie ma takiego kodu — sprawdź z rodzicem.</p>}
      {status === 'network' && <p className="login-error">Brak połączenia z internetem — spróbuj za chwilę.</p>}
      <div className="parent-link-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'busy'}>
          {status === 'busy' ? 'ŁĄCZĘ…' : 'POŁĄCZ'}
        </button>
        <button type="button" className="link" onClick={() => setOpen(false)}>
          anuluj
        </button>
      </div>
      <p className="parent-link-note">Po połączeniu rodzic zobaczy Twój czas nauki, liczbę przykładów i wyniki.</p>
    </form>
  )
}
