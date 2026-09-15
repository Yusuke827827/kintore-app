import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'

export default function History() {
  const { sessions, bodyParts, exercises, deleteSession } = useData()
  const [filterPart, setFilterPart] = useState('all')

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

  return (
    <div className="screen">
      <h1>履歴</h1>

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
