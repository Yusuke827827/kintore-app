import { useState } from 'react'
import { useData } from '../state/DataContext'
import LineChart from './LineChart'
import { daysAgoLabel, formatDateJa, todayStr } from '../lib/date'
import { t } from '../i18n'

// 体重・体脂肪率の記録。1日1件で、同じ日に入れ直すと上書き。
export default function BodyLog() {
  const { bodyLogs, saveBodyLog, deleteBodyLog } = useData()
  const today = todayStr()
  const sorted = [...bodyLogs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const last = sorted[sorted.length - 1]
  const todayLog = sorted.find((l) => l.date === today)

  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState(todayLog ? String(todayLog.weight) : '')
  const [fat, setFat] = useState(todayLog?.fat != null ? String(todayLog.fat) : '')
  const [saved, setSaved] = useState(false)

  function pickDate(d) {
    setDate(d)
    const log = sorted.find((l) => l.date === d)
    setWeight(log ? String(log.weight) : '')
    setFat(log?.fat != null ? String(log.fat) : '')
    setSaved(false)
  }

  function handleSave() {
    if (!weight) return
    saveBodyLog(date, Number(weight), fat === '' ? null : Number(fat))
    setSaved(true)
  }

  const first = sorted[0]
  const diff = first && last && first !== last ? Math.round((last.weight - first.weight) * 10) / 10 : null
  const recent = sorted.slice(-60)
  const withFat = recent.filter((l) => l.fat != null)

  return (
    <>
      <section className="card">
        <h2>{t('体重を記録')}</h2>
        <div className="body-form">
          <label className="field">
            {t('日付')}
            <input type="date" value={date} max={today} onChange={(e) => pickDate(e.target.value)} />
          </label>
          <label className="field">
            {t('体重（kg）')}
            <input
              type="number"
              inputMode="decimal"
              placeholder={last ? String(last.weight) : '65.0'}
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value)
                setSaved(false)
              }}
            />
          </label>
          <label className="field">
            {t('体脂肪率（%・任意）')}
            <input
              type="number"
              inputMode="decimal"
              placeholder={last?.fat != null ? String(last.fat) : '—'}
              value={fat}
              onChange={(e) => {
                setFat(e.target.value)
                setSaved(false)
              }}
            />
          </label>
        </div>
        <button className="primary wide" disabled={!weight} onClick={handleSave}>
          {saved ? t('保存しました ✓') : t('保存')}
        </button>
      </section>

      {sorted.length > 0 && (
        <section className="card">
          <h2>{t('推移')}</h2>
          <p className="muted">
            {t('最新 {w}kg（{when}）', { w: last.weight, when: daysAgoLabel(last.date, today) })}
            {diff != null && (
              <>
                {' '}
                ・ {t('記録開始から {d}kg', { d: diff > 0 ? `+${diff}` : diff })}
              </>
            )}
          </p>
          <h3>{t('体重（kg）')}</h3>
          <LineChart
            points={recent.map((l) => ({ label: l.date, value: l.weight }))}
            unit=""
            zeroBased={false}
          />
          {withFat.length > 0 && (
            <>
              <h3>{t('体脂肪率（%）')}</h3>
              <LineChart
                points={withFat.map((l) => ({ label: l.date, value: l.fat }))}
                unit=""
                color="#f472b6"
                zeroBased={false}
              />
            </>
          )}
        </section>
      )}

      {sorted.length > 0 && (
        <section className="card">
          <h2>{t('記録一覧')}</h2>
          <ul className="plain-list">
            {[...sorted].reverse().map((l) => (
              <li key={l.id} className="row-between">
                <button className="edit-main" onClick={() => pickDate(l.date)}>
                  <strong>
                    {l.weight}kg{l.fat != null && <> ・ {l.fat}%</>}
                  </strong>
                  <span className="muted">{formatDateJa(l.date)}</span>
                </button>
                <button
                  className="ghost danger"
                  onClick={() =>
                    confirm(t('{date} の記録を削除しますか？', { date: l.date })) && deleteBodyLog(l.id)
                  }
                >
                  {t('削除')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
