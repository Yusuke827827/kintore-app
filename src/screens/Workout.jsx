import { useCallback, useState } from 'react'
import { useData } from '../state/DataContext'
import useNow from '../hooks/useNow'
import ExercisePicker from '../components/ExercisePicker'
import RestTimer from '../components/RestTimer'
import { formatClock, formatDateJa } from '../lib/date'
import { nm, t } from '../i18n'
import {
  e1rm,
  emptySet,
  formatSet,
  isCardio,
  isCardioSet,
  isFilledSet,
  isWorkingSet,
  personalBest,
  previousRecord,
  progressionFor,
  toStoredSet,
} from '../lib/stats'
import { cancelRestAlarm, scheduleRestAlarm } from '../lib/restAlarm'

function formatSets(sets) {
  return sets.map(formatSet).join('　')
}

function suggestTarget(prevSets) {
  const working = (prevSets ?? []).filter(isWorkingSet)
  if (working.length === 0) return null
  const last = working[working.length - 1]
  return t('目標：{w1}kg×{r1}回 か {w2}kg×{r2}回', {
    w1: last.weight + 2.5,
    r1: last.reps,
    w2: last.weight,
    r2: last.reps + 1,
  })
}

function round(n) {
  return Math.round(n * 100) / 100
}

// 通常のセットだけを 1, 2, 3… と数える（W・D は番号を使わない）
function setNumber(sets, index) {
  return sets.slice(0, index + 1).filter((x) => !x.type).length
}

// その行に薄く出す「前回の値」（重量アップの対象なら、通常セットの重量を上げて出す）
function placeholderFor(item, index, prev, up) {
  const p = prev?.sets[index]
  if (p) return up && !p.type && !isCardioSet(p) ? { ...p, weight: round(p.weight + up.step) } : p
  for (let i = index - 1; i >= 0; i--) {
    const s = item.sets[i]
    if (isFilledSet(s)) return toStoredSet(s)
  }
  return prev?.sets[prev.sets.length - 1] ?? null
}

