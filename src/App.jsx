import { useState } from 'react'
import './App.css'
import { DataProvider, useData } from './state/DataContext'
import Home from './screens/Home'
import Workout from './screens/Workout'
import History from './screens/History'
import Settings from './screens/Settings'
import { formatMinutes } from './lib/date'

function FinishedSummary({ summary, onClose }) {
  return (
    <div className="screen">
      <section className="card finished">
        <h1>{summary.isEdit ? '修正を保存しました' : 'おつかれさまでした！'}</h1>
        <div className="stats">
          <div>
            <strong>{summary.exercises}</strong>
            <span>種目</span>
          </div>
          <div>
            <strong>{summary.sets}</strong>
            <span>セット</span>
          </div>
          <div>
            <strong>{Math.round(summary.volume).toLocaleString()}</strong>
            <span>kg</span>
          </div>
          {formatMinutes(summary.durationMs) && (
            <div>
              <strong>{formatMinutes(summary.durationMs)}</strong>
              <span>時間</span>
            </div>
          )}
        </div>
        {summary.prs.length > 0 && (
          <p className="target">🏆 自己ベスト更新：{summary.prs.join('・')}</p>
        )}
        <button className="primary wide" onClick={onClose}>
          OK
        </button>
      </section>
    </div>
  )
}

function AppInner() {
  const { activeWorkout, syncStatus } = useData()
  // 記録の途中でアプリが閉じても、開き直したらそのまま続きから
  const [screen, setScreen] = useState(() => (activeWorkout ? 'workout' : 'home'))
  const [summary, setSummary] = useState(null)

  const current = screen === 'workout' && !activeWorkout ? 'home' : screen

  const tabs = [
    { key: 'home', label: 'ホーム' },
    ...(activeWorkout ? [{ key: 'workout', label: '記録中' }] : []),
    { key: 'history', label: '履歴' },
    { key: 'settings', label: '設定' },
  ]

  return (
    <div className="app">
      {syncStatus.state === 'error' && current !== 'settings' && (
        <button className="sync-error" onClick={() => setScreen('settings')}>
          ⚠ 同期できていません（記録はこの端末に保存済み）
        </button>
      )}
      <main>
        {summary ? (
          <FinishedSummary summary={summary} onClose={() => setSummary(null)} />
        ) : (
          <>
            {current === 'home' && <Home onOpenWorkout={() => setScreen('workout')} />}
            {current === 'workout' && (
              <Workout
                onFinished={(s) => {
                  setSummary(s)
                  setScreen('home')
                }}
              />
            )}
            {current === 'history' && <History onOpenWorkout={() => setScreen('workout')} />}
            {current === 'settings' && <Settings />}
          </>
        )}
      </main>

      <nav className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${current === t.key && !summary ? 'active' : ''} ${t.key === 'workout' ? 'live' : ''}`}
            onClick={() => {
              setSummary(null)
              setScreen(t.key)
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppInner />
    </DataProvider>
  )
}
