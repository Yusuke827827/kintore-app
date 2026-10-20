import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import LineChart from '../components/LineChart'
import { formatDateJa, formatMinutes, todayStr } from '../lib/date'
import { e1rm, sessionVolume, sortSessionsDesc } from '../lib/stats'

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
          {year}年{month + 1}月 <span className="muted">{monthCount}日</span>
        </h2>
        <button className="ghost" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
          ›
        </button>
      </div>
      <div className="calendar">
        {['月', '火', '水', '木', '金', '土', '日'].map((w) => (
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
  const { sessions, bodyParts, exercises, deleteSession, editSession, activeWorkout } = useData()
  const [filterPart, setFilterPart] = useState('all')
  const [graphExerciseId, setGraphExerciseId] = useState('')

  const sorted = useMemo(() => sortSessionsDesc(sessions), [sessions])
  const filtered = sorted.filter(
    (s) => filterPart === 'all' || s.bodyPartIds.includes(filterPart)
  )

  function partName(id) {
    return bodyParts.find((p) => p.id === id)?.name ?? id
  }
  function exerciseName(id) {
    return exercises.find((e) => e.id === id)?.name ?? '（削除された種目）'
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
    if (activeWorkout && !confirm('記録中のトレーニングを破棄して、この記録を修正しますか？')) return
    editSession(id)
    onOpenWorkout()
  }

  return (
    <div className="screen">
      <h1>履歴</h1>

      <MonthCalendar sessions={sessions} />

      <section className="card">
        <h2>種目の推移</h2>
        <select value={graphExerciseId} onChange={(e) => setGraphExerciseId(e.target.value)}>
          <option value="">種目を選ぶ</option>
          {exercisesWithRecord.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        {graphExerciseId && graphData.length > 0 && (
          <>
            <p className="muted" style={{ marginTop: 8 }}>
              自己ベスト：最大 {Math.max(...graphData.map((d) => d.weight))}kg ・ 推定1RM{' '}
              {Math.max(...graphData.map((d) => d.best))}kg
            </p>
            <h3>最大重量（kg）</h3>
            <LineChart
              points={graphData.map((d) => ({ label: d.date, value: d.weight }))}
              unit="kg"
              color="#818cf8"
            />
            <h3>推定1RM（kg）</h3>
            <LineChart
              points={graphData.map((d) => ({ label: d.date, value: d.best }))}
              unit="kg"
              color="#f472b6"
            />
            <h3>総ボリューム（重量×回数の合計）</h3>
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
          すべて
        </button>
        {bodyParts.map((p) => (
          <button
            key={p.id}
            className={`chip ${filterPart === p.id ? 'on' : ''}`}
            onClick={() => setFilterPart(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="muted">記録がありません。</p>}

      {filtered.map((s) => (
        <section className="card" key={s.id}>
          <div className="item-header">
            <h2>
              {formatDateJa(s.date)} {s.bodyPartIds.map(partName).join('＋')}
            </h2>
            <div className="item-tools">
              <button className="ghost" onClick={() => handleEdit(s.id)}>
                修正
              </button>
              <button
                className="ghost danger"
                onClick={() => confirm(`${s.date} の記録を削除しますか？`) && deleteSession(s.id)}
              >
                削除
              </button>
            </div>
          </div>
          <p className="muted">
            {s.entries.length}種目 ・ {s.entries.reduce((n, en) => n + en.sets.length, 0)}セット ・{' '}
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
