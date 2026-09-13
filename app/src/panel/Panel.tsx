import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { rpc } from '../cloud/sync'
import { schoolGrade } from '../game/engine'
import './panel.css'

type DeviceRow = { id: string; name: string; lastSeen: string }
type DayRow = {
  deviceId: string
  day: string
  activeSec: number
  answers: number
  correct: number
  almost: number
  wrong: number
  rounds: number
  passed: number
}
type MinuteRow = { deviceId: string; minute: string; activeSec: number; answers: number; correct: number }
type RoundRow = {
  deviceId: string
  finishedAt: string
  levelKey: string
  levelName: string
  levelKind: string
  score: number
  stars: number
  answers: number
  correct: number
  durationSec: number
}
type Report = { devices: DeviceRow[]; days: DayRow[]; minutes: MinuteRow[]; rounds: RoundRow[] }

const STORE = 'svr.panel.v1'
const DAYS_BACK = 13
/** przerwa dłuższa niż tyle minut zaczyna nową sesję */
const SESSION_GAP_MIN = 5

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

function readStore(): { code: string; pin: string } | null {
  try {
    const raw = localStorage.getItem(STORE)
    return raw ? (JSON.parse(raw) as { code: string; pin: string }) : null
  } catch {
    return null
  }
}

function writeStore(v: { code: string; pin: string } | null): void {
  try {
    if (v) localStorage.setItem(STORE, JSON.stringify(v))
    else localStorage.removeItem(STORE)
  } catch {
    // ignoruj
  }
}

const minutesLabel = (sec: number) => (sec > 0 && sec < 60 ? `${sec} s` : `${Math.round(sec / 60)} min`)

