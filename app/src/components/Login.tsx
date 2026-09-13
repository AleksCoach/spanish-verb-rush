import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { checkPin, createProfile, loadProfiles, loadSave, updateProfilePin } from '../game/storage'
import type { Profile } from '../game/storage'

type Props = { onLogin: (profile: Profile) => void }

type Mode = { name: 'pick' } | { name: 'new' } | { name: 'pin'; profile: Profile }

const onlyDigits = (v: string) =>
  Array.from(v)
    .filter((ch) => ch >= '0' && ch <= '9')
    .join('')
    .slice(0, 4)

export function Login({ onLogin }: Props) {
  const profiles = loadProfiles()
  const [mode, setMode] = useState<Mode>(profiles.length ? { name: 'pick' } : { name: 'new' })

  return (
    <div className="screen login">
      <header className="plaque plaque-brand">
        <p className="brand-eyebrow">Presente de indicativo</p>
        <h1 className="brand-title">
          Spanish <span>Verb Rush</span>
        </h1>
      </header>

      {mode.name === 'pick' && (
        <section className="login-card">
          <h2>Kto gra?</h2>
          <div className="profile-list">
            {profiles.map((p) => (
              <button key={p.id} type="button" className="profile" onClick={() => setMode({ name: 'pin', profile: p })}>
                <span className="profile-avatar" aria-hidden="true">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="profile-name">{p.name}</span>
                <span className="profile-xp">{loadSave(p.id).xp} XP</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-xl" onClick={() => setMode({ name: 'new' })}>
            + NOWY GRACZ
          </button>
        </section>
      )}

      {mode.name === 'new' && (
        <NewPlayer
          existing={profiles}
          onCreate={onLogin}
          onBack={profiles.length ? () => setMode({ name: 'pick' }) : undefined}
        />
      )}

      {mode.name === 'pin' && <PinEntry profile={mode.profile} onOk={onLogin} onBack={() => setMode({ name: 'pick' })} />}

      <p className="login-note">Postęp zapisuje się w tej przeglądarce — graj zawsze na tym samym urządzeniu.</p>
    </div>
  )
}

function Card({ title, onSubmit, children }: { title: string; onSubmit: () => void; children: ReactNode }) {
  const handleKey = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    if ((e.target as HTMLElement).tagName !== 'INPUT') return
    e.preventDefault()
    if (!e.repeat) onSubmit()
  }
  return (
    <form
      className="login-card"
      onKeyDown={handleKey}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <h2>{title}</h2>
      {children}
    </form>
  )
}

function NewPlayer({
  existing,
  onCreate,
  onBack,
}: {
  existing: Profile[]
  onCreate: (p: Profile) => void
  onBack?: () => void
}) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function submit() {
    const n = name.trim()
    if (n.length < 2) return setError('Wpisz swoje imię (min. 2 litery).')
    if (existing.some((p) => p.name.toLowerCase() === n.toLowerCase()))
      return setError('Taki gracz już jest — wybierz go z listy.')
    if (pin.length !== 4) return setError('Wymyśl PIN z 4 cyfr — będziesz go wpisywać przy wejściu.')
    onCreate(createProfile(n, pin))
  }

  return (
    <Card title={existing.length ? 'Nowy gracz' : 'Cześć! Jak masz na imię?'} onSubmit={submit}>
      <label className="field">
        Imię
        <input
          ref={nameRef}
          className="answer-input"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="next"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            e.stopPropagation()
            pinRef.current?.focus()
          }}
        />
      </label>
      <label className="field">
        PIN — 4 cyfry
        <input
          ref={pinRef}
          className="answer-input pin-input"
          value={pin}
          onChange={(e) => setPin(onlyDigits(e.target.value))}
          inputMode="numeric"
          type="password"
          autoComplete="new-password"
          enterKeyHint="go"
        />
      </label>
      {error && <p className="login-error">{error}</p>}
      <button type="submit" className="btn btn-primary btn-xl">
        GRAMY ▶
      </button>
      {onBack && (
        <button type="button" className="link link-back" onClick={onBack}>
          ← wybierz gracza z listy
        </button>
      )}
    </Card>
  )
}

function PinEntry({ profile, onOk, onBack }: { profile: Profile; onOk: (p: Profile) => void; onBack: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [forgot, setForgot] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    pinRef.current?.focus()
  }, [forgot])

  function submit() {
    if (pin.length !== 4) return setError('PIN ma 4 cyfry.')
    if (forgot) return onOk(updateProfilePin(profile, pin))
    if (checkPin(profile, pin)) return onOk(profile)
    setError('To nie ten PIN. Spróbuj jeszcze raz.')
    setPin('')
  }

  return (
    <Card title={forgot ? `Nowy PIN: ${profile.name}` : `Cześć, ${profile.name}!`} onSubmit={submit}>
      <label className="field">
        {forgot ? 'Ustaw nowy PIN (4 cyfry) — postęp zostaje' : 'Twój PIN'}
        <input
          ref={pinRef}
          className="answer-input pin-input"
          value={pin}
          onChange={(e) => setPin(onlyDigits(e.target.value))}
          inputMode="numeric"
          type="password"
          autoComplete="off"
          enterKeyHint="go"
        />
      </label>
      {error && <p className="login-error">{error}</p>}
      <button type="submit" className="btn btn-primary btn-xl">
        {forgot ? 'ZAPISZ PIN ▶' : 'WCHODZĘ ▶'}
      </button>
      <div className="login-links">
        <button type="button" className="link" onClick={onBack}>
          ← inny gracz
        </button>
        {!forgot && (
          <button
            type="button"
            className="link"
            onClick={() => {
              setForgot(true)
              setError('')
              setPin('')
            }}
          >
            nie pamiętam PIN-u
          </button>
        )}
      </div>
    </Card>
  )
}
