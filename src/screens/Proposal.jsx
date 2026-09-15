import { useState } from 'react'
import { useData } from '../state/DataContext'

export default function Proposal({ bodyPartIds, onBack, onConfirm }) {
  const { bodyParts, exercises } = useData()
  const [selected, setSelected] = useState(() => new Set())

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="screen">
      <h1>種目を選ぶ</h1>
      <p className="muted">オンになっている種目だけ表示しています。</p>

      {bodyPartIds.map((partId) => {
        const part = bodyParts.find((p) => p.id === partId)
        const list = exercises.filter((e) => e.bodyPartId === partId && e.active)
        return (
          <section className="card" key={partId}>
            <h2>{part?.name}</h2>
            {list.length === 0 && (
              <p className="muted">有効な種目がありません。マスタ管理から追加してください。</p>
            )}
            <div className="option-list">
              {list.map((e) => (
                <label key={e.id} className="option">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                  {e.name}
                  <span className="tag">{e.equipment}</span>
                </label>
              ))}
            </div>
          </section>
        )
      })}

      <div className="row">
        <button className="secondary" onClick={onBack}>
          戻る
        </button>
        <button
          className="primary"
          disabled={selected.size === 0}
          onClick={() => onConfirm([...selected])}
        >
          このメニューで記録開始（{selected.size}種目）
        </button>
      </div>
    </div>
  )
}
