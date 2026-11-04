import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { DataProvider, useData } from './state/DataContext'
import { PremiumProvider, usePremium } from './state/PremiumContext'
import Home from './screens/Home'
import Workout from './screens/Workout'
import History from './screens/History'
import Settings from './screens/Settings'
import Customize from './screens/Customize'
import Plan from './screens/Plan'
import Meals from './screens/Meals'
import Onboarding from './screens/Onboarding'
import { formatMinutes } from './lib/date'
import { formatPace } from './lib/stats'
import { nm, t } from './i18n'
import { shareSessionImage } from './lib/shareImage'
import useWakeLock from './hooks/useWakeLock'
import { newBadges } from './lib/badges'
import { BadgeGrid } from './components/Badges'
import Icon from './components/Icon'

// 今回やったメニューをマイセットに登録するか聞く（同じメニューが登録済みなら聞かない）
function SaveAsMySet({ exerciseIds }) {
  const { routines, allExercises, allBodyParts, addRoutine } = useData()
  const { gate } = usePremium()
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
            if (!gate('routines', routines.length)) return
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
      <Icon name="share" size={18} />
      {t('画像で共有')}
    </button>
  )
}

// 今回のトレーニングで新しく取ったバッジ
function NewBadges({ sessionId }) {
  const { sessions, allExercises, meals, bodyLogs, settings } = useData()
  const badges = useMemo(
    () => (sessionId ? newBadges({ sessions, exercises: allExercises, meals, bodyLogs, settings }, sessionId) : []),
    [sessionId, sessions, allExercises, meals, bodyLogs, settings]
  )
  if (badges.length === 0) return null
  return (
    <div className="new-badges">
      <p className="target">{t('新しいバッジを獲得しました')}</p>
      <BadgeGrid badges={badges} />
    </div>
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
          <p className="target"><Icon name="trophy" size={16} /> {t('自己ベスト更新')}：{summary.prs.join(t('・'))}</p>
        )}
        {!summary.isEdit && <NewBadges sessionId={summary.sessionId} />}
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
  const { activeWorkout, syncStatus, startWorkout, settings, sessions, profile, connectSync } = useData()
  // ほかの端末のQRコードから開いたとき（#sync=…）は、その同期につなぐ
  const [linkToken] = useState(() => location.hash.match(/sync=([^&]+)/)?.[1] ?? null)
  const [linkMsg, setLinkMsg] = useState(() => (linkToken && !syncStatus.configured ? t('同期につないでいます…') : ''))
  useEffect(() => {
    if (!linkToken) return
    history.replaceState(null, '', location.pathname + location.search)
    if (syncStatus.configured) return
    connectSync(decodeURIComponent(linkToken))
      .then(() => setLinkMsg(t('同期につながりました。ほかの端末と同じ記録が見られます。')))
      .catch((e) => setLinkMsg(e.message || t('接続できませんでした')))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // 初めて開いたとき（記録もプロフィールもない）は案内を出す。同期でつなぐときは出さない
  const [onboarding, setOnboarding] = useState(
    () => !settings.onboarded && sessions.length === 0 && !profile && !activeWorkout && !linkToken
  )
  // 記録中は画面を消さない
  const wake = useWakeLock(!!activeWorkout && settings.keepAwake !== false)
  // 記録の途中でアプリが閉じても、開き直したらそのまま続きから
  const [screen, setScreen] = useState(() => (activeWorkout ? 'workout' : 'home'))
  const [summary, setSummary] = useState(null)
  const [customizeTab, setCustomizeTab] = useState('parts')
  // 履歴をどの表示で開くか（ホームのレポートから来たときはレポート）
  const [historyOpen, setHistoryOpen] = useState({ view: 'log', n: 0 })

  function openCustomize(tab) {
    setCustomizeTab(tab)
    setScreen('customize')
  }

  const current = screen === 'workout' && !activeWorkout ? 'home' : screen

  const tabs = [
    { key: 'home', label: t('ホーム'), icon: 'home' },
    ...(activeWorkout ? [{ key: 'workout', label: t('記録中'), icon: 'live' }] : []),
    { key: 'plan', label: t('計画'), icon: 'calendar' },
    { key: 'meals', label: t('食事'), icon: 'meals' },
    { key: 'history', label: t('履歴'), icon: 'history' },
    { key: 'settings', label: t('設定'), icon: 'settings' },
  ]

  if (onboarding) return <Onboarding onDone={() => setOnboarding(false)} />

  return (
    <div className="app">
      {syncStatus.state === 'error' && current !== 'settings' && (
        <button className="sync-error" role="status" onClick={() => setScreen('settings')}>
          <Icon name="alert" size={16} /> {t('同期できていません（記録はこの端末に保存済み）')}
        </button>
      )}
      {linkMsg && (
        <button className="link-banner" role="status" onClick={() => setLinkMsg('')}>
          {linkMsg}
        </button>
      )}
      <main>
        {summary ? (
          <FinishedSummary summary={summary} onClose={() => setSummary(null)} />
        ) : (
          <>
            {current === 'home' && (
              <Home
                onOpenWorkout={() => setScreen('workout')}
                onOpenCustomize={openCustomize}
                onOpenReport={(kind, offset) => {
                  setHistoryOpen((h) => ({ view: 'report', kind, offset, n: h.n + 1 }))
                  setScreen('history')
                }}
              />
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
            {current === 'history' && (
              <History
                key={historyOpen.n}
                initialView={historyOpen.view}
                reportProps={{ initialKind: historyOpen.kind, initialOffset: historyOpen.offset }}
                onOpenWorkout={() => setScreen('workout')}
              />
            )}
            {current === 'plan' && (
              <Plan
                onStartRoutine={(r) => {
                  if (activeWorkout && !confirm(t('記録中のトレーニングがあります。破棄して新しく始めますか？'))) return
                  startWorkout(r.exerciseIds, [], r.targets, r.id)
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
                onStartRoutine={(r) => {
                  if (activeWorkout && !confirm(t('記録中のトレーニングがあります。破棄して新しく始めますか？'))) return
                  startWorkout(r.exerciseIds, [], r.targets, r.id)
                  setScreen('workout')
                }}
              />
            )}
          </>
        )}
      </main>

      <nav className="tabbar" aria-label={t('メニュー')}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${(current === t.key || (t.key === 'settings' && current === 'customize')) && !summary ? 'active' : ''} ${t.key === 'workout' ? 'live' : ''}`}
            aria-current={(current === t.key || (t.key === 'settings' && current === 'customize')) && !summary ? 'page' : undefined}
            onClick={() => {
              setSummary(null)
              if (t.key === 'history') setHistoryOpen((h) => ({ view: 'log', n: h.n + 1 }))
              setScreen(t.key)
            }}
          >
            <Icon name={t.icon} size={24} strokeWidth={t.key === current ? 2.1 : 1.7} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <PremiumProvider>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </PremiumProvider>
  )
}
