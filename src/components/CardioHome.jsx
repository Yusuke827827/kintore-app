import { useMemo } from 'react'
import { useData } from '../state/DataContext'
import { daysAgoLabel, todayStr } from '../lib/date'
import { doneExercisesForPart, formatSet, previousRecord, weekStart, weeklyStats } from '../lib/stats'
import { nm, t } from '../i18n'

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

// 有酸素中心の人のホーム：今週の時間と距離・月の距離・連続達成、前回の種目からワンタップで開始
export default function CardioHome({ onStart }) {
  const { sessions, exercises, allExercises, settings } = useData()
  const today = todayStr()
  const goal = settings.cardioGoal ?? { weeklyMin: 150, monthlyKm: 0 }
  const weeks = useMemo(() => weeklyStats(sessions, allExercises), [sessions, allExercises])
  const wk = weeks[weekStart(today)] ?? { cardioMin: 0, cardioKm: 0, cardioKcal: 0, cardioDays: new Set() }

  // 今月の距離
  const monthKm = useMemo(() => {
    const prefix = today.slice(0, 7)
    let km = 0
    for (const s of sessions) {
      if (!s.date.startsWith(prefix)) continue
      for (const en of s.entries) for (const set of en.sets) km += set.km || 0
    }
    return Math.round(km * 10) / 10
  }, [sessions, today])

  // 週の時間の目標を何週続けて達成しているか（今週は達成していれば数える）
  const streak = useMemo(() => {
    if (!goal.weeklyMin) return 0
    let n = (weeks[weekStart(today)]?.cardioMin ?? 0) >= goal.weeklyMin ? 1 : 0
    let w = addDays(weekStart(today), -7)
    while ((weeks[w]?.cardioMin ?? 0) >= goal.weeklyMin) {
      n++
      w = addDays(w, -7)
    }
    return n
  }, [weeks, goal.weeklyMin, today])

  const recent = doneExercisesForPart(sessions, exercises, 'cardio').slice(0, 4)
  const pct = goal.weeklyMin ? Math.min(100, (wk.cardioMin / goal.weeklyMin) * 100) : 0

  return (
    <section className="card cardio-home">
      <div className="item-header">
        <h2>{t('今週の有酸素')}</h2>
        {streak > 0 && <span className="badge ok">{t('🔥 {n}週連続', { n: streak })}</span>}
      </div>
      <div className="cardio-ring-row">
        <div className="cardio-big">
          <strong>{Math.round(wk.cardioMin)}</strong>
          <span>
            / {goal.weeklyMin}
            {t('分')}
          </span>
        </div>
        <div className="cardio-sub">
          <span>{Math.round(wk.cardioKm * 10) / 10} km</span>
          <span>{Math.round(wk.cardioKcal)} kcal</span>
          <span>{t('{n}日', { n: wk.cardioDays?.size ?? 0 })}</span>
        </div>
      </div>
      <div className="goal-bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">
        {wk.cardioMin >= goal.weeklyMin
          ? t('今週の目標達成！')
          : t('あと{m}分で今週の目標', { m: Math.max(0, Math.round(goal.weeklyMin - wk.cardioMin)) })}
        {goal.monthlyKm > 0 && <> ・ {t('今月 {km}/{goal}km', { km: monthKm, goal: goal.monthlyKm })}</>}
      </p>

      {recent.length > 0 && (
        <>
          <h3>{t('前回と同じで始める')}</h3>
          <ul className="plain-list">
            {recent.map((id) => {
              const e = allExercises.find((x) => x.id === id)
              const prev = previousRecord(sessions, id)
              const last = prev?.sets.at(-1)
              return (
                <li key={id} className="row-between">
                  <div className="cardio-recent">
                    <strong>{nm(e)}</strong>
                    <span className="muted">
                      {last ? formatSet(last) : ''} {prev && <>（{daysAgoLabel(prev.date, today)}）</>}
                    </span>
                  </div>
                  <button className="primary small" onClick={() => onStart([id], ['cardio'])}>
                    {t('始める')}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <button className="secondary wide" onClick={() => onStart([], ['cardio'])}>
        {recent.length ? t('ほかの有酸素を選ぶ') : t('有酸素を始める')}
      </button>
    </section>
  )
}
