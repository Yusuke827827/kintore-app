import { useCallback, useState } from 'react'
import { useData } from '../state/DataContext'
import useNow from '../hooks/useNow'
import ExercisePicker from '../components/ExercisePicker'
import RestTimer from '../components/RestTimer'
import { formatClock, formatDateJa } from '../lib/date'
import { nm, t } from '../i18n'
import { e1rm, isFilledSet, personalBest, previousRecord } from '../lib/stats'
import { cancelRestAlarm, scheduleRestAlarm } from '../lib/restAlarm'

function formatSets(sets) {
  return sets.map((s) => `${s.weight}kg×${s.reps}`).join('　')
}

function suggestTarget(prevSets) {
  if (!prevSets || prevSets.length === 0) return null
  const last = prevSets[prevSets.length - 1]
  return t('目標：{w1}kg×{r1}回 か {w2}kg×{r2}回', {
    w1: last.weight + 2.5,
    r1: last.reps,
    w2: last.weight,
    r2: last.reps + 1,
  })
}

// その行に薄く出す「前回の値」
function placeholderFor(item, index, prev) {
  if (prev?.sets[index]) return prev.sets[index]
  for (let i = index - 1; i >= 0; i--) {
    const s = item.sets[i]
    if (isFilledSet(s)) return { weight: Number(s.weight), reps: Number(s.reps) }
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
    const weight = set.weight !== '' ? set.weight : placeholder ? String(placeholder.weight) : '0'
    const reps = set.reps !== '' ? set.reps : placeholder ? String(placeholder.reps) : ''
    if (reps === '') return
    const restEndsAt = Date.now() + settings.restSeconds * 1000
    scheduleRestAlarm(restEndsAt)
    updateWorkout((x) => ({
      ...x,
      restEndsAt,
      items: x.items.map((it, i) =>
        i !== itemIndex
          ? it
          : {
              ...it,
              sets: it.sets.map((s, j) => (j === setIndex ? { weight, reps, done: true } : s)),
            }
      ),
    }))
  }

  function addSet(itemIndex) {
    updateItem(itemIndex, (it) => ({
      ...it,
      sets: [...it.sets, { weight: '', reps: '', done: false }],
    }))
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
      for (const s of it.sets.filter(isFilledSet)) {
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
        return (
          <section className="card" key={`${it.exerciseId}-${itemIndex}`}>
            <div className="item-header">
              <h2>
                {exercise ? nm(exercise) : t('（削除された種目）')}
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
                {best && <> ・ {t('最高 {w}kg', { w: best.maxWeight })}</>}
              </p>
            ) : (
              <p className="muted">{t('はじめての種目です')}</p>
            )}
            {prev && !isEdit && <p className="target">{suggestTarget(prev.sets)}</p>}
            {prev?.note && <p className="muted">{t('前回メモ')}：{prev.note}</p>}

            <div className="set-head">
              <span>{t('セット')}</span>
              <span>kg</span>
              <span>{t('回')}</span>
              <span>{t('完了')}</span>
            </div>
            {it.sets.map((s, setIndex) => {
              const ph = placeholderFor(it, setIndex, prev)
              const filled = isFilledSet(s)
              const isPr =
                filled && best && e1rm(Number(s.weight), Number(s.reps)) > best.maxE1rm
              return (
                <div className={`set-row ${s.done ? 'done' : ''}`} key={setIndex}>
                  <button
                    className="set-index"
                    onClick={() => {
                      if (confirm(t('{n}セット目を削除しますか？', { n: setIndex + 1 })))
                        removeSet(itemIndex, setIndex)
                    }}
                  >
                    {setIndex + 1}
                    {isPr && <span className="pr">PR</span>}
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={ph ? String(ph.weight) : 'kg'}
                    value={s.weight}
                    onChange={(e) => updateSet(itemIndex, setIndex, { weight: e.target.value })}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={ph ? String(ph.reps) : t('回')}
                    value={s.reps}
                    onChange={(e) => updateSet(itemIndex, setIndex, { reps: e.target.value })}
                  />
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
