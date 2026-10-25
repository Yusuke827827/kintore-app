import { useState } from 'react'
import { useData } from '../state/DataContext'
import ExercisePicker from '../components/ExercisePicker'
import { eq, nm, t } from '../i18n'

const GROUPS = [
  { key: 'upper', label: '上半身' },
  { key: 'lower', label: '下半身' },
  { key: 'core', label: '体幹' },
  { key: 'other', label: 'その他' },
]
const GROUP_LABEL = Object.fromEntries(GROUPS.map((g) => [g.key, g.label]))
const TYPE_LABEL = { compound: 'コンパウンド', isolation: 'アイソレーション' }
const EQUIPMENTS = ['マシン', 'バーベル', 'ダンベル', 'スミスマシン', 'ケーブル', '自重', 'その他']

function MoveButtons({ onMove }) {
  return (
    <>
      <button className="ghost" onClick={() => onMove(-1)} aria-label={t('上へ')}>
        ↑
      </button>
      <button className="ghost" onClick={() => onMove(1)} aria-label={t('下へ')}>
        ↓
      </button>
    </>
  )
}

// ---- 部位 ----
// 英語表示のまま名前を変えずに保存したときは、元の名前を残す
function keepName(initial, name) {
  return initial?.name && name === nm(initial) ? initial.name : name
}

function PartForm({ initial, onSave, onCancel, saveLabel }) {
  const [name, setName] = useState(initial?.name ? nm(initial) : '')
  const [group, setGroup] = useState(initial?.group ?? 'upper')
  return (
    <div className="edit-form">
      <input
        className="grow"
        placeholder={t('部位名（例：前腕、お尻、有酸素）')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <div className="chips">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className={`chip ${group === g.key ? 'on' : ''}`}
            onClick={() => setGroup(g.key)}
          >
            {t(g.label)}
          </button>
        ))}
      </div>
      <div className="row">
        {onCancel && (
          <button className="secondary" onClick={onCancel}>
            {t('キャンセル')}
          </button>
        )}
        <button
          className="primary"
          disabled={!name.trim()}
          onClick={() => onSave({ name: keepName(initial, name.trim()), group })}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  )
}

function PartsTab() {
  const { bodyParts, exercises, addBodyPart, updateBodyPart, moveBodyPart, deleteBodyPart } =
    useData()
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)

  return (
    <>
      <section className="card">
        <p className="muted">{t('ホーム画面に出る部位です。↑↓で並び順を変えられます。')}</p>
        <ul className="plain-list">
          {bodyParts.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <PartForm
                  initial={p}
                  saveLabel={t('保存')}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => {
                    updateBodyPart(p.id, patch)
                    setEditingId(null)
                  }}
                />
              </li>
            ) : (
              <li key={p.id} className="row-between">
                <button className="edit-main" onClick={() => setEditingId(p.id)}>
                  <strong>{nm(p)}</strong>
                  <span className="muted">
                    {t(GROUP_LABEL[p.group] ?? p.group)} ・{' '}
                    {t('種目 {n}', { n: exercises.filter((e) => e.bodyPartId === p.id).length })}
                  </span>
                </button>
                <div className="item-tools">
                  <MoveButtons onMove={(dir) => moveBodyPart(p.id, dir)} />
                  <button
                    className="ghost danger"
                    onClick={() =>
                      confirm(
                        t(
                          '「{name}」を削除しますか？\nこの部位の種目もホームや種目選びに出なくなります（過去の記録は残り、あとで復元できます）。',
                          { name: nm(p) }
                        )
                      ) && deleteBodyPart(p.id)
                    }
                  >
                    {t('削除')}
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>

      <section className="card">
        {adding ? (
          <>
            <h2>{t('部位を追加')}</h2>
            <PartForm
              saveLabel={t('追加')}
              onCancel={() => setAdding(false)}
              onSave={({ name, group }) => {
                addBodyPart(name, group)
                setAdding(false)
              }}
            />
          </>
        ) : (
          <button className="secondary wide" onClick={() => setAdding(true)}>
            {t('＋ 部位を追加')}
          </button>
        )}
      </section>
    </>
  )
}

