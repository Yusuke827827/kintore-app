import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { todayStr } from '../lib/date'
import { weekStart, weeklyStats } from '../lib/stats'
import { nm, t } from '../i18n'

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

// 部位ごとの週のセット数（ウォームアップ除く）。先週と比べて偏りに気づけるように。
export default function WeeklyStats() {
  const { sessions, allExercises, allBodyParts, settings } = useData()
  const cardioGoal = settings.cardioGoal?.weeklyMin ?? 0
  const [offset, setOffset] = useState(0) // 0 = 今週, -1 = 先週…
  const weeks = useMemo(() => weeklyStats(sessions, allExercises), [sessions, allExercises])

  const thisWeek = weekStart(addDays(todayStr(), offset * 7))
  const prevWeek = addDays(thisWeek, -7)
  const cur = weeks[thisWeek] ?? { sets: {}, volume: {}, cardioMin: 0, days: new Set() }
  const prev = weeks[prevWeek] ?? { sets: {}, volume: {}, cardioMin: 0, days: new Set() }

  const partIds = [...new Set([...Object.keys(cur.sets), ...Object.keys(prev.sets)])]
  const parts = allBodyParts.filter((p) => partIds.includes(p.id) || (!p.deleted && p.id !== 'cardio'))
  const max = Math.max(1, ...parts.map((p) => Math.max(cur.sets[p.id] ?? 0, prev.sets[p.id] ?? 0)))
  const totalSets = Object.values(cur.sets).reduce((a, b) => a + b, 0)
  const totalVolume = Object.values(cur.volume).reduce((a, b) => a + b, 0)

  // 直近8週のセット数
  const last8 = Array.from({ length: 8 }, (_, i) => {
    const wk = weekStart(addDays(todayStr(), (i - 7) * 7))
    const w = weeks[wk]
    return { wk, sets: w ? Object.values(w.sets).reduce((a, b) => a + b, 0) : 0 }
  })
  const max8 = Math.max(1, ...last8.map((w) => w.sets))
  // 直近8週の有酸素の時間
  const cardio8 = last8.map((w) => ({ wk: w.wk, min: Math.round(weeks[w.wk]?.cardioMin ?? 0), km: weeks[w.wk]?.cardioKm ?? 0 }))
  const maxCardio = Math.max(1, cardioGoal, ...cardio8.map((w) => w.min))
  const hasCardio = cardio8.some((w) => w.min > 0) || settings.focus === 'cardio'

  const label =
    offset === 0
      ? t('今週')
      : offset === -1
        ? t('先週')
        : t('{m}/{d}の週', { m: Number(thisWeek.slice(5, 7)), d: Number(thisWeek.slice(8)) })

  return (
    <>
      <section className="card">
        <div className="cal-header">
          <button className="ghost" onClick={() => setOffset(offset - 1)}>
            ‹
          </button>
          <h2>{label}</h2>
          <button className="ghost" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
            ›
          </button>
        </div>
        <div className="stats">
          <div>
            <strong>{cur.days.size}</strong>
            <span>{t('日')}</span>
          </div>
          <div>
            <strong>{totalSets}</strong>
            <span>{t('セット')}</span>
          </div>
          <div>
            <strong>{Math.round(totalVolume).toLocaleString()}</strong>
            <span>kg</span>
          </div>
          {cur.cardioMin > 0 && (
            <div>
              <strong>{cur.cardioMin}</strong>
              <span>{t('有酸素（分）')}</span>
            </div>
          )}
        </div>

        <h3>{t('部位ごとのセット数')}</h3>
        <p className="muted">{t('ウォームアップは数えません。薄い線は前の週です。')}</p>
        <div className="bars">
          {parts.map((p) => {
            const n = cur.sets[p.id] ?? 0
            const before = prev.sets[p.id] ?? 0
            return (
              <div key={p.id} className="bar-row">
                <span className="bar-label">{nm(p)}</span>
                <div className="bar-track">
                  <div className="bar-prev" style={{ width: `${(before / max) * 100}%` }} />
                  <div className="bar-fill" style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="bar-value">
                  {n}
                  {n !== before && (
                    <small className={n > before ? 'up' : 'down'}>
                      {n > before ? '+' : ''}
                      {n - before}
                    </small>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h2>{t('直近8週のセット数')}</h2>
        <div className="week-columns">
          {last8.map((w) => (
            <div key={w.wk} className={`week-col ${w.wk === thisWeek ? 'current' : ''}`}>
              <span className="week-num">{w.sets || ''}</span>
              <div className="week-bar" style={{ height: `${(w.sets / max8) * 100}%` }} />
              <span className="week-label">{`${Number(w.wk.slice(5, 7))}/${Number(w.wk.slice(8))}`}</span>
            </div>
          ))}
        </div>
      </section>
      {hasCardio && (
        <section className="card">
          <h2>{t('有酸素の時間（直近8週）')}</h2>
          <p className="muted">
            {t('{label}：{m}分・{km}km・{kcal}kcal', {
              label,
              m: Math.round(cur.cardioMin ?? 0),
              km: Math.round((cur.cardioKm ?? 0) * 10) / 10,
              kcal: Math.round(cur.cardioKcal ?? 0),
            })}
          </p>
          <div className="week-columns cardio-weeks">
            {cardio8.map((w) => (
              <div
                key={w.wk}
                className={`week-col ${w.wk === thisWeek ? 'current' : ''} ${cardioGoal && w.min >= cardioGoal ? 'met' : ''}`}
              >
                <span className="week-num">{w.min || ''}</span>
                <div className="week-bar" style={{ height: `${(w.min / maxCardio) * 100}%` }} />
                <span className="week-label">{`${Number(w.wk.slice(5, 7))}/${Number(w.wk.slice(8))}`}</span>
              </div>
            ))}
          </div>
          {cardioGoal > 0 && <p className="muted">{t('緑の週は目標（週{m}分）を達成', { m: cardioGoal })}</p>}
        </section>
      )}
    </>
  )
}
