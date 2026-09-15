import { useState } from 'react'
import { useData } from '../state/DataContext'

const GROUP_LABEL = { upper: '上半身', lower: '下半身', core: '体幹' }

export default function Master() {
  const {
    bodyParts,
    exercises,
    addBodyPart,
    deleteBodyPart,
    addExercise,
    toggleExerciseActive,
    deleteExercise,
  } = useData()

  const [newPartName, setNewPartName] = useState('')
  const [newPartGroup, setNewPartGroup] = useState('upper')

  const [exFilter, setExFilter] = useState('all')
  const [newExName, setNewExName] = useState('')
  const [newExPart, setNewExPart] = useState(bodyParts[0]?.id ?? '')
  const [newExEquipment, setNewExEquipment] = useState('')
  const [newExType, setNewExType] = useState('compound')

  function handleAddPart() {
    if (!newPartName.trim()) return
    addBodyPart(newPartName.trim(), newPartGroup)
    setNewPartName('')
  }

  function handleAddExercise() {
    if (!newExName.trim() || !newExPart) return
    addExercise({
      name: newExName.trim(),
      bodyPartId: newExPart,
      equipment: newExEquipment.trim() || 'その他',
      type: newExType,
    })
    setNewExName('')
    setNewExEquipment('')
  }

  const visibleExercises = exercises.filter(
    (e) => exFilter === 'all' || e.bodyPartId === exFilter
  )

  return (
    <div className="screen">
      <h1>マスタ管理</h1>

      <section className="card">
        <h2>部位</h2>
        <ul className="plain-list">
          {bodyParts.map((p) => (
            <li key={p.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {p.name}
                <span className="tag">{GROUP_LABEL[p.group] ?? p.group}</span>
              </span>
              <button className="icon-button" onClick={() => deleteBodyPart(p.id)}>
                削除
              </button>
            </li>
          ))}
        </ul>
        <div className="row">
          <input
            placeholder="新しい部位名"
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
          />
          <select value={newPartGroup} onChange={(e) => setNewPartGroup(e.target.value)}>
            <option value="upper">上半身</option>
            <option value="lower">下半身</option>
            <option value="core">体幹</option>
          </select>
          <button className="secondary" onClick={handleAddPart}>
            追加
          </button>
        </div>
      </section>

      <section className="card">
        <h2>種目</h2>
        <label>
          部位で絞り込み：
          <select value={exFilter} onChange={(e) => setExFilter(e.target.value)}>
            <option value="all">すべて</option>
            {bodyParts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <ul className="plain-list">
          {visibleExercises.map((e) => (
            <li key={e.id} className="row" style={{ justifyContent: 'space-between' }}>
              <label className="option">
                <input
                  type="checkbox"
                  checked={e.active}
                  onChange={() => toggleExerciseActive(e.id)}
                />
                {e.name}
                <span className="tag">{e.equipment}</span>
              </label>
              <button className="icon-button" onClick={() => deleteExercise(e.id)}>
                削除
              </button>
            </li>
          ))}
        </ul>

        <h3>種目を追加</h3>
        <div className="row">
          <input
            placeholder="種目名"
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
          />
          <select value={newExPart} onChange={(e) => setNewExPart(e.target.value)}>
            {bodyParts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <input
            placeholder="使用設備（例：ダンベル）"
            value={newExEquipment}
            onChange={(e) => setNewExEquipment(e.target.value)}
          />
          <select value={newExType} onChange={(e) => setNewExType(e.target.value)}>
            <option value="compound">コンパウンド</option>
            <option value="isolation">アイソレーション</option>
          </select>
          <button className="secondary" onClick={handleAddExercise}>
            追加
          </button>
        </div>
      </section>
    </div>
  )
}
