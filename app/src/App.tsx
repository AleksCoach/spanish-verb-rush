import { useCallback, useEffect, useRef, useState } from 'react'
import { Home } from './components/Home'
import { Intro } from './components/Intro'
import { Login } from './components/Login'
import { Play } from './components/Play'
import type { StatUpdate } from './components/Play'
import { Summary } from './components/Summary'
import { LEVEL_BY_ID, MAX_LEVEL } from './data/levels'
import { summarize } from './game/engine'
import type { RoundState, Summary as SummaryData } from './game/engine'
import { setSoundEnabled } from './game/sound'
import { clearSave, emptySave, getActiveProfile, loadSave, setActiveProfile, writeSave } from './game/storage'
import type { Profile } from './game/storage'
import type { SaveData } from './game/types'

type Screen =
  | { name: 'home' }
  | { name: 'intro'; levelId: number }
  | { name: 'play'; levelId: number; run: number }
  | { name: 'summary'; levelId: number; summary: SummaryData; unlockedNow: boolean }

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => getActiveProfile())
  const [save, setSave] = useState<SaveData>(() => {
    const p = getActiveProfile()
    return p ? loadSave(p.id) : emptySave()
  })
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const saveRef = useRef(save)
  const runRef = useRef(0)

  useEffect(() => {
    saveRef.current = save
    if (profile) writeSave(profile.id, save)
  }, [save, profile])

  useEffect(() => {
    setSoundEnabled(save.sound)
  }, [save.sound])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen.name, profile])

  const login = useCallback((p: Profile) => {
    setActiveProfile(p.id)
    setSave(loadSave(p.id))
    setProfile(p)
    setScreen({ name: 'home' })
  }, [])

  const logout = useCallback(() => {
    setActiveProfile(null)
    setProfile(null)
    setScreen({ name: 'home' })
  }, [])

  const openIntro = useCallback((levelId: number) => setScreen({ name: 'intro', levelId }), [])
  const play = useCallback((levelId: number) => {
    runRef.current += 1
    setScreen({ name: 'play', levelId, run: runRef.current })
  }, [])
  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  const onProgress = useCallback((xpDelta: number, combo: number, update: StatUpdate) => {
    setSave((s) => ({
      ...s,
      xp: s.xp + xpDelta,
      bestCombo: Math.max(s.bestCombo, combo),
      stats: update ? { ...s.stats, [update.key]: update.stat } : s.stats,
    }))
  }, [])

  const onFinish = useCallback((round: RoundState) => {
    const level = LEVEL_BY_ID[round.levelId]
    const summary = summarize(round, level)
    const before = saveRef.current
    const nextId = Math.min(MAX_LEVEL, level.id + 1)
    const unlockedNow = summary.passed && nextId > before.unlocked
    setSave((s) => {
      const prev = s.levels[level.id]
      return {
        ...s,
        unlocked: summary.passed ? Math.max(s.unlocked, nextId) : s.unlocked,
        bestCombo: Math.max(s.bestCombo, summary.bestCombo),
        levels: {
          ...s.levels,
          [level.id]: {
            stars: Math.max(prev?.stars ?? 0, summary.stars),
            bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, summary.accuracy),
            plays: (prev?.plays ?? 0) + 1,
            bestCombo: Math.max(prev?.bestCombo ?? 0, summary.bestCombo),
          },
        },
      }
    })
    setScreen({ name: 'summary', levelId: level.id, summary, unlockedNow })
  }, [])

  const toggleSound = useCallback(() => setSave((s) => ({ ...s, sound: !s.sound })), [])

  const reset = useCallback(() => {
    if (!profile) return
    clearSave(profile.id)
    setSave(emptySave())
    setScreen({ name: 'home' })
  }, [profile])

  if (!profile) {
    return (
      <main className="app">
        <Login onLogin={login} />
      </main>
    )
  }

  return (
    <main className="app">
      {screen.name === 'home' && (
        <Home
          save={save}
          playerName={profile.name}
          onPlay={openIntro}
          onToggleSound={toggleSound}
          onReset={reset}
          onLogout={logout}
        />
      )}
      {screen.name === 'intro' && (
        <Intro level={LEVEL_BY_ID[screen.levelId]} onStart={() => play(screen.levelId)} onBack={goHome} />
      )}
      {screen.name === 'play' && (
        <Play
          key={screen.run}
          level={LEVEL_BY_ID[screen.levelId]}
          stats={save.stats}
          xp={save.xp}
          onProgress={onProgress}
          onFinish={onFinish}
          onQuit={goHome}
        />
      )}
      {screen.name === 'summary' && (
        <Summary
          level={LEVEL_BY_ID[screen.levelId]}
          summary={screen.summary}
          unlockedNow={screen.unlockedNow}
          canNext={screen.levelId < MAX_LEVEL && save.unlocked > screen.levelId}
          onNext={() => openIntro(screen.levelId + 1)}
          onReplay={() => play(screen.levelId)}
          onHome={goHome}
        />
      )}
    </main>
  )
}
