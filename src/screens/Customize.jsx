import { useState } from 'react'
import { useData } from '../state/DataContext'
import MenuEditor from '../components/MenuEditor'
import { eq, nm, t } from '../i18n'
import { usePremium } from '../state/PremiumContext'
import { FREE_LIMITS } from '../lib/pricing'
import { ROUTINE_COLORS, nextRoutineColor, routineColor, routineOfSession } from '../lib/routineColors'
import { MUSCLES, exercisesForMuscle, musclesOf, musclesOfMenu } from '../lib/muscles'
import { isCardio } from '../lib/stats'
import { daysAgoLabel, todayStr } from '../lib/date'
import Icon from '../components/Icon'

const GROUPS = [
  { key: 'upper', label: '上半身' },
  { key: 'lower', label: '下半身' },
  { key: 'core', label: '体幹' },
  { key: 'other', label: 'その他' },
]
const GROUP_LABEL = Object.fromEntries(GROUPS.map((g) => [g.key, g.label]))
const TYPE_LABEL = { compound: 'コンパウンド', isolation: 'アイソレーション', cardio: '有酸素' }
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
  const [type, setType] = useState(initial?.type ?? (bodyPartId === 'cardio' ? 'cardio' : 'compound'))

  // 部位を「有酸素」にしたら種類も有酸素に（時間・距離・kcalで記録する）
  function changePart(id) {
    setBodyPartId(id)
    if (id === 'cardio') setType('cardio')
    else if (type === 'cardio') setType('compound')
  }
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '')
  const [muscles, setMuscles] = useState(() => musclesOf(initial).p)
  const partMuscles = MUSCLES.filter((m) => m.part === bodyPartId)
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
        <select value={bodyPartId} onChange={(e) => changePart(e.target.value)}>
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
          <option value="cardio">{t('有酸素（時間・距離で記録）')}</option>
        </select>
      </label>
      {partMuscles.length > 0 && type !== 'cardio' && (
        <div className="field-block">
          <span className="muted">{t('主に効く筋肉（「筋肉で選ぶ」に出ます）')}</span>
          <div className="chips">
            {partMuscles.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`chip small ${muscles.includes(m.id) ? 'on' : ''}`}
                onClick={() => setMuscles(muscles.includes(m.id) ? muscles.filter((x) => x !== m.id) : [...muscles, m.id])}
              >
                {t(m.name)}
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        className="grow"
        type="url"
        inputMode="url"
        placeholder={t('フォーム動画のURL（YouTubeなど・任意）')}
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
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
            onSave({
              name: keepName(initial, name.trim()),
              bodyPartId,
              equipment,
              type,
              videoUrl: videoUrl.trim(),
              // 部位を変えたときは、その部位の筋肉だけ残す
              muscles: muscles.filter((id) => MUSCLES.find((m) => m.id === id)?.part === bodyPartId),
            })
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
                    {e.videoUrl && <> ・ ▶</>}
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
  const { addRoutine, updateRoutine, deleteRoutine, routines } = useData()
  const [name, setName] = useState(routine?.name ?? '')
  const [color, setColor] = useState(() => (routine ? routineColor(routine, routines) : nextRoutineColor(routines)))
  const [menu, setMenu] = useState({
    exerciseIds: routine?.exerciseIds ?? [],
    targets: routine?.targets ?? {},
  })

  function save() {
    if (routine) updateRoutine(routine.id, { name: name.trim(), ...menu, color })
    else {
      const id = addRoutine(name.trim(), menu.exerciseIds, menu.targets)
      updateRoutine(id, { color })
    }
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
      <h3>{t('色')}</h3>
      <div className="swatches">
        {ROUTINE_COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${color === c ? 'on' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={c}
          />
        ))}
      </div>
      <MenuEditor value={menu} onChange={setMenu} />
      <MuscleAdd menu={menu} onChange={setMenu} />
      <div className="row">
        <button className="secondary" onClick={onDone}>
          {t('キャンセル')}
        </button>
        <button
          className="primary"
          disabled={!name.trim() || menu.exerciseIds.length === 0}
          onClick={save}
        >
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
    </section>
  )
}

