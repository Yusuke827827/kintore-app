import { useState } from 'react'
import { useData } from '../state/DataContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function suggestTarget(prevSets) {
  if (!prevSets || prevSets.length === 0) return null
  const last = prevSets[prevSets.length - 1]
  return `前回最後のセット ${last.weight}kg × ${last.reps}回 → 重量+2.5kgか、回数+1回か、セット追加を狙いましょう`
}

export default function Record({ bodyPartIds, exerciseIds, onBack, onDone }) {
  const { exercises, getPreviousRecord, addSession } = useData()
  const today = todayStr()

  const [entries, setEntries] = useState(() => {
    const init = {}
    exerciseIds.forEach((id) => {
      init[id] = []
    })
    return init
  })

  function addSet(exerciseId) {
    setEntries((prev) => ({
      ...prev,
      [exerciseId]: [...prev[exerciseId], { weight: '', reps: '' }],
    }))
  }

  function updateSet(exerciseId, index, field, value) {
    setEntries((prev) => {
      const sets = prev[exerciseId].map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
      return { ...prev, [exerciseId]: sets }
    })
  }

  function removeSet(exerciseId, index) {
    setEntries((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].filter((_, i) => i !== index),
    }))
  }

  function handleSave() {
    const sessionEntries = exerciseIds
      .map((id) => ({
        exerciseId: id,
        sets: entries[id]
          .filter((s) => s.weight !== '' && s.reps !== '')
          .map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
      }))
      .filter((e) => e.sets.length > 0)

    addSession({ date: today, bodyPartIds, entries: sessionEntries })
    onDone()
  }

  const hasAnyRecord = exerciseIds.some((id) => entries[id].length > 0)

  return (
    <div className="screen">
      <h1>記録する</h1>

      {exerciseIds.map((id) => {
        const exercise = exercises.find((e) => e.id === id)
        const prev = getPreviousRecord(id, today)
        return (
          <section className="card" key={id}>
            <h2>{exercise?.name}</h2>
            {prev ? (
              <p className="muted">
                前回（{prev.date}）：
                {prev.sets.map((s) => `${s.weight}kg×${s.reps}回`).join('　')}
              </p>
            ) : (
              <p className="muted">前回の記録はまだありません。</p>
            )}
            {prev && <p className="target">{suggestTarget(prev.sets)}</p>}

            {entries[id].map((s, i) => (
              <div className="set-row" key={i}>
                <span className="set-index">{i + 1}セット目</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="重量kg"
                  value={s.weight}
                  onChange={(e) => updateSet(id, i, 'weight', e.target.value)}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="回数"
                  value={s.reps}
                  onChange={(e) => updateSet(id, i, 'reps', e.target.value)}
                />
                <button className="icon-button" onClick={() => removeSet(id, i)}>
                  ×
                </button>
              </div>
            ))}
            <button className="secondary" onClick={() => addSet(id)}>
              セット追加
            </button>
          </section>
        )
      })}

      <div className="row">
        <button className="secondary" onClick={onBack}>
          戻る
        </button>
        <button className="primary" disabled={!hasAnyRecord} onClick={handleSave}>
          この内容で保存する
        </button>
      </div>
    </div>
  )
}