// ---- 種目 ----
function ExerciseForm({ initial, bodyParts, onSave, onCancel, saveLabel }) {
  const [name, setName] = useState(initial?.name ? nm(initial) : '')
  const [bodyPartId, setBodyPartId] = useState(initial?.bodyPartId ?? bodyParts[0]?.id ?? '')
  const [equipment, setEquipment] = useState(initial?.equipment ?? 'マシン')
  const [type, setType] = useState(initial?.type ?? 'compound')
  const equipmentOptions = EQUIPMENTS.includes(equipment) ? EQUIPMENTS : [...EQUIPMENTS, equipment]

  return (
    <div className="edit-form">
      <input
        className="grow"
        placeholder={t('種目名（例：ヒップアブダクション）')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <label className="field">
        {t('部位')}
        <select value={bodyPartId} onChange={(e) => setBodyPartId(e.target.value)}>
          {bodyParts.map((p) => (
            <option key={p.id} value={p.id}>
              {nm(p)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t('器具')}
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          {equipmentOptions.map((o) => (
            <option key={o} value={o}>
              {eq(o)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t('種類')}
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="compound">{t('コンパウンド（多関節）')}</option>
          <option value="isolation">{t('アイソレーション（単関節）')}</option>
        </select>
      </label>
      <div className="row">
        {onCancel && (
          <button className="secondary" onClick={onCancel}>
            {t('キャンセル')}
          </button>
        )}
        <button
          className="primary"
          disabled={!name.trim() || !bodyPartId}
          onClick={() =>
            onSave({ name: keepName(initial, name.trim()), bodyPartId, equipment, type })
          }
        >
          {saveLabel}
        </button>
      </div>
    </div>
  )
}

function ExercisesTab() {
  const {
    bodyParts,
    exercises,
    sessions,
    addExercise,
    updateExercise,
    moveExercise,
    toggleExerciseActive,
    deleteExercise,
  } = useData()
  const [partId, setPartId] = useState(bodyParts[0]?.id ?? '')
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)

  const list = exercises.filter((e) => e.bodyPartId === partId)
  const recordCount = (id) =>
    sessions.filter((s) => s.entries.some((en) => en.exerciseId === id)).length

  return (
    <>
      <div className="chips">
        {bodyParts.map((p) => (
          <button
            key={p.id}
            className={`chip ${partId === p.id ? 'on' : ''}`}
            onClick={() => {
              setPartId(p.id)
              setEditingId(null)
            }}
          >
            {nm(p)}
          </button>
        ))}
      </div>

      <section className="card">
        <p className="muted">
          {t('名前をタップで編集。チェックを外すと種目選びに出なくなります（記録はそのまま）。')}
        </p>
        {list.length === 0 && <p className="muted">{t('まだ種目がありません。')}</p>}
        <ul className="plain-list">
          {list.map((e) =>
            editingId === e.id ? (
              <li key={e.id}>
                <ExerciseForm
                  initial={e}
                  bodyParts={bodyParts}
                  saveLabel={t('保存')}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => {
                    updateExercise(e.id, patch)
                    setEditingId(null)
                  }}
                />
              </li>
            ) : (
              <li key={e.id} className={`row-between ${e.active ? '' : 'inactive'}`}>
                <input
                  type="checkbox"
                  checked={e.active}
                  onChange={() => toggleExerciseActive(e.id)}
                  aria-label={t('種目選びに表示する')}
                />
                <button className="edit-main" onClick={() => setEditingId(e.id)}>
                  <strong>{nm(e)}</strong>
                  <span className="muted">
                    {eq(e.equipment)} ・ {t(TYPE_LABEL[e.type] ?? e.type)}
                  </span>
                </button>
                <div className="item-tools">
                  <MoveButtons onMove={(dir) => moveExercise(e.id, dir)} />
                  <button
                    className="ghost danger"
                    onClick={() => {
                      const n = recordCount(e.id)
                      const msg = n
                        ? t('「{name}」を削除しますか？\n過去の記録（{n}回分）は残り、あとで復元できます。', {
                            name: nm(e),
                            n,
                          })
                        : t('「{name}」を削除しますか？', { name: nm(e) })
                      if (confirm(msg)) deleteExercise(e.id)
                    }}
                  >
                    {t('削除')}
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>

      <section className="card">
        {adding ? (
          <>
            <h2>{t('種目を追加')}</h2>
            <ExerciseForm
              key={partId}
              initial={{ bodyPartId: partId }}
              bodyParts={bodyParts}
              saveLabel={t('追加')}
              onCancel={() => setAdding(false)}
              onSave={(ex) => {
                addExercise(ex)
                setPartId(ex.bodyPartId)
                setAdding(false)
              }}
            />
          </>
        ) : (
          <button
            className="secondary wide"
            onClick={() => setAdding(true)}
            disabled={bodyParts.length === 0}
          >
            {t('＋ 種目を追加')}
          </button>
        )}
      </section>
    </>
  )
}

// ---- マイセット ----
function RoutineEditor({ routine, onDone }) {
  const { allExercises, addRoutine, updateRoutine, deleteRoutine } = useData()
  const [name, setName] = useState(routine?.name ?? '')
  const [ids, setIds] = useState(routine?.exerciseIds ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)

  function exName(id) {
    const ex = allExercises.find((e) => e.id === id)
    return ex ? nm(ex) : t('（削除された種目）')
  }
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    setIds(next)
  }
  function save() {
    if (routine) updateRoutine(routine.id, { name: name.trim(), exerciseIds: ids })
    else addRoutine(name.trim(), ids)
    onDone()
  }

  return (
    <section className="card">
      <h2>{routine ? t('マイセットを編集') : t('新しいマイセット')}</h2>
      <input
        className="search"
        placeholder={t('名前（例：胸の日、Push、脚＋腹筋）')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <ul className="plain-list">
        {ids.map((id, i) => (
          <li key={`${id}-${i}`} className="row-between">
            <span>
              {i + 1}. {exName(id)}
            </span>
            <div className="item-tools">
              <MoveButtons onMove={(dir) => move(i, dir)} />
              <button
                className="ghost danger"
                onClick={() => setIds(ids.filter((_, k) => k !== i))}
                aria-label={t('外す')}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button className="secondary wide" onClick={() => setPickerOpen(true)}>
        {t('＋ 種目を追加')}
      </button>
      <div className="row">
        <button className="secondary" onClick={onDone}>
          {t('キャンセル')}
        </button>
        <button className="primary" disabled={!name.trim() || ids.length === 0} onClick={save}>
          {t('保存')}
        </button>
      </div>
      {routine && (
        <button
          className="link danger"
          onClick={() => {
            if (!confirm(t('「{name}」を削除しますか？', { name: routine.name }))) return
            deleteRoutine(routine.id)
            onDone()
          }}
        >
          {t('このマイセットを削除')}
        </button>
      )}
      {pickerOpen && (
        <ExercisePicker
          addedIds={ids}
          onPick={(id) => setIds((cur) => (cur.includes(id) ? cur : [...cur, id]))}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  )
}

function RoutinesTab() {
  const { routines, allExercises, moveRoutine } = useData()
  const [editing, setEditing] = useState(null) // routine id | 'new' | null

  if (editing) {
    return (
      <RoutineEditor
        key={editing}
        routine={routines.find((r) => r.id === editing) ?? null}
        onDone={() => setEditing(null)}
      />
    )
  }

  return (
    <section className="card">
      <p className="muted">
        {t('決まったメニューを登録しておくと、ホームからワンタップで始められます。')}
      </p>
      {routines.length === 0 && <p className="muted">{t('まだマイセットがありません。')}</p>}
      <ul className="plain-list">
        {routines.map((r) => (
          <li key={r.id} className="row-between">
            <button className="edit-main" onClick={() => setEditing(r.id)}>
              <strong>{r.name}</strong>
              <span className="muted">
                {r.exerciseIds
                  .map((id) => nm(allExercises.find((e) => e.id === id)))
                  .filter(Boolean)
                  .join(t('・'))}
              </span>
            </button>
            <div className="item-tools">
              <MoveButtons onMove={(dir) => moveRoutine(r.id, dir)} />
            </div>
          </li>
        ))}
      </ul>
      <button className="secondary wide" onClick={() => setEditing('new')}>
        {t('＋ マイセットを作る')}
      </button>
    </section>
  )
}

// ---- 削除したもの ----
function TrashTab() {
  const { allBodyParts, allExercises, restoreBodyPart, restoreExercise, restoreDefaults } =
    useData()
  const parts = allBodyParts.filter((p) => p.deleted)
  const exs = allExercises.filter((e) => e.deleted)
  const partName = (id) => nm(allBodyParts.find((p) => p.id === id))

  return (
    <>
      <section className="card">
        <h2>{t('削除した部位・種目')}</h2>
        {parts.length === 0 && exs.length === 0 && (
          <p className="muted">{t('削除したものはありません。')}</p>
        )}
        <ul className="plain-list">
          {parts.map((p) => (
            <li key={p.id} className="row-between">
              <span>
                {nm(p)} <span className="tag">{t('部位')}</span>
              </span>
              <button className="ghost" onClick={() => restoreBodyPart(p.id)}>
                {t('復元')}
              </button>
            </li>
          ))}
          {exs.map((e) => (
            <li key={e.id} className="row-between">
              <span>
                {nm(e)} <span className="tag">{partName(e.bodyPartId)}</span>
              </span>
              <button className="ghost" onClick={() => restoreExercise(e.id)}>
                {t('復元')}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2>{t('最初の状態に戻す')}</h2>
        <p className="muted">
          {t('最初から入っていた部位・種目で、消したものを元に戻します。自分で追加したものや記録はそのままです。')}
        </p>
        <button
          className="secondary wide"
          onClick={() => confirm(t('最初から入っていた部位・種目を復元しますか？')) && restoreDefaults()}
        >
          {t('初期の部位・種目を復元')}
        </button>
      </section>
    </>
  )
}

const TABS = [
  { key: 'parts', label: '部位' },
  { key: 'exercises', label: '種目' },
  { key: 'routines', label: 'マイセット' },
  { key: 'trash', label: '削除済み' },
]

export default function Customize({ initialTab = 'parts', onBack }) {
  const [tab, setTab] = useState(initialTab)
  return (
    <div className="screen">
      <div className="item-header">
        <h1>{t('カスタマイズ')}</h1>
        <button className="ghost" onClick={onBack}>
          {t('‹ 戻る')}
        </button>
      </div>
      <div className="segmented">
        {TABS.map((x) => (
          <button key={x.key} className={tab === x.key ? 'on' : ''} onClick={() => setTab(x.key)}>
            {t(x.label)}
          </button>
        ))}
      </div>
      {tab === 'parts' && <PartsTab />}
      {tab === 'exercises' && <ExercisesTab />}
      {tab === 'routines' && <RoutinesTab />}
      {tab === 'trash' && <TrashTab />}
    </div>
  )
}