export function Panel() {
  const saved = useMemo(readStore, [])
  const [code, setCode] = useState(saved?.code ?? '')
  const [pin, setPin] = useState(saved?.pin ?? '')
  const [pin2, setPin2] = useState('')
  const [remember, setRemember] = useState(true)
  const [phase, setPhase] = useState<'login' | 'setpin' | 'loading' | 'ready'>(saved ? 'loading' : 'login')
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [day, setDay] = useState(localDay(new Date()))
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  const load = useCallback(
    async (c: string, p: string, keep: boolean) => {
      setError('')
      setPhase('loading')
      try {
        const since = new Date()
        since.setHours(0, 0, 0, 0)
        since.setDate(since.getDate() - DAYS_BACK)
        const res = await rpc<Report | { locked: true } | null>('family_report', {
          p_family_code: c,
          p_pin: p,
          p_since: since.toISOString(),
        })
        if (!res) {
          const status = await rpc<string>('family_status', { p_family_code: c })
          if (status === 'missing') setError('Nie ma takiego kodu rodzica.')
          else if (status === 'needs_pin') {
            setPhase('setpin')
            return
          } else setError('Zły PIN.')
          setPhase('login')
          return
        }
        if ('locked' in res) {
          setError('Za dużo błędnych prób. Spróbuj ponownie za 15 minut.')
          setPhase('login')
          return
        }
        if (keep) writeStore({ code: c, pin: p })
        setReport(res)
        setLoadedAt(new Date())
        setDeviceId((cur) => cur ?? [...res.devices].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))[0]?.id ?? null)
        setPhase('ready')
      } catch {
        setError('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.')
        setPhase('login')
      }
    },
    [],
  )

  useEffect(() => {
    if (saved) void load(saved.code, saved.pin, true)
  }, [saved, load])

  async function submitLogin(e: FormEvent) {
    e.preventDefault()
    if (code.trim().length < 6) return setError('Wpisz kod rodzica.')
    const status = await rpc<string>('family_status', { p_family_code: code }).catch(() => 'offline')
    if (status === 'offline') return setError('Brak połączenia z serwerem.')
    if (status === 'missing') return setError('Nie ma takiego kodu rodzica.')
    if (status === 'needs_pin') return setPhase('setpin')
    if (pin.length < 4) return setError('Wpisz PIN.')
    void load(code, pin, remember)
  }

  async function submitNewPin(e: FormEvent) {
    e.preventDefault()
    if (pin.length < 4) return setError('PIN musi mieć co najmniej 4 znaki.')
    if (pin !== pin2) return setError('PIN-y się różnią.')
    try {
      const ok = await rpc<boolean>('set_parent_pin', { p_family_code: code, p_pin: pin })
      if (!ok) return setError('Nie udało się ustawić PIN-u (może jest już ustawiony).')
      void load(code, pin, remember)
    } catch {
      setError('Brak połączenia z serwerem.')
    }
  }

  function logout() {
    writeStore(null)
    setReport(null)
    setPin('')
    setPhase('login')
  }

  if (phase === 'login' || phase === 'setpin') {
    return (
      <main className="app">
        <div className="screen panel">
          <header className="plaque plaque-brand">
            <p className="brand-eyebrow">¡A conjugar!</p>
            <h1 className="brand-title">Panel rodzica</h1>
            <p className="brand-sub">czas nauki · przykłady · wyniki</p>
          </header>
          <form className="login-card" onSubmit={phase === 'login' ? submitLogin : submitNewPin}>
            <h2>{phase === 'login' ? 'Zaloguj się' : 'Ustaw PIN rodzica'}</h2>
            <label className="field">
              Kod rodzica
              <input
                className="answer-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={phase === 'setpin'}
              />
            </label>
            <label className="field">
              {phase === 'login' ? 'PIN' : 'Nowy PIN (min. 4 znaki)'}
              <input className="answer-input" type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" />
            </label>
            {phase === 'setpin' && (
              <label className="field">
                Powtórz PIN
                <input className="answer-input" type="password" value={pin2} onChange={(e) => setPin2(e.target.value)} autoComplete="new-password" />
              </label>
            )}
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> zapamiętaj na tym urządzeniu
            </label>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-xl">
              {phase === 'login' ? 'POKAŻ POSTĘPY ▶' : 'ZAPISZ PIN ▶'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (phase === 'loading' || !report) {
    return (
      <main className="app">
        <div className="screen panel">
          <p className="panel-loading">Wczytuję dane…</p>
        </div>
      </main>
    )
  }

  return (
    <Dashboard
      report={report}
      deviceId={deviceId}
      onDevice={setDeviceId}
      day={day}
      onDay={setDay}
      loadedAt={loadedAt}
      onRefresh={() => void load(code, pin, false)}
      onLogout={logout}
    />
  )
}

type Session = { start: Date; end: Date; activeSec: number; answers: number; correct: number }

function Dashboard({
  report,
  deviceId,
  onDevice,
  day,
  onDay,
  loadedAt,
  onRefresh,
  onLogout,
}: {
  report: Report
  deviceId: string | null
  onDevice: (id: string) => void
  day: string
  onDay: (d: string) => void
  loadedAt: Date | null
  onRefresh: () => void
  onLogout: () => void
}) {
  const device = report.devices.find((d) => d.id === deviceId) ?? null

  const last7 = useMemo(() => {
    const out: string[] = []
    const d = new Date()
    for (let i = 6; i >= 0; i--) {
      const x = new Date(d)
      x.setDate(d.getDate() - i)
      out.push(localDay(x))
    }
    return out
  }, [])

  const dayRows = report.days.filter((r) => r.deviceId === deviceId)
  const dayRow = dayRows.find((r) => r.day === day)
  const minutes = report.minutes
    .filter((m) => m.deviceId === deviceId && localDay(new Date(m.minute)) === day && m.activeSec > 0)
    .map((m) => ({ ...m, at: new Date(m.minute) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
  const rounds = report.rounds.filter((r) => r.deviceId === deviceId && localDay(new Date(r.finishedAt)) === day)
  const exams = report.rounds.filter((r) => r.deviceId === deviceId && r.levelKind === 'exam')

  const sessions: Session[] = []
  for (const m of minutes) {
    const cur = sessions[sessions.length - 1]
    if (cur && (m.at.getTime() - cur.end.getTime()) / 60000 <= SESSION_GAP_MIN) {
      cur.end = new Date(m.at.getTime() + 60000)
      cur.activeSec += m.activeSec
      cur.answers += m.answers
      cur.correct += m.correct
    } else {
      sessions.push({ start: m.at, end: new Date(m.at.getTime() + 60000), activeSec: m.activeSec, answers: m.answers, correct: m.correct })
    }
  }

  const minuteSec = minutes.reduce((a, m) => a + m.activeSec, 0)
  const minuteAnswers = minutes.reduce((a, m) => a + m.answers, 0)
  const activeSec = Math.max(dayRow?.activeSec ?? 0, minuteSec)
  const useDayRow = Boolean(dayRow && dayRow.answers >= minuteAnswers)
  const answers = useDayRow ? dayRow!.answers : minuteAnswers
  const good = useDayRow ? dayRow!.correct + dayRow!.almost : minutes.reduce((a, m) => a + m.correct, 0)
  const accuracy = answers ? Math.round((good / answers) * 100) : null
  const pace = activeSec >= 60 ? (answers / (activeSec / 60)).toFixed(1).replace('.', ',') : '—'
  const lastActive = minutes.length ? minutes[minutes.length - 1].at : null

  const dayLabel = (d: string) => {
    const today = localDay(new Date())
    const y = new Date()
    y.setDate(y.getDate() - 1)
    if (d === today) return 'Dziś'
    if (d === localDay(y)) return 'Wczoraj'
    const [yy, mm, dd] = d.split('-').map(Number)
    return new Date(yy, mm - 1, dd).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })
  }

  return (
    <main className="app">
      <div className="screen panel">
        <header className="panel-head">
          <div>
            <p className="eyebrow">Panel rodzica · ¡A conjugar!</p>
            <h1 className="panel-title">{device ? device.name : 'Brak połączonych graczy'}</h1>
            {device && (
              <p className="panel-sub">
                ostatnie dane z telefonu: {new Date(device.lastSeen).toLocaleString('pl-PL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                {loadedAt && ` · odświeżono ${hhmm(loadedAt)}`}
              </p>
            )}
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-ghost" onClick={onRefresh}>
              ↻ odśwież
            </button>
            <button type="button" className="link" onClick={onLogout}>
              wyloguj
            </button>
          </div>
        </header>

        {report.devices.length === 0 && (
          <section className="panel-card">
            <h2>Połącz grę dziecka</h2>
            <p>
              Na telefonie dziecka: ekran startowy gry → na dole <b>„📡 połącz z panelem rodzica”</b> → wpisz kod rodzica. Dane
              pojawią się tu po pierwszej rundzie.
            </p>
          </section>
        )}

        {report.devices.length > 1 && (
          <div className="chips-row" role="tablist" aria-label="Gracz">
            {report.devices.map((d) => (
              <button key={d.id} type="button" className={`chip-btn${d.id === deviceId ? ' is-on' : ''}`} onClick={() => onDevice(d.id)}>
                {d.name}
              </button>
            ))}
          </div>
        )}

        {device && (
          <>
            <div className="chips-row" role="tablist" aria-label="Dzień">
              {[...last7].reverse().map((d) => (
                <button key={d} type="button" className={`chip-btn${d === day ? ' is-on' : ''}`} onClick={() => onDay(d)}>
                  {dayLabel(d)}
                </button>
              ))}
            </div>

            <dl className="kpis">
              <div>
                <dt>czas nauki</dt>
                <dd>{minutesLabel(activeSec)}</dd>
              </div>
              <div>
                <dt>przykłady</dt>
                <dd>{answers}</dd>
              </div>
              <div>
                <dt>poprawnie</dt>
                <dd>{accuracy === null ? '—' : `${accuracy}%`}</dd>
              </div>
              <div>
                <dt>tempo</dt>
                <dd>
                  {pace}
                  <small> /min</small>
                </dd>
              </div>
              <div>
                <dt>rundy</dt>
                <dd>
                  {dayRow?.rounds ?? rounds.length}
                  <small> · zal. {dayRow?.passed ?? rounds.filter((r) => r.stars > 0).length}</small>
                </dd>
              </div>
              <div>
                <dt>ostatnio</dt>
                <dd>{lastActive ? hhmm(lastActive) : '—'}</dd>
              </div>
            </dl>

            <section className="panel-card">
              <h2>Kiedy się uczył — {dayLabel(day).toLowerCase()}</h2>
              <p className="panel-note">
                Liczy się tylko czas z ruchem w grze (przerwa dłuższa niż 5 s nie jest liczona). Sesja = nauka bez przerwy dłuższej
                niż {SESSION_GAP_MIN} min.
              </p>
              <DayTimeline sessions={sessions} minutes={minutes} />
              {sessions.length === 0 ? (
                <p className="panel-empty">Brak aktywności w grze tego dnia.</p>
              ) : (
                <table className="panel-table">
                  <thead>
                    <tr>
                      <th>sesja</th>
                      <th>aktywnie</th>
                      <th>przykłady</th>
                      <th>poprawnie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.start.toISOString()}>
                        <td>
                          {hhmm(s.start)}–{hhmm(s.end)}
                        </td>
                        <td>{minutesLabel(s.activeSec)}</td>
                        <td>{s.answers}</td>
                        <td>{s.answers ? `${Math.round((s.correct / s.answers) * 100)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel-card">
              <h2>Ostatnie 7 dni — minuty nauki</h2>
              <WeekChart days={last7} rows={dayRows} labels={last7.map(dayLabel)} />
            </section>

            <section className="panel-card">
              <h2>Rundy — {dayLabel(day).toLowerCase()}</h2>
              {rounds.length === 0 ? (
                <p className="panel-empty">Brak ukończonych rund.</p>
              ) : (
                <table className="panel-table">
                  <thead>
                    <tr>
                      <th>godz.</th>
                      <th>poziom</th>
                      <th>wynik</th>
                      <th>czas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r) => (
                      <tr key={r.finishedAt}>
                        <td>{hhmm(new Date(r.finishedAt))}</td>
                        <td>
                          {r.levelName} <span className="stars-inline">{'★'.repeat(r.stars)}</span>
                        </td>
                        <td>
                          {r.correct}/{r.answers} · {Math.round(r.score * 100)}%
                        </td>
                        <td>{Math.max(1, Math.round(r.durationSec / 60))} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel-card">
              <h2>Egzaminy próbne (14 dni)</h2>
              {exams.length === 0 ? (
                <p className="panel-empty">Jeszcze nie było egzaminu.</p>
              ) : (
                <table className="panel-table">
                  <thead>
                    <tr>
                      <th>kiedy</th>
                      <th>wynik</th>
                      <th>ocena (orient.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((r) => {
                      const g = schoolGrade(r.score)
                      return (
                        <tr key={r.finishedAt}>
                          <td>{new Date(r.finishedAt).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{Math.round(r.score * 100)}%</td>
                          <td>
                            {g.value} ({g.label})
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

/** Oś dnia przycięta do godzin z aktywnością; słupek = minuta, wysokość = aktywne sekundy w tej minucie. */
function DayTimeline({ sessions, minutes }: { sessions: Session[]; minutes: { at: Date; activeSec: number; answers: number }[] }) {
  if (!minutes.length) return null
  const first = minutes[0].at
  const last = minutes[minutes.length - 1].at
  const startH = first.getHours()
  let endH = last.getHours() + 1
  if (endH - startH < 2) endH = Math.min(24, startH + 2)
  const span = (endH - startH) * 60
  const W = 720
  const H = 64
  const top = 6
  const plotH = 40
  const x = (d: Date) => ((d.getHours() - startH) * 60 + d.getMinutes()) * (W / span)
  const barW = Math.max(2, W / span - 1)
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i)

  return (
    <div className="timeline-wrap">
      <svg className="timeline" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Aktywność w ciągu dnia">
        <rect x={0} y={top} width={W} height={plotH} rx={6} className="tl-track" />
        {sessions.map((s) => (
          <rect key={s.start.toISOString()} x={x(s.start)} y={top} width={Math.max(3, x(s.end) - x(s.start))} height={plotH} rx={4} className="tl-session">
            <title>
              {hhmm(s.start)}–{hhmm(s.end)} · aktywnie {Math.round(s.activeSec / 60)} min · {s.answers} przykł.
            </title>
          </rect>
        ))}
        {minutes.map((m) => {
          const h = Math.max(3, (m.activeSec / 60) * plotH)
          return (
            <rect key={m.at.toISOString()} x={x(m.at)} y={top + plotH - h} width={barW} height={h} rx={1} className="tl-bar">
              <title>
                {hhmm(m.at)} · {m.activeSec} s aktywnie · {m.answers} przykł.
              </title>
            </rect>
          )
        })}
        {hours.map((h) => {
          const hx = (h - startH) * 60 * (W / span)
          return (
            <g key={h}>
              <line x1={hx} x2={hx} y1={top} y2={top + plotH} className="tl-grid" />
              <text x={Math.min(W - 18, Math.max(18, hx))} y={H + 12} textAnchor="middle" className="tl-label">
                {String(h).padStart(2, '0')}:00
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function WeekChart({ days, rows, labels }: { days: string[]; rows: DayRow[]; labels: string[] }) {
  const W = 700
  const H = 200
  const base = 160
  const values = days.map((d) => Math.round((rows.find((r) => r.day === d)?.activeSec ?? 0) / 60))
  const max = Math.max(10, ...values)
  const slot = W / days.length
  const barW = Math.min(56, slot - 18)
  return (
    <div className="timeline-wrap">
      <svg className="week" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Minuty nauki w ostatnich 7 dniach">
        <line x1={0} x2={W} y1={base} y2={base} className="tl-grid" />
        {values.map((v, i) => {
          const h = (v / max) * (base - 30)
          const cx = slot * i + slot / 2
          const row = rows.find((r) => r.day === days[i])
          return (
            <g key={days[i]}>
              {v > 0 && (
                <path
                  d={`M ${cx - barW / 2} ${base} V ${base - h + 4} Q ${cx - barW / 2} ${base - h} ${cx - barW / 2 + 4} ${base - h} H ${cx + barW / 2 - 4} Q ${cx + barW / 2} ${base - h} ${cx + barW / 2} ${base - h + 4} V ${base} Z`}
                  className="wk-bar"
                >
                  <title>
                    {labels[i]}: {v} min · {row?.answers ?? 0} przykł.
                  </title>
                </path>
              )}
              <text x={cx} y={base - h - 8} textAnchor="middle" className="wk-value">
                {v === 0 && (row?.activeSec ?? 0) > 0 ? '<1' : v}
              </text>
              <text x={cx} y={base + 22} textAnchor="middle" className="tl-label">
                {labels[i]}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