export default function Workout({ onFinished }) {
  const {
    activeWorkout: w,
    sessions,
    allExercises: exercises,
    settings,
    updateWorkout,
    addWorkoutExercise,
    finishWorkout,
    discardWorkout,
    addRoutine,
  } = useData()
  const [pickerOpen, setPickerOpen] = useState(() => !!w && w.items.length === 0)
  const [setMenu, setSetMenu] = useState(null) // { itemIndex, setIndex, cardio }
  const isEdit = !!w?.sourceSessionId
  const now = useNow(1000, !!w && !isEdit)

  const setRestEndsAt = useCallback(
    (restEndsAt) => updateWorkout((x) => ({ ...x, restEndsAt })),
    [updateWorkout]
  )

  if (!w) return null

  function updateItem(itemIndex, fn) {
    updateWorkout((x) => ({
      ...x,
      items: x.items.map((it, i) => (i === itemIndex ? fn(it) : it)),
    }))
  }

  function updateSet(itemIndex, setIndex, patch) {
    updateItem(itemIndex, (it) => ({
      ...it,
      sets: it.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
    }))
  }

  function toggleDone(itemIndex, setIndex, placeholder) {
    const set = w.items[itemIndex].sets[setIndex]
    if (set.done) {
      updateSet(itemIndex, setIndex, { done: false })
      return
    }
    // 空の欄は薄く出ている前回の値で埋める
    const fill = (key, fallback = '') =>
      set[key] !== '' && set[key] != null
        ? set[key]
        : placeholder?.[key] != null
          ? String(placeholder[key])
          : fallback
    let next
    if (isCardioSet(set)) {
      next = { min: fill('min'), km: fill('km'), kcal: fill('kcal'), done: true }
      if (next.min === '') return
    } else {
      next = { ...set, weight: fill('weight', '0'), reps: fill('reps'), done: true }
      if (next.reps === '') return
    }
    // 有酸素とウォームアップのあとは休憩タイマーを動かさない
    const startRest = !isCardioSet(set) && set.type !== 'warmup'
    const restEndsAt = startRest ? Date.now() + settings.restSeconds * 1000 : w.restEndsAt
    if (startRest) scheduleRestAlarm(restEndsAt)
    updateWorkout((x) => ({
      ...x,
      restEndsAt,
      items: x.items.map((it, i) =>
        i !== itemIndex
          ? it
          : { ...it, sets: it.sets.map((s, j) => (j === setIndex ? next : s)) }
      ),
    }))
  }

  function addSet(itemIndex) {
    const cardio = isCardio(exercises.find((e) => e.id === w.items[itemIndex].exerciseId))
    updateItem(itemIndex, (it) => ({ ...it, sets: [...it.sets, emptySet(cardio)] }))
  }

  function removeSet(itemIndex, setIndex) {
    updateItem(itemIndex, (it) => ({ ...it, sets: it.sets.filter((_, i) => i !== setIndex) }))
  }

  function removeItem(itemIndex) {
    const name = nm(exercises.find((e) => e.id === w.items[itemIndex].exerciseId))
    if (!confirm(t('「{name}」をこのトレーニングから外しますか？', { name }))) return
    updateWorkout((x) => ({ ...x, items: x.items.filter((_, i) => i !== itemIndex) }))
  }

  function moveItem(itemIndex, dir) {
    updateWorkout((x) => {
      const items = [...x.items]
      const j = itemIndex + dir
      if (j < 0 || j >= items.length) return x
      ;[items[itemIndex], items[j]] = [items[j], items[itemIndex]]
      return { ...x, items }
    })
  }

  function handleFinish() {
    const filled = w.items.reduce((n, it) => n + it.sets.filter(isFilledSet).length, 0)
    if (filled === 0) {
      if (!confirm(t('入力されたセットがありません。記録せずに終了しますか？'))) return
    }
    const prs = []
    let volume = 0
    for (const it of w.items) {
      const best = personalBest(sessions, it.exerciseId, w.sourceSessionId)
      let top = 0
      for (const s of it.sets.filter(isFilledSet).filter(isWorkingSet)) {
        volume += Number(s.weight) * Number(s.reps)
        top = Math.max(top, e1rm(Number(s.weight), Number(s.reps)))
      }
      if (best && top > best.maxE1rm) prs.push(nm(exercises.find((e) => e.id === it.exerciseId)))
    }
    cancelRestAlarm()
    const summary = {
      isEdit,
      sets: filled,
      exercises: w.items.filter((it) => it.sets.some(isFilledSet)).length,
      volume,
      durationMs: isEdit || !w.startedAt ? null : Date.now() - w.startedAt,
      prs,
      exerciseIds: w.items.filter((it) => it.sets.some(isFilledSet)).map((it) => it.exerciseId),
      sessionId: w.sourceSessionId ?? w.id,
    }
    finishWorkout()
    onFinished(filled > 0 ? summary : null)
  }

  function handleDiscard() {
    const msg = isEdit
      ? t('修正内容を破棄しますか？（元の記録はそのまま残ります）')
      : t('このトレーニングを記録せずに破棄しますか？')
    if (!confirm(msg)) return
    cancelRestAlarm()
    discardWorkout()
    onFinished(null)
  }

  function handleSaveRoutine() {
    const name = prompt(t('マイセットの名前（例：胸の日）'))
    if (!name?.trim()) return
    addRoutine(
      name.trim(),
      w.items.map((it) => it.exerciseId)
    )
    alert(t('「{name}」を保存しました。ホームからワンタップで始められます。', { name: name.trim() }))
  }

  return (
    <div className="screen">
      <div className="workout-header">
        <div>
          <h1>{isEdit ? t('記録を修正') : t('トレーニング中')}</h1>
          <p className="muted">
            {formatDateJa(w.date)}
            {!isEdit && w.startedAt && <> ・ {formatClock((now - w.startedAt) / 1000)}</>}
            <span className="saved-badge">{t('自動保存 ✓')}</span>
          </p>
        </div>
        <button className="primary small" onClick={handleFinish}>
          {isEdit ? t('保存') : t('終了')}
        </button>
      </div>

      {w.items.map((it, itemIndex) => {
        const exercise = exercises.find((e) => e.id === it.exerciseId)
        const prev = previousRecord(sessions, it.exerciseId, {
          onOrBefore: w.date,
          excludeId: w.sourceSessionId,
        })
        const best = personalBest(sessions, it.exerciseId, w.sourceSessionId)
        const doneCount = it.sets.filter((s) => s.done).length
        const cardio = isCardio(exercise)
        const up = !isEdit && !cardio ? progressionFor(prev?.sets, settings.progression) : null
        return (
          <section className="card" key={`${it.exerciseId}-${itemIndex}`}>
            <div className="item-header">
              <h2>
                {exercise ? nm(exercise) : t('（削除された種目）')}
                {/^https?:\/\//.test(exercise?.videoUrl ?? '') && (
                  <a
                    className="video-link"
                    href={exercise.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('フォーム動画')}
                  >
                    ▶
                  </a>
                )}
                {it.sets.length > 0 && (
                  <span className="count">
                    {doneCount}/{it.sets.length}
                  </span>
                )}
              </h2>
              <div className="item-tools">
                <button className="ghost" onClick={() => moveItem(itemIndex, -1)} aria-label={t('上へ')}>
                  ↑
                </button>
                <button className="ghost" onClick={() => moveItem(itemIndex, 1)} aria-label={t('下へ')}>
                  ↓
                </button>
                <button className="ghost danger" onClick={() => removeItem(itemIndex)} aria-label={t('外す')}>
                  ✕
                </button>
              </div>
            </div>
            {prev ? (
              <p className="muted">
                {t('前回')} {prev.date.slice(5).replace('-', '/')}：{formatSets(prev.sets)}
                {best && !cardio && <> ・ {t('最高 {w}kg', { w: best.maxWeight })}</>}
              </p>
            ) : (
              <p className="muted">{t('はじめての種目です')}</p>
            )}
            {prev && !isEdit && !cardio && up && (
              <p className="target">
                {t('⬆ 前回すべて{reps}回以上できたので、+{step}kg にしています', up)}
              </p>
            )}
            {prev && !isEdit && !cardio && !up && suggestTarget(prev.sets) && (
              <p className="target">{suggestTarget(prev.sets)}</p>
            )}
            {prev?.note && <p className="muted">{t('前回メモ')}：{prev.note}</p>}

            {cardio ? (
              <div className="set-head cardio">
                <span>{t('セット')}</span>
                <span>{t('分')}</span>
                <span>km</span>
                <span>kcal</span>
                <span>{t('完了')}</span>
              </div>
            ) : (
              <div className="set-head">
                <span>{t('セット')}</span>
                <span>kg</span>
                <span>{t('回')}</span>
                <span>{t('完了')}</span>
              </div>
            )}
            {it.sets.map((s, setIndex) => {
              const ph = placeholderFor(it, setIndex, prev, up)
              const filled = isFilledSet(s)
              const isPr =
                !cardio &&
                filled &&
                isWorkingSet(s) &&
                best &&
                e1rm(Number(s.weight), Number(s.reps)) > best.maxE1rm
              const field = (key, mode, fallbackLabel) => (
                <input
                  type="number"
                  inputMode={mode}
                  placeholder={ph?.[key] != null ? String(ph[key]) : fallbackLabel}
                  value={s[key] ?? ''}
                  onChange={(e) => updateSet(itemIndex, setIndex, { [key]: e.target.value })}
                />
              )
              return (
                <div
                  className={`set-row ${cardio ? 'cardio' : ''} ${s.done ? 'done' : ''} ${s.type ?? ''}`}
                  key={setIndex}
                >
                  <button
                    className="set-index"
                    onClick={() => setSetMenu({ itemIndex, setIndex, cardio })}
                    aria-label={t('セットのメニュー')}
                  >
                    {s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : setNumber(it.sets, setIndex)}
                    {isPr && <span className="pr">PR</span>}
                  </button>
                  {cardio ? (
                    <>
                      {field('min', 'numeric', t('分'))}
                      {field('km', 'decimal', 'km')}
                      {field('kcal', 'numeric', 'kcal')}
                    </>
                  ) : (
                    <>
                      {field('weight', 'decimal', 'kg')}
                      {field('reps', 'numeric', t('回'))}
                    </>
                  )}
                  <button
                    className={`check ${s.done ? 'on' : ''}`}
                    onClick={() => toggleDone(itemIndex, setIndex, ph)}
                    aria-label={t('セット完了')}
                  >
                    ✓
                  </button>
                </div>
              )
            })}
            <div className="row">
              <button className="secondary" onClick={() => addSet(itemIndex)}>
                {t('＋ セット')}
              </button>
              <input
                className="note"
                placeholder={t('メモ（シート位置・フォームなど）')}
                value={it.note}
                onChange={(e) => updateItem(itemIndex, (x) => ({ ...x, note: e.target.value }))}
              />
            </div>
          </section>
        )
      })}

      <button className="secondary wide" onClick={() => setPickerOpen(true)}>
        {t('＋ 種目を追加')}
      </button>

      <div className="row">
        {w.items.length > 0 && (
          <button className="secondary" onClick={handleSaveRoutine}>
            {t('マイセットに登録')}
          </button>
        )}
        <button className="secondary danger" onClick={handleDiscard}>
          {isEdit ? t('修正をやめる') : t('破棄')}
        </button>
      </div>

      <p className="muted hint">
        {t(
          '薄い数字は前回の記録です。そのままでよければ ✓ をタップするだけで記録され、休憩タイマー（{sec}秒）が始まります。入力した内容はその場で保存されるので、アプリを閉じても消えません。',
          { sec: settings.restSeconds }
        )}
      </p>

      <RestTimer endsAt={w.restEndsAt} onChange={setRestEndsAt} />

      {setMenu && (
        <div className="sheet-backdrop" onClick={() => setSetMenu(null)}>
          <div className="sheet action-sheet" onClick={(e) => e.stopPropagation()}>
            {!setMenu.cardio &&
              [
                [undefined, t('通常のセット')],
                ['warmup', t('ウォームアップ（W）')],
                ['drop', t('ドロップセット（D）')],
              ].map(([type, label]) => (
                <button
                  key={label}
                  className={
                    (w.items[setMenu.itemIndex]?.sets[setMenu.setIndex]?.type ?? undefined) === type
                      ? 'on'
                      : ''
                  }
                  onClick={() => {
                    updateSet(setMenu.itemIndex, setMenu.setIndex, { type })
                    setSetMenu(null)
                  }}
                >
                  {label}
                </button>
              ))}
            <button
              className="danger"
              onClick={() => {
                removeSet(setMenu.itemIndex, setMenu.setIndex)
                setSetMenu(null)
              }}
            >
              {t('このセットを削除')}
            </button>
            <button onClick={() => setSetMenu(null)}>{t('キャンセル')}</button>
          </div>
        </div>
      )}

      {pickerOpen && (
        <ExercisePicker
          preferPartIds={w.bodyPartIds}
          addedIds={w.items.map((it) => it.exerciseId)}
          onPick={(id) => {
            if (!w.items.some((it) => it.exerciseId === id)) addWorkoutExercise(id)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
