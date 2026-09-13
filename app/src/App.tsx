import { useCallback, useEffect, useRef, useState } from 'react'
import { Home } from './components/Home'
import { Intro } from './components/Intro'
import { Login } from './components/Login'
import { Play } from './components/Play'
import type { StatUpdate } from './components/Play'
import { Summary } from './components/Summary'
import { LEVEL_BY_ID, MAX_LEVEL, isUnlocked } from './data/levels'
import { cloudActiveSecond, cloudAnswer, cloudRound, persistCloud, syncCloud, uuid } from './cloud/sync'
import { IDLE_LIMIT_MS, addActivity, answerPatch } from './game/activity'
import { summarize } from './game/engine'
import type { RoundState, Summary as SummaryData } from './game/engine'
import { setSoundEnabled } from './game/sound'
import { onCaption, setCommentatorEnabled } from './game/voice'
import { clearSave, emptySave, getActiveProfile, loadSave, setActiveProfile, writeSave } from './game/storage'
import type { Profile } from './game/storage'
import type { LevelBest, SaveData } from './game/types'

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
  const profileRef = useRef(profile)
  useEffect(() => {
    profileRef.current = profile
  }, [profile])
  const runRef = useRef(0)

  useEffect(() => {
    saveRef.current = save
    if (profile) writeSave(profile.id, save)
  }, [save, profile])

  useEffect(() => {
    setSoundEnabled(save.sound)
  }, [save.sound])

  useEffect(() => {
    setCommentatorEnabled(save.commentator)
  }, [save.commentator])

  const [caption, setCaption] = useState<string | null>(null)
  useEffect(() => {
    onCaption(setCaption)
    return () => onCaption(null)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen.name, profile])

  // czas aktywny: sekunda liczy się, gdy gra jest na ekranie, a ostatni ruch gracza był ≤ 5 s temu
  const lastInputRef = useRef(Date.now())
  const pendingSecRef = useRef(0)
  useEffect(() => {
    if (!profile) return
    const mark = () => {
      lastInputRef.current = Date.now()
    }
    const flush = () => {
      persistCloud(profile.id)
      const sec = pendingSecRef.current
      if (!sec) return
      pendingSecRef.current = 0
      saveRef.current = addActivity(saveRef.current, { activeSec: sec })
      writeSave(profile.id, saveRef.current)
      setSave((s) => addActivity(s, { activeSec: sec }))
    }
    const tick = window.setInterval(() => {
      const visible = document.visibilityState === 'visible'
      if (visible && Date.now() - lastInputRef.current <= IDLE_LIMIT_MS) {
        pendingSecRef.current += 1
        cloudActiveSecond(profile.id)
      }
      if (pendingSecRef.current >= 15 || (!visible && pendingSecRef.current > 0)) flush()
    }, 1000)
    // wysyłka do panelu rodzica co minutę (tylko gdy profil połączony kodem rodzica)
    const sync = window.setInterval(() => {
      void syncCloud(profile.id, saveRef.current, profile.name)
    }, 60_000)
    void syncCloud(profile.id, saveRef.current, profile.name)
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        flush()
        void syncCloud(profile.id, saveRef.current, profile.name, true)
      }
    }
    const events = ['keydown', 'pointerdown', 'touchstart', 'input'] as const
    events.forEach((e) => window.addEventListener(e, mark, { capture: true, passive: true }))
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      flush()
      window.clearInterval(tick)
      window.clearInterval(sync)
      events.forEach((e) => window.removeEventListener(e, mark, { capture: true }))
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }, [profile])

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
    setSave((s) => {
      const next = {
        ...s,
        xp: s.xp + xpDelta,
        bestCombo: Math.max(s.bestCombo, combo),
        stats: update ? { ...s.stats, [update.key]: update.stat } : s.stats,
      }
      return update ? addActivity(next, answerPatch(update.grade)) : next
    })
    if (update && profileRef.current) cloudAnswer(profileRef.current.id, update.grade)
  }, [])

  const onFinish = useCallback((round: RoundState) => {
    const level = LEVEL_BY_ID[round.levelId]
    const summary = summarize(round, level)
    const before = saveRef.current
    const best = (prev: LevelBest | undefined): LevelBest => ({
      stars: Math.max(prev?.stars ?? 0, summary.stars),
      bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, summary.score),
      plays: (prev?.plays ?? 0) + 1,
      bestCombo: Math.max(prev?.bestCombo ?? 0, summary.bestCombo),
    })
    const nextLevel = level.id < MAX_LEVEL ? LEVEL_BY_ID[level.id + 1] : null
    const unlockedNow = Boolean(
      nextLevel &&
        !isUnlocked(nextLevel, before) &&
        isUnlocked(nextLevel, { ...before, levels: { ...before.levels, [level.key]: best(before.levels[level.key]) } }),
    )
    setSave((s) =>
      addActivity(
        {
          ...s,
          bestCombo: Math.max(s.bestCombo, summary.bestCombo),
          levels: { ...s.levels, [level.key]: best(s.levels[level.key]) },
          exams: level.kind === 'exam' ? [...s.exams, { at: Date.now(), score: summary.score }].slice(-20) : s.exams,
        },
        { rounds: 1, passed: summary.passed ? 1 : 0 },
      ),
    )
    const p = profileRef.current
    if (p) {
      cloudRound(p.id, {
        id: uuid(),
        finishedAt: new Date().toISOString(),
        levelKey: level.key,
        levelName: level.kind === 'exam' ? 'EGZAMIN' : level.code,
        levelKind: level.kind,
        score: summary.score,
        stars: summary.stars,
        answers: summary.total,
        correct: summary.ok,
        durationSec: Math.round((Date.now() - round.startedAt) / 1000),
      })
      window.setTimeout(() => void syncCloud(p.id, saveRef.current, p.name), 1500)
    }
    setScreen({ name: 'summary', levelId: level.id, summary, unlockedNow })
  }, [])

  const toggleSound = useCallback(() => setSave((s) => ({ ...s, sound: !s.sound })), [])
  const toggleCommentator = useCallback(() => setSave((s) => ({ ...s, commentator: !s.commentator })), [])

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
          profileId={profile.id}
          playerName={profile.name}
          onPlay={openIntro}
          onToggleSound={toggleSound}
          onToggleCommentator={toggleCommentator}
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
          canNext={screen.levelId < MAX_LEVEL && isUnlocked(LEVEL_BY_ID[screen.levelId + 1], save)}
          exams={save.exams}
          onNext={() => openIntro(screen.levelId + 1)}
          onReplay={() => (screen.summary.passed ? play(screen.levelId) : openIntro(screen.levelId))}
          onHome={goHome}
        />
      )}
      {caption && (
        <div className="caption" role="status">
          <span aria-hidden="true">🎙️</span> {caption}
        </div>
      )}
    </main>
  )
}