// 筋肉を選んで、その筋肉に効く種目をマイセットに足す
function MuscleAdd({ menu, onChange }) {
  const { exercises, sessions, gym } = useData()
  const [muscle, setMuscle] = useState(null)
  const add = (ex) => {
    if (menu.exerciseIds.includes(ex.id)) return
    onChange({
      exerciseIds: [...menu.exerciseIds, ex.id],
      targets: { ...menu.targets, [ex.id]: { sets: 3, reps: ex.type === 'isolation' ? 12 : 10 } },
    })
  }
  return (
    <div className="muscle-add">
      <h3>{t('筋肉から種目を追加')}</h3>
      <div className="chips">
        {MUSCLES.map((m) => (
          <button key={m.id} className={`chip small ${muscle === m.id ? 'on' : ''}`} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>
            {t(m.name)}
          </button>
        ))}
      </div>
      {muscle && (
        <ul className="plain-list">
          {exercisesForMuscle(muscle, { exercises, sessions, gym }).map(({ exercise: ex, primary }) => {
            const on = menu.exerciseIds.includes(ex.id)
            return (
              <li key={ex.id} className="row-between">
                <span>
                  <span className={`muscle-tag ${primary ? 'main' : ''}`}>{primary ? t('メイン') : t('補助')}</span> {nm(ex)}
                </span>
                <button className={`ghost ${on ? 'on' : ''}`} disabled={on} onClick={() => add(ex)} aria-label={t('追加')}>
                  <Icon name={on ? 'check' : 'plus'} size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// マイセット1つ分のカード：種目・セット数・回数、鍛える筋肉、最後にやった日。ここから始める・編集・複製
function RoutineCard({ routine: r, onEdit, onStart }) {
  const { routines, allExercises, sessions, moveRoutine, addRoutine, updateRoutine } = useData()
  const { gate } = usePremium()
  const color = routineColor(r, routines)
  const done = sessions.filter((s) => routineOfSession(s, routines)?.id === r.id)
  const lastDate = done.map((s) => s.date).sort().pop()
  const muscles = musclesOfMenu(r.exerciseIds, allExercises)
  const totalSets = r.exerciseIds.reduce((a, id) => a + (r.targets?.[id]?.sets ?? (isCardio(allExercises.find((e) => e.id === id)) ? 0 : 3)), 0)
  const cardioMin = r.exerciseIds.reduce((a, id) => a + (isCardio(allExercises.find((e) => e.id === id)) ? r.targets?.[id]?.min ?? 30 : 0), 0)
  const minutes = Math.round(totalSets * 2.5 + cardioMin)
  return (
    <section className="card routine-card" style={{ '--rc': color }}>
      <div className="row-between">
        <h2 className="with-icon">
          <i className="routine-dot" style={{ background: color }} />
          {r.name}
        </h2>
        <div className="item-tools">
          <MoveButtons onMove={(dir) => moveRoutine(r.id, dir)} />
        </div>
      </div>
      <p className="muted">
        {t('{n}種目・{s}セット・約{m}分', { n: r.exerciseIds.length, s: totalSets, m: minutes })}
        {' ・ '}
        {lastDate ? t('最後 {d}（{c}回）', { d: daysAgoLabel(lastDate, todayStr()), c: done.length }) : t('まだやっていません')}
      </p>
      {muscles.length > 0 && (
        <div className="muscle-chips">
          {muscles.map((m) => (
            <span key={m.id}>{t(m.name)}</span>
          ))}
        </div>
      )}
      <ol className="routine-ex">
        {r.exerciseIds.map((id) => {
          const ex = allExercises.find((e) => e.id === id)
          const tg = r.targets?.[id]
          return (
            <li key={id}>
              <span>{ex ? nm(ex) : t('（削除された種目）')}</span>
              <small>{isCardio(ex) ? t('{m}分', { m: tg?.min ?? 30 }) : `${tg?.sets ?? 3}×${tg?.reps ?? 10}`}</small>
            </li>
          )
        })}
      </ol>
      <div className="row">
        {onStart && (
          <button className="primary" onClick={() => onStart(r)}>
            {t('始める')}
          </button>
        )}
        <button className="secondary" onClick={onEdit}>
          {t('編集')}
        </button>
        <button
          className="secondary"
          onClick={() => {
            if (!gate('routines', routines.length)) return
            const id = addRoutine(t('{name}のコピー', { name: r.name }), r.exerciseIds, r.targets)
            updateRoutine(id, { color: nextRoutineColor(routines) })
          }}
        >
          {t('複製')}
        </button>
      </div>
    </section>
  )
}

function RoutinesTab({ onStartRoutine }) {
  const { routines } = useData()
  const { premium, gate } = usePremium()
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
    <>
      <p className="muted">
        {t('決まったメニューを登録しておくと、ホームからワンタップで始められます。')}
      </p>
      {routines.length === 0 && <p className="muted">{t('まだマイセットがありません。')}</p>}
      {routines.map((r) => (
        <RoutineCard key={r.id} routine={r} onEdit={() => setEditing(r.id)} onStart={onStartRoutine} />
      ))}
      <button
        className="secondary wide"
        onClick={() => gate('routines', routines.length) && setEditing('new')}
      >
        {t('＋ マイセットを作る')}
      </button>
      {!premium && (
        <p className="muted">
          {t('無料版はマイセット{n}つまで（{c}/{n}）。プレミアムで無制限になります。', {
            n: FREE_LIMITS.routines,
            c: routines.length,
          })}
        </p>
      )}
    </>
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

export default function Customize({ initialTab = 'parts', onBack, onStartRoutine }) {
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
      {tab === 'routines' && <RoutinesTab onStartRoutine={onStartRoutine} />}
      {tab === 'trash' && <TrashTab />}
    </div>
  )
}
