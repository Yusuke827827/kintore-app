import { useMemo, useState } from 'react'
import './App.css'
import { DataProvider, useData } from './state/DataContext'
import Home from './screens/Home'
import Workout from './screens/Workout'
import History from './screens/History'
import Settings from './screens/Settings'
import Customize from './screens/Customize'
import Plan from './screens/Plan'
import Meals from './screens/Meals'
import { formatMinutes } from './lib/date'
import { formatPace } from './lib/stats'
import { nm, t } from './i18n'
import { shareSessionImage } from './lib/shareImage'
import useWakeLock from './hooks/useWakeLock'

// 今回やったメニューをマイセットに登録するか聞く（同じメニューが登録済みなら聞かない）
function SaveAsMySet({ exerciseIds }) {
  const { routines, allExercises, allBodyParts, addRoutine } = useData()
  const defaultName = useMemo(() => {
    const partIds = [
      ...new Set(exerciseIds.map((id) => allExercises.find((e) => e.id === id)?.bodyPartId)),
    ]
    const names = partIds.map((id) => nm(allBodyParts.find((p) => p.id === id))).filter(Boolean)
    return names.length ? t('{parts}の日', { parts: names.join(t('＋')) }) : t('マイセット')
  }, [exerciseIds, allExercises, allBodyParts])
  const [name, setName] = useState(defaultName)
  const [state, setState] = useState('ask') // ask | saved | skipped

  const key = [...exerciseIds].sort().join(',')
  const existing = routines.find((r) => [...r.exerciseIds].sort().join(',') === key)
  if (exerciseIds.length === 0 || state === 'skipped') return null
  if (existing && state === 'ask') {
    return (
      <p className="muted">
        {t('このメニューはマイセット「{name}」に登録済みです。', { name: existing.name })}
      </p>
    )
  }
  if (state === 'saved') {
    return (
      <p className="target">
        {t('マイセット「{name}」に登録しました。ホームからワンタップで始められます。', {
          name: name.trim(),
        })}
      </p>
    )
  }
  return (
    <div className="myset-ask">
      <p>{t('今回のメニューをマイセットに登録しますか？')}</p>
      <input
        className="search"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('名前（例：胸の日）')}
      />
      <div className="row">
        <button className="secondary" onClick={() => setState('skipped')}>
          {t('しない')}
        </button>
        <button
          className="primary"
          disabled={!name.trim()}
          onClick={() => {
            addRoutine(name.trim(), exerciseIds)
            setState('saved')
          }}
        >
          {t('登録する')}
        </button>
      </div>
    </div>
  )
}

function ShareButton({ sessionId, className = 'secondary wide' }) {
  const { sessions, allExercises, allBodyParts } = useData()
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) return null
  return (
    <button
      className={className}
      onClick={() =>
        shareSessionImage(session, { sessions, exercises: allExercises, bodyParts: allBodyParts })
      }
    >
      {t('📤 画像で共有')}
    </button>
  )
}

function FinishedSummary({ summary, onClose }) {
  return (
    <div className="screen">
      <section className="card finished">
        <h1>{summary.isEdit ? t('修正を保存しました') : t('おつかれさまでした！')}</h1>
        <div className="stats">
          <div>
            <strong>{summary.exercises}</strong>
            <span>{t('種目')}</span>
          </div>
          {(summary.volume > 0 || !summary.cardio?.min) && (
            <div>
              <strong>{summary.sets}</strong>
              <span>{t('セット')}</span>
            </div>
          )}
          {summary.volume > 0 && (
            <div>
              <strong>{Math.round(summary.volume).toLocaleString()}</strong>
              <span>kg</span>
            </div>
          )}
          {summary.cardio?.min > 0 && (
            <div>
              <strong>{summary.cardio.min}</strong>
              <span>{t('分')}</span>
            </div>
          )}
          {summary.cardio?.km > 0 && (
            <div>
              <strong>{Math.round(summary.cardio.km * 100) / 100}</strong>
              <span>km</span>
            </div>
          )}
          {summary.cardio?.kcal > 0 && (
            <div>
              <strong>{Math.round(summary.cardio.kcal)}</strong>
              <span>kcal</span>
            </div>
          )}
          {formatMinutes(summary.durationMs) && (
            <div>
              <strong>{formatMinutes(summary.durationMs)}</strong>
              <span>{t('時間')}</span>
            </div>
          )}
        </div>
        {summary.cardio?.km > 0 && summary.cardio?.min > 0 && (
          <p className="muted">
            {t('平均ペース {p}', { p: formatPace(summary.cardio.min, summary.cardio.km) })}
          </p>
        )}
        {summary.prs.length > 0 && (
          <p className="target">🏆 {t('自己ベスト更新')}：{summary.prs.join(t('・'))}</p>
        )}
        {!summary.isEdit && <SaveAsMySet exerciseIds={summary.exerciseIds ?? []} />}
        <ShareButton sessionId={summary.sessionId} />
        <button className="primary wide" onClick={onClose}>
          OK
        </button>
      </section>
    </div>
  )
}

function AppInner() {
  const { activeWorkout, syncStatus, startWorkout, settings } = useData()
  // 記録中は画面を消さない
  const wake = useWakeLock(!!activeWorkout && settings.keepAwake !== false)
  // 記録の途中でアプリが閉じても、開き直したらそのまま続きから
  const [screen, setScreen] = useState(() => (activeWorkout ? 'workout' : 'home'))
  const [summary, setSummary] = useState(null)
  const [customizeTab, setCustomizeTab] = useState('parts')

  function openCustomize(tab) {
    setCustomizeTab(tab)
    setScreen('customize')
  }

  const current = screen === 'workout' && !activeWorkout ? 'home' : screen

  const tabs = [
    { key: 'home', label: t('ホーム') },
    ...(activeWorkout ? [{ key: 'workout', label: t('記録中') }] : []),
    { key: 'plan', label: t('計画') },
    { key: 'meals', label: t('食事') },
    { key: 'history', label: t('履歴') },
    { key: 'settings', label: t('設定') },
  ]

  return (
    <div className="app">
      {syncStatus.state === 'error' && current !== 'settings' && (
        <button className="sync-error" onClick={() => setScreen('settings')}>
          {t('⚠ 同期できていません（記録はこの端末に保存済み）')}
        </button>
      )}
      <main>
        {summary ? (
          <FinishedSummary summary={summary} onClose={() => setSummary(null)} />
        ) : (
          <>
            {current === 'home' && (
              <Home onOpenWorkout={() => setScreen('workout')} onOpenCustomize={openCustomize} />
            )}
            {current === 'workout' && (
              <Workout
                wake={wake}
                onFinished={(s) => {
                  setSummary(s)
                  setScreen('home')
                }}
              />
            )}
            {current === 'history' && <History onOpenWorkout={() => setScreen('workout')} />}
            {current === 'plan' && (
              <Plan
                onStartRoutine={(r) => {
                  if (activeWorkout && !confirm(t('記録中のトレーニングがあります。破棄して新しく始めますか？'))) return
                  startWorkout(r.exerciseIds, [], r.targets)
                  setScreen('workout')
                }}
              />
            )}
            {current === 'meals' && <Meals />}
            {current === 'settings' && <Settings onOpenCustomize={openCustomize} />}
            {current === 'customize' && (
              <Customize
                key={customizeTab}
                initialTab={customizeTab}
                onBack={() => setScreen('settings')}
              />
            )}
          </>
        )}
      </main>

      <nav className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${(current === t.key || (t.key === 'settings' && current === 'customize')) && !summary ? 'active' : ''} ${t.key === 'workout' ? 'live' : ''}`}
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
