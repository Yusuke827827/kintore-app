import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import LineChart from '../components/LineChart'
import { formatDateJa, formatMinutes, todayStr } from '../lib/date'
import { e1rm, sessionVolume, sortSessionsDesc } from '../lib/stats'
import { getLanguage, nm, t } from '../i18n'

function MonthCalendar({ sessions }) {
  const [offset, setOffset] = useState(0)
  const base = new Date()
  base.setDate(1)
  base.setMonth(base.getMonth() + offset)
  const year = base.getFullYear()
  const month = base.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // 月曜はじまり
  const days = new Date(year, month + 1, 0).getDate()
  const trained = new Set(sessions.map((s) => s.date))
  const today = todayStr()

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(todayStr(new Date(year, month, d)))
  const monthCount = cells.filter((d) => d && trained.has(d)).length

  return (
    <section className="card">
      <div className="cal-header">
        <button className="ghost" onClick={() => setOffset(offset - 1)}>
          ‹
        </button>
        <h2>
          {t('{y}年{m}月', { y: year, m: month + 1 })}{' '}
          <span className="muted">{t('{n}日', { n: monthCount })}</span>
        </h2>
        <button className="ghost" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
          ›
        </button>
      </div>
      <div className="calendar">
        {(getLanguage() === 'en'
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : ['月', '火', '水', '木', '金', '土', '日']
        ).map((w) => (
          <span key={w} className="dow">
            {w}
          </span>
        ))}
        {cells.map((d, i) => (
          <span
            key={i}
            className={`day ${d && trained.has(d) ? 'trained' : ''} ${d === today ? 'today' : ''}`}
          >
            {d ? Number(d.slice(8)) : ''}
          </span>
        ))}
      </div>
    </section>
  )
}

export default function History({ onOpenWorkout }) {
  const {
    sessions,
    bodyParts,
    allBodyParts,
    allExercises: exercises,
    deleteSession,
    editSession,
    activeWorkout,
  } = useData()
  const [filterPart, setFilterPart] = useState('all')
  const [graphExerciseId, setGraphExerciseId] = useState('')

  const sorted = useMemo(() => sortSessionsDesc(sessions), [sessions])
  const filtered = sorted.filter(
    (s) => filterPart === 'all' || s.bodyPartIds.includes(filterPart)
  )

  function partName(id) {
    return nm(allBodyParts.find((p) => p.id === id)) || id
  }
  function exerciseName(id) {
    const ex = exercises.find((e) => e.id === id)
    return ex ? nm(ex) : t('（削除された種目）')
  }

  // 記録が1件以上ある種目だけを、グラフの選択肢にする
  const exercisesWithRecord = useMemo(() => {
    const ids = new Set()
    sessions.forEach((s) => s.entries.forEach((en) => ids.add(en.exerciseId)))
    return exercises.filter((e) => ids.has(e.id))
  }, [sessions, exercises])

  const graphData = useMemo(() => {
    if (!graphExerciseId) return []
    return sortSessionsDesc(sessions)
      .reverse()
      .filter((s) => s.entries.some((en) => en.exerciseId === graphExerciseId))
      .map((s) => {
        const entry = s.entries.find((en) => en.exerciseId === graphExerciseId)
        const weight = Math.max(...entry.sets.map((set) => set.weight))
        const best = Math.max(...entry.sets.map((set) => e1rm(set.weight, set.reps)))
        const volume = entry.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
        return { date: s.date, weight, best, volume }
      })
  }, [sessions, graphExerciseId])

  function handleEdit(id) {
    if (activeWorkout && !confirm(t('記録中のトレーニングを破棄して、この記録を修正しますか？'))) return
    editSession(id)
    onOpenWorkout()
  }

  return (
    <div className="screen">
      <h1>{t('履歴')}</h1>

      <MonthCalendar sessions={sessions} />

      <section className="card">
        <h2>{t('種目の推移')}</h2>
        <select value={graphExerciseId} onChange={(e) => setGraphExerciseId(e.target.value)}>
          <option value="">{t('種目を選ぶ')}</option>
          {exercisesWithRecord.map((e) => (
            <option key={e.id} value={e.id}>
              {nm(e)}
            </option>
          ))}
        </select>

        {graphExerciseId && graphData.length > 0 && (
          <>
            <p className="muted" style={{ marginTop: 8 }}>
              {t('自己ベスト：最大 {w}kg ・ 推定1RM {r}kg', {
                w: Math.max(...graphData.map((d) => d.weight)),
                r: Math.max(...graphData.map((d) => d.best)),
              })}
            </p>
            <h3>{t('最大重量（kg）')}</h3>
            <LineChart
              points={graphData.map((d) => ({ label: d.date, value: d.weight }))}
              unit="kg"
              color="var(--accent-text)"
            />
            <h3>{t('推定1RM（kg）')}</h3>
            <LineChart
              points={graphData.map((d) => ({ label: d.date, value: d.best }))}
              unit="kg"
              color="#f472b6"
            />
            <h3>{t('総ボリューム（重量×回数の合計）')}</h3>
            <LineChart
              points={graphData.map((d) => ({ label: d.date, value: d.volume }))}
              unit=""
              color="#34d399"
            />
          </>
        )}
      </section>

      <div className="chips">
        <button
          className={`chip ${filterPart === 'all' ? 'on' : ''}`}
          onClick={() => setFilterPart('all')}
        >
          {t('すべて')}
        </button>
        {bodyParts.map((p) => (
          <button
            key={p.id}
            className={`chip ${filterPart === p.id ? 'on' : ''}`}
            onClick={() => setFilterPart(p.id)}
          >
            {nm(p)}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="muted">{t('記録がありません。')}</p>}

      {filtered.map((s) => (
        <section className="card" key={s.id}>
          <div className="item-header">
            <h2>
              {formatDateJa(s.date)} {s.bodyPartIds.map(partName).join(t('＋'))}
            </h2>
            <div className="item-tools">
              <button className="ghost" onClick={() => handleEdit(s.id)}>
                {t('修正')}
              </button>
              <button
                className="ghost danger"
                onClick={() => confirm(t('{date} の記録を削除しますか？', { date: s.date })) && deleteSession(s.id)}
              >
                {t('削除')}
              </button>
            </div>
          </div>
          <p className="muted">
            {t('{e}種目 ・ {s}セット', {
              e: s.entries.length,
              s: s.entries.reduce((n, en) => n + en.sets.length, 0),
            })}{' '}
            ・{' '}
            {Math.round(sessionVolume(s)).toLocaleString()}kg
            {formatMinutes(s.finishedAt - s.startedAt) && <> ・ {formatMinutes(s.finishedAt - s.startedAt)}</>}
          </p>
          {s.entries.map((en) => (
            <div key={en.exerciseId} className="history-entry">
              <strong>{exerciseName(en.exerciseId)}</strong>
              <span className="muted">
                {en.sets.map((set) => `${set.weight}kg×${set.reps}`).join('　')}
              </span>
              {en.note && <span className="muted">📝 {en.note}</span>}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
