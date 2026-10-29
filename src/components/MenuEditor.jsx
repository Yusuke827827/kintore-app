import { useState } from 'react'
import { useData } from '../state/DataContext'
import ExercisePicker from './ExercisePicker'
import { smartOrder } from '../lib/planner'
import { isCardio } from '../lib/stats'
import { nm, t } from '../i18n'

// 作ったメニューを使う人が直す：種目の追加・削除・並べ替え・セット数と回数の変更、おまかせ並べ替え
// value: { exerciseIds: [...], targets: { [id]: { sets, reps } } }
export default function MenuEditor({ value, onChange, preferPartIds = [] }) {
  const { allExercises } = useData()
  const [pickerOpen, setPickerOpen] = useState(false)
  const { exerciseIds, targets = {} } = value

  function set(next) {
    onChange({ exerciseIds: next.exerciseIds ?? exerciseIds, targets: next.targets ?? targets })
  }
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= exerciseIds.length) return
    const ids = [...exerciseIds]
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    set({ exerciseIds: ids })
  }
  function remove(i) {
    const id = exerciseIds[i]
    const rest = { ...targets }
    delete rest[id]
    set({ exerciseIds: exerciseIds.filter((_, k) => k !== i), targets: rest })
  }
  function changeTarget(id, key, delta) {
    const cur = targets[id] ?? { sets: 3, reps: 10 }
    const v = Math.max(1, Math.min(key === 'sets' ? 10 : 50, (cur[key] ?? 0) + delta))
    set({ targets: { ...targets, [id]: { ...cur, [key]: v } } })
  }

  return (
    <div className="menu-editor">
      <div className="row-between">
        <span className="muted">{t('{n}種目', { n: exerciseIds.length })}</span>
        <button
          className="ghost"
          onClick={() => set({ exerciseIds: smartOrder(exerciseIds, allExercises) })}
          disabled={exerciseIds.length < 2}
        >
          {t('✨ おまかせ並べ替え')}
        </button>
      </div>
      <ul className="plain-list">
        {exerciseIds.map((id, i) => {
          const e = allExercises.find((x) => x.id === id)
          const tg = targets[id]
          return (
            <li key={`${id}-${i}`} className="menu-row">
              <span className="menu-no">{i + 1}</span>
              <div className="menu-main">
                <strong>{e ? nm(e) : t('（削除された種目）')}</strong>
                {!isCardio(e) && (
                  <div className="steppers">
                    <span className="stepper">
                      <button onClick={() => changeTarget(id, 'sets', -1)}>−</button>
                      {t('{n}セット', { n: tg?.sets ?? 3 })}
                      <button onClick={() => changeTarget(id, 'sets', 1)}>＋</button>
                    </span>
                    <span className="stepper">
                      <button onClick={() => changeTarget(id, 'reps', -1)}>−</button>
                      {t('{n}回', { n: tg?.reps ?? 10 })}
                      <button onClick={() => changeTarget(id, 'reps', 1)}>＋</button>
                    </span>
                  </div>
                )}
              </div>
              <div className="item-tools">
                <button className="ghost" onClick={() => move(i, -1)} aria-label={t('上へ')}>
                  ↑
                </button>
                <button className="ghost" onClick={() => move(i, 1)} aria-label={t('下へ')}>
                  ↓
                </button>
                <button className="ghost danger" onClick={() => remove(i)} aria-label={t('外す')}>
                  ✕
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <button className="secondary wide" onClick={() => setPickerOpen(true)}>
        {t('＋ 種目を追加')}
      </button>
      {pickerOpen && (
        <ExercisePicker
          preferPartIds={preferPartIds}
          addedIds={exerciseIds}
          onPick={(id) => {
            if (exerciseIds.includes(id)) return
            const e = allExercises.find((x) => x.id === id)
            set({
              exerciseIds: [...exerciseIds, id],
              targets: isCardio(e) ? targets : { ...targets, [id]: { sets: 3, reps: 10 } },
            })
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
