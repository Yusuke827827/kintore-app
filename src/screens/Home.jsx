import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { daysAgoLabel, formatDateJa, todayStr } from '../lib/date'
import { nm, t } from '../i18n'
import {
  doneExercisesForPart,
  lastExercisesForPart,
  lastTrainedByPart,
  sessionPartIds,
  sortSessionsDesc,
  suggestParts,
} from '../lib/stats'

const GROUPS = [
  { key: 'upper', label: '上半身' },
  { key: 'lower', label: '下半身' },
  { key: 'core', label: '体幹' },
  { key: 'other', label: 'その他' },
] // label は表示時に t() で訳す

export default function Home({ onOpenWorkout, onOpenCustomize }) {
  const {
    bodyParts,
    allBodyParts,
    exercises,
    allExercises,
    sessions,
    routines,
    activeWorkout,
    startWorkout,
  } = useData()
  const today = todayStr()

  const lastByPart = useMemo(() => lastTrainedByPart(sessions, allExercises), [sessions, allExercises])
  const suggested = useMemo(
    () => suggestParts(bodyParts, sessions, allExercises),
    [bodyParts, sessions, allExercises]
  )
  // 何も触らなければ「おすすめ」のまま。タップしたら自分の選択に切り替わる。
  const [picked, setPicked] = useState(null)
  const chosen = picked ?? suggested

  // 前回のメニューは最初からオン。ほかに一度でもやった種目はタップでオンにできる。
  const baseMenu = useMemo(
    () => chosen.flatMap((pid) => lastExercisesForPart(sessions, exercises, pid)),
    [chosen, sessions, exercises]
  )
  const candidates = useMemo(() => {
    const done = chosen.flatMap((pid) => doneExercisesForPart(sessions, exercises, pid))
    return [...new Set([...baseMenu, ...done])]
  }, [chosen, sessions, exercises, baseMenu])
  const [toggled, setToggled] = useState({}) // 種目id → オン/オフ（触ったものだけ）
  const isOn = (id) => toggled[id] ?? baseMenu.includes(id)
  const menu = candidates.filter(isOn)

  const lastSession = useMemo(() => sortSessionsDesc(sessions)[0] ?? null, [sessions])
  const weekCount = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // 今週の月曜
    const monday = todayStr(d)
    return new Set(sessions.filter((s) => s.date >= monday).map((s) => s.date)).size
  }, [sessions])

  const visibleIds = new Set(exercises.map((e) => e.id))

  function partName(id) {
    return nm(allBodyParts.find((p) => p.id === id))
  }
  function exName(id) {
    return nm(allExercises.find((e) => e.id === id))
  }

  function togglePart(id) {
    setPicked((cur) => {
      const base = cur ?? suggested
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    })
  }

  function start(exerciseIds, partIds) {
    if (activeWorkout && !confirm(t('記録中のトレーニングがあります。破棄して新しく始めますか？'))) return
    startWorkout(exerciseIds, partIds)
    onOpenWorkout()
  }

  return (
    <div className="screen">
      <h1>{t('今日のトレーニング')}</h1>
      <p className="muted">
        {formatDateJa(today)} ・ {t('今週 {n}回', { n: weekCount })}
        {lastSession && (
          <>
            {' '}
            ・ {t('前回')} {daysAgoLabel(lastSession.date, today)}
            {t('（')}
            {sessionPartIds(lastSession, allExercises).map(partName).filter(Boolean).join(t('＋'))}
            {t('）')}
          </>
        )}
      </p>

      {activeWorkout && (
        <section className="card resume">
          <h2>{activeWorkout.sourceSessionId ? t('修正中の記録があります') : t('トレーニング記録中')}</h2>
          <p className="muted">
            {activeWorkout.items.map((it) => exName(it.exerciseId)).join(t('・')) || t('種目なし')}
          </p>
          <button className="primary wide" onClick={onOpenWorkout}>
            {t('続きから記録する')}
          </button>
        </section>
      )}

      <section className="card">
        <div className="item-header">
          <h2>
            {t('部位')}
            {!picked && sessions.length > 0 && <span className="badge">{t('おすすめを選択中')}</span>}
          </h2>
          <button className="ghost" onClick={() => onOpenCustomize('parts')}>
            {t('編集')}
          </button>
        </div>
        {GROUPS.map((g) => {
          const parts = bodyParts.filter((p) => p.group === g.key)
          if (parts.length === 0) return null
          return (
            <div key={g.key} className="part-group">
              <span className="group-label">{t(g.label)}</span>
              <div className="chips">
                {parts.map((p) => (
                  <button
                    key={p.id}
                    className={`chip ${chosen.includes(p.id) ? 'on' : ''}`}
                    onClick={() => togglePart(p.id)}
                  >
                    {nm(p)}
                    <small>{daysAgoLabel(lastByPart[p.id], today)}</small>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="menu-preview">
          {candidates.length > 0 ? (
            <>
              <span className="muted">
                {t('今日のメニュー（{n}種目）・タップでオン／オフ', { n: menu.length })}
              </span>
              <div className="chips">
                {candidates.map((id) => (
                  <button
                    key={id}
                    className={`chip small ${isOn(id) ? 'on' : ''}`}
                    onClick={() => setToggled((t) => ({ ...t, [id]: !isOn(id) }))}
                  >
                    {isOn(id) ? '✓ ' : ''}
                    {exName(id)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <span className="muted">
              {chosen.length === 0
                ? t('部位を選んでください')
                : t('はじめての部位です。次の画面で種目を選びます。')}
            </span>
          )}
        </div>

        <button
          className="primary wide big"
          disabled={chosen.length === 0}
          onClick={() => start(menu, chosen)}
        >
          {chosen.length > 0
            ? t('{parts}で始める', { parts: chosen.map(partName).join(t('＋')) })
            : t('始める')}
        </button>
        <button className="link" onClick={() => start([], chosen)} disabled={chosen.length === 0}>
          {t('種目を自分で選んで始める')}
        </button>
      </section>

      {routines.length > 0 && (
        <section className="card">
          <div className="item-header">
            <h2>{t('マイセット')}</h2>
            <button className="ghost" onClick={() => onOpenCustomize('routines')}>
              {t('編集')}
            </button>
          </div>
          <ul className="plain-list">
            {routines.map((r) => (
              <li key={r.id} className="routine">
                <button
                  className="routine-main"
                  onClick={() => start(r.exerciseIds.filter((id) => visibleIds.has(id)), [])}
                >
                  <strong>{r.name}</strong>
                  <span className="muted">
                    {r.exerciseIds.map(exName).filter(Boolean).join(t('・'))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button className="link" onClick={() => start([], [])}>
        {t('空のトレーニングを始める')}
      </button>
      <button className="link" onClick={() => onOpenCustomize('routines')}>
        {t('＋ マイセットを作る')}
      </button>
    </div>
  )
}
