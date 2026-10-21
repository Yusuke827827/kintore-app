import { useState } from 'react'
import { useData } from '../state/DataContext'

// 種目を選ぶシート。タップするたびに追加され、閉じるまで続けて選べる。
export default function ExercisePicker({ preferPartIds = [], addedIds = [], onPick, onClose }) {
  const { bodyParts, exercises, addExercise } = useData()
  const [partId, setPartId] = useState(preferPartIds[0] ?? 'all')
  const [query, setQuery] = useState('')

  const q = query.trim()
  const list = exercises.filter(
    (e) =>
      e.active &&
      (q ? e.name.includes(q) || e.equipment.includes(q) : partId === 'all' || e.bodyPartId === partId)
  )
  const added = new Set(addedIds)

  function handleCreate() {
    const part = partId === 'all' ? bodyParts[0]?.id : partId
    if (!q || !part) return
    const id = addExercise({ name: q, bodyPartId: part, equipment: 'その他', type: 'compound' })
    onPick(id)
    setQuery('')
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>種目を追加</h2>
          <button className="primary small" onClick={onClose}>
            完了
          </button>
        </div>
        <input
          className="search"
          placeholder="種目名・器具で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!q && (
          <div className="chips">
            <button className={`chip ${partId === 'all' ? 'on' : ''}`} onClick={() => setPartId('all')}>
              すべて
            </button>
            {bodyParts.map((p) => (
              <button
                key={p.id}
                className={`chip ${partId === p.id ? 'on' : ''}`}
                onClick={() => setPartId(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <ul className="pick-list">
          {list.map((e) => (
            <li key={e.id}>
              <button className={added.has(e.id) ? 'added' : ''} onClick={() => onPick(e.id)}>
                <span>{e.name}</span>
                <span className="tag">{added.has(e.id) ? '追加済み ✓' : e.equipment}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && q && (
            <li>
              <button onClick={handleCreate}>
                <span>「{q}」を新しい種目として作って追加</span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
