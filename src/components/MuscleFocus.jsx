import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { usePremium } from '../state/PremiumContext'
import { MUSCLES, exercisesForMuscle, generateMuscleMenu, lastTrainedByMuscle } from '../lib/muscles'
import { LEVELS } from '../lib/planner'
import { daysAgoLabel, todayStr } from '../lib/date'
import { isCardio } from '../lib/stats'
import { nm, t } from '../i18n'
import MenuEditor from './MenuEditor'
import Icon from './Icon'
import ExerciseGuide from './ExerciseGuide'

const PART_ORDER = ['chest', 'back', 'shoulder', 'arm', 'legs', 'core']

// 細かい筋肉を選ぶ → その筋肉に効く種目でメニューを自動で作る → 始める／マイセットに保存・追加
export default function MuscleFocus({ onStart }) {
  const { allExercises, exercises, allBodyParts, sessions, gym, routines, addRoutine, updateRoutine } = useData()
  const { premium, gate } = usePremium()
  const today = todayStr()
  const [picked, setPicked] = useState([])
  const [level, setLevel] = useState(premium ? 'standard' : 'light')
  const [menu, setMenu] = useState({ exerciseIds: [], targets: {} })
  const [listOpen, setListOpen] = useState(false)
  const [addTo, setAddTo] = useState('')
  const [message, setMessage] = useState('')
  const [guideFor, setGuideFor] = useState(null)
  const last = useMemo(() => lastTrainedByMuscle(sessions, allExercises), [sessions, allExercises])

  function rebuild(ids, lv = level) {
    setMenu(ids.length ? generateMuscleMenu({ muscleIds: ids, level: premium ? lv : 'light', exercises, sessions, gym }) : { exerciseIds: [], targets: {} })
    setMessage('')
  }
  function toggle(id) {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]
    setPicked(next)
    rebuild(next)
  }
  function toggleExercise(ex) {
    if (menu.exerciseIds.includes(ex.id)) {
      const targets = { ...menu.targets }
      delete targets[ex.id]
      setMenu({ exerciseIds: menu.exerciseIds.filter((x) => x !== ex.id), targets })
    } else {
      setMenu({
        exerciseIds: [...menu.exerciseIds, ex.id],
        targets: { ...menu.targets, [ex.id]: isCardio(ex) ? { min: 30 } : { sets: 3, reps: ex.type === 'isolation' ? 12 : 10 } },
      })
    }
  }
  const partName = (id) => nm(allBodyParts.find((p) => p.id === id)) || id
  const muscleNames = picked.map((id) => t(MUSCLES.find((m) => m.id === id)?.name))

  return (
    <div className="muscle-focus">
      {PART_ORDER.map((part) => (
        <div key={part} className="part-group">
          <span className="group-label">{partName(part)}</span>
          <div className="chips">
            {MUSCLES.filter((m) => m.part === part).map((m) => (
              <button key={m.id} className={`chip ${picked.includes(m.id) ? 'on' : ''}`} aria-pressed={!!(picked.includes(m.id))} onClick={() => toggle(m.id)}>
                {t(m.name)}
                <small>{daysAgoLabel(last[m.id], today)}</small>
              </button>
            ))}
          </div>
        </div>
      ))}

      {guideFor && <ExerciseGuide exercise={guideFor} onClose={() => setGuideFor(null)} />}
      {picked.length === 0 ? (
        <p className="muted menu-preview">{t('鍛えたい筋肉を選ぶと、その筋肉に効く種目でメニューを作ります。')}</p>
      ) : (
        <>
          <div className="segmented">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                className={level === l.key ? 'on' : ''} aria-pressed={!!(level === l.key)}
                onClick={() => {
                  if (l.key !== 'light' && !gate('menu')) return
                  setLevel(l.key)
                  rebuild(picked, l.key)
                }}
              >
                {t(l.label)}
                {l.key !== 'light' && !premium && <Icon name="lock" size={13} className="inline-lock" />}
              </button>
            ))}
          </div>

          <button className="generator-toggle small-toggle" onClick={() => setListOpen(!listOpen)} aria-expanded={listOpen}>
            <span>{t('{muscles}に効く種目のリスト', { muscles: muscleNames.join(t('・')) })}</span>
            <Icon name="chevron" size={16} className={listOpen ? 'turn' : ''} />
          </button>
          {listOpen &&
            picked.map((mid) => (
              <div key={mid} className="muscle-list">
                <h3>{t(MUSCLES.find((m) => m.id === mid).name)}</h3>
                <ul className="plain-list">
                  {exercisesForMuscle(mid, { exercises, sessions, gym }).map(({ exercise: ex, primary, count }) => {
                    const on = menu.exerciseIds.includes(ex.id)
                    return (
                      <li key={ex.id} className="row-between">
                        <span>
                          <span className={`muscle-tag ${primary ? 'main' : ''}`}>{primary ? t('メイン') : t('補助')}</span> {nm(ex)}
                          {count > 0 && <small className="muted"> ・{t('{n}回やった', { n: count })}</small>}
                        </span>
                        <button className="ghost" onClick={() => setGuideFor(ex)} aria-label={t('{name}の解説', { name: nm(ex) })}>
                          <Icon name="info" size={17} />
                        </button>
                        <button className={`ghost ${on ? 'on' : ''}`} aria-pressed={!!(on)} onClick={() => toggleExercise(ex)} aria-label={on ? t('外す') : t('追加')}>
                          <Icon name={on ? 'check' : 'plus'} size={18} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

          <MenuEditor value={menu} onChange={setMenu} />

          <button className="primary wide big" disabled={!menu.exerciseIds.length} onClick={() => onStart(menu.exerciseIds, menu.targets)}>
            {t('このメニューで始める')}
          </button>
          <div className="row">
            <button
              className="secondary"
              disabled={!menu.exerciseIds.length}
              onClick={() => {
                if (!gate('routines', routines.length)) return
                const name = prompt(t('マイセットの名前（例：胸の日）'), t('{muscles}の日', { muscles: muscleNames.join(t('＋')) }))
                if (!name?.trim()) return
                addRoutine(name.trim(), menu.exerciseIds, menu.targets)
                setMessage(t('「{name}」を保存しました。ホームからワンタップで始められます。', { name: name.trim() }))
              }}
            >
              {t('マイセットに保存')}
            </button>
            {routines.length > 0 && (
              <>
                <select value={addTo} onChange={(e) => setAddTo(e.target.value)} aria-label={t('追加するマイセット')}>
                  <option value="">{t('マイセットに追加…')}</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  className="secondary"
                  disabled={!addTo || !menu.exerciseIds.length}
                  onClick={() => {
                    const r = routines.find((x) => x.id === addTo)
                    const add = menu.exerciseIds.filter((id) => !r.exerciseIds.includes(id))
                    updateRoutine(r.id, {
                      exerciseIds: [...r.exerciseIds, ...add],
                      targets: { ...(r.targets ?? {}), ...Object.fromEntries(add.map((id) => [id, menu.targets[id]])) },
                    })
                    setMessage(t('「{name}」に{n}種目を追加しました。', { name: r.name, n: add.length }))
                    setAddTo('')
                  }}
                >
                  {t('追加')}
                </button>
              </>
            )}
          </div>
          {message && <p className="target">{message}</p>}
        </>
      )}
    </div>
  )
}
