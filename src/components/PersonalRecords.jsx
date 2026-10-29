import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { daysBetween, formatDateJa, todayStr } from '../lib/date'
import { personalRecords } from '../lib/stats'
import { nm, t } from '../i18n'

// 種目ごとの自己ベスト一覧。直近7日に更新したものに印をつける。
export default function PersonalRecords() {
  const { sessions, allExercises, allBodyParts } = useData()
  const [partId, setPartId] = useState('all')
  const today = todayStr()
  const records = useMemo(() => personalRecords(sessions, allExercises), [sessions, allExercises])

  const partOf = (id) => allExercises.find((e) => e.id === id)?.bodyPartId
  const usedParts = allBodyParts.filter((p) => records.some((r) => partOf(r.exerciseId) === p.id))
  const list = records
    .filter((r) => partId === 'all' || partOf(r.exerciseId) === partId)
    .sort((a, b) => (a.lastPrDate < b.lastPrDate ? 1 : a.lastPrDate > b.lastPrDate ? -1 : 0))

  if (records.length === 0) return null

  return (
    <section className="card">
      <h2>{t('自己ベスト')}</h2>
      <div className="chips">
        <button className={`chip small ${partId === 'all' ? 'on' : ''}`} onClick={() => setPartId('all')}>
          {t('すべて')}
        </button>
        {usedParts.map((p) => (
          <button
            key={p.id}
            className={`chip small ${partId === p.id ? 'on' : ''}`}
            onClick={() => setPartId(p.id)}
          >
            {nm(p)}
          </button>
        ))}
      </div>
      <ul className="plain-list">
        {list.map((r) => {
          const ex = allExercises.find((e) => e.id === r.exerciseId)
          const fresh = r.lastPrDate && daysBetween(r.lastPrDate, today) <= 7
          return (
            <li key={r.exerciseId} className="pr-row">
              <div>
                <strong>
                  {ex ? nm(ex) : t('（削除された種目）')}
                  {fresh && <span className="pr inline">NEW</span>}
                </strong>
                <span className="muted">{formatDateJa(r.lastPrDate)}</span>
              </div>
              <div className="pr-values">
                {r.cardio ? (
                  <>
                    {r.min != null && <span>{t('最長 {m}分', { m: r.min })}</span>}
                    {r.km != null && <span>{t('最長 {km}km', { km: r.km })}</span>}
                  </>
                ) : (
                  <>
                    {r.weight != null && (
                      <span>
                        <b>{r.weight}kg</b> × {r.reps}
                      </span>
                    )}
                    {r.e1rm != null && <span className="muted">{t('推定1RM {w}kg', { w: r.e1rm })}</span>}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
