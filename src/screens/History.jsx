import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import LineChart from '../components/LineChart'

export default function History() {
  const { sessions, bodyParts, exercises, deleteSession } = useData()
  const [filterPart, setFilterPart] = useState('all')
  const [graphExerciseId, setGraphExerciseId] = useState('')

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [sessions]
  )

  const filtered = sorted.filter(
    (s) => filterPart === 'all' || s.bodyPartIds.includes(filterPart)
  )

  function partName(id) {
    return bodyParts.find((p) => p.id === id)?.name ?? id
  }
  function exerciseName(id) {
    return exercises.find((e) => e.id === id)?.name ?? id
  }

  // 記録が1件以上ある種目だけを、グラフの選択肢にする
  const exercisesWithRecord = useMemo(() => {
    const ids = new Set()
    sessions.forEach((s) => s.entries.forEach((en) => ids.add(en.exerciseId)))
    return exercises.filter((e) => ids.has(e.id))
  }, [sessions, exercises])

  const graphData = useMemo(() => {
    if (!graphExerciseId) return []
    return [...sessions]
      .filter((s) => s.entries.some((en) => en.exerciseId === graphExerciseId))
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((s) => {
        const entry = s.entries.find((en) => en.exerciseId === graphExerciseId)
        const weight = Math.max(...entry.sets.map((set) => set.weight))
        const volume = entry.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
        return { date: s.date, weight, volume }
      })
  }, [sessions, graphExerciseId])

  return (
    <div className="screen">
      <h1>履歴</h1>

      <section className="card">
        <h2>種目の推移グラフ</h2>
        <select
          value={graphExerciseId}
          onChange={(e) => setGraphExerciseId(e.target.value)}
        >
          <option value="">種目を選ぶ</option>
          {exercisesWithRecord.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        {graphExerciseId && graphData.length === 0 && (
          <p className="muted">この種目の記録はまだありません。</p>
        )}

        {graphExerciseId && graphData.length > 0 && (
          <>
            <h3>最大重量（kg）</h3>
            <LineChart
              points={graphData.map((d) => ({ label: d.date, value: d.weight }))}
              unit="kg"
              color="#818cf8"
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

      <div className="card">
        <label>
          部位で絞り込み：
          <select value={filterPart} onChange={(e) => setFilterPart(e.target.value)}>
            <option value="all">すべて</option>
            {bodyParts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 && <p className="muted">記録がありません。</p>}

      {filtered.map((s) => (
        <section className="card" key={s.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>
              {s.date}（{s.bodyPartIds.map(partName).join('＋')}）
            </h2>
            <button className="icon-button" onClick={() => deleteSession(s.id)}>
              削除
            </button>
          </div>
          {s.entries.map((en) => (
            <div key={en.exerciseId} className="history-entry">
              <strong>{exerciseName(en.exerciseId)}</strong>
              <span className="muted">
                {en.sets.map((set) => `${set.weight}kg×${set.reps}回`).join('　')}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
