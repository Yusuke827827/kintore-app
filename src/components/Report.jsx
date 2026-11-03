import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { usePremium } from '../state/PremiumContext'
import { buildReport, periodLabel, periodRange, reportPrompt, yearSummary } from '../lib/report'
import { computeBadges } from '../lib/badges'
import { printReport, printYear, shareYearImage, yearTiles } from '../lib/yearExport'
import { t } from '../i18n'
import AiBridge from './AiBridge'
import Badges from './Badges'
import Icon from './Icon'
import LockCard from './LockCard'

// レポートの計算に使うデータ（記録が変わったときだけ作り直す）
function useReportInput() {
  const d = useData()
  return useMemo(
    () => ({
      sessions: d.sessions,
      exercises: d.allExercises,
      bodyParts: d.allBodyParts,
      meals: d.meals,
      bodyLogs: d.bodyLogs,
      profile: d.profile,
      settings: d.settings,
    }),
    [d.sessions, d.allExercises, d.allBodyParts, d.meals, d.bodyLogs, d.profile, d.settings]
  )
}

const KINDS = [
  ['week', '週'],
  ['month', '月'],
  ['year', '年'],
]

// 点数の円（中に評価の文字）
export function ScoreRing({ score, grade, size = 104 }) {
  const r = 44
  const len = 2 * Math.PI * r
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 104 104" width={size} height={size} aria-hidden="true">
        <circle cx="52" cy="52" r={r} className="goal-ring-track" />
        {score > 0 && (
          <circle
            cx="52"
            cy="52"
            r={r}
            className={`goal-ring-fill grade-${grade}`}
            strokeDasharray={`${(len * score) / 100} ${len}`}
            transform="rotate(-90 52 52)"
          />
        )}
      </svg>
      <span>
        <strong>{grade}</strong>
        <small>
          {score}
          {t('点')}
        </small>
      </span>
    </div>
  )
}

function ReportBody({ report, label }) {
  const data = useData()
  const { premium } = usePremium()
  const c = report.cur
  return (
    <>
      <section className="card report-head">
        <ScoreRing score={report.total} grade={report.grade} />
        <div className="report-summary">
          {report.inProgress && <span className="badge">{t('途中経過')}</span>}
          <div className="report-nums">
            <span>
              <strong>{c.days}</strong>
              {t('日')}
            </span>
            <span>
              <strong>{c.sets}</strong>
              {t('セット')}
            </span>
            <span>
              <strong>{Math.round(c.volume).toLocaleString()}</strong>kg
            </span>
            {c.cardioMin > 0 && (
              <span>
                <strong>{Math.round(c.cardioMin)}</strong>
                {t('分')}
              </span>
            )}
            {c.prs > 0 && (
              <span>
                <strong>{c.prs}</strong>PR
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>{t('項目ごとの点数')}</h2>
        <div className="score-rows">
          {report.cats.map((x) => (
            <div key={x.key} className="score-row">
              <div className="row-between">
                <span>{x.label}</span>
                <strong>{x.score}</strong>
              </div>
              <div className="bar-track">
                <div className={`bar-fill grade-${x.score >= 80 ? 'A' : x.score >= 50 ? 'C' : 'D'}`} style={{ width: `${x.score}%` }} />
              </div>
              <small className="muted">{x.detail}</small>
            </div>
          ))}
        </div>
      </section>

      {premium ? (
        <section className="card report-comments">
          {report.good.length > 0 && (
            <>
              <h3>{t('良かった点')}</h3>
              <ul className="report-list good">
                {report.good.map((x) => (
                  <li key={x}>
                    <Icon name="check" size={16} strokeWidth={2.4} /> {x}
                  </li>
                ))}
              </ul>
            </>
          )}
          {report.improve.length > 0 && (
            <>
              <h3>{t('改善点')}</h3>
              <ul className="report-list improve">
                {report.improve.map((x) => (
                  <li key={x}>
                    <Icon name="alert" size={16} /> {x}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>{report.range.kind === 'week' ? t('来週の目標') : t('来月の目標')}</h3>
          <ol className="report-list next">
            {report.next.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <AiBridge
            buildPrompt={() => reportPrompt(report, { exercises: data.allExercises })}
            hint={t('この期間の記録をまとめた質問文をコピーします。AIの評価を読むだけなので、貼り付けは不要です。')}
          />
          <button className="secondary wide" onClick={() => printReport(report, label)}>
            <Icon name="share" size={18} />
            {t('PDFで保存')}
          </button>
        </section>
      ) : (
        <LockCard feature="report" />
      )}
    </>
  )
}

function YearBody({ offset }) {
  const input = useReportInput()
  const y = useMemo(() => yearSummary(offset, input), [offset, input])
  const badges = useMemo(() => computeBadges(input), [input])
  const yearBadges = badges.filter((b) => b.earned && b.earned >= y.range.start && b.earned <= y.range.end).length
  const [busy, setBusy] = useState(false)

  if (y.sessions === 0 && y.mealDays === 0) {
    return (
      <section className="card">
        <p className="muted">{t('この年の記録はまだありません。')}</p>
      </section>
    )
  }
  return (
    <>
      <section className="card">
        <p className="muted">{t('1年で挙げた総重量')}</p>
        <p className="year-hero">{Math.round(y.volume).toLocaleString()}kg</p>
        <div className="year-tiles">
          {yearTiles(y)
            .filter((x) => x[1] !== t('総重量'))
            .map(([v, l]) => (
              <div key={l}>
                <strong>{v}</strong>
                <span>{l}</span>
              </div>
            ))}
        </div>
      </section>
      <section className="card">
        <h2>{t('月ごとの回数')}</h2>
        <div className="year-months">
          {y.months.map((n, i) => (
            <div key={i}>
              <span className="week-num">{n || ''}</span>
              <div className="week-bar" style={{ height: `${(n / Math.max(1, ...y.months)) * 100}%` }} />
              <span className="week-label">{i + 1}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>{t('ベストリフト')}</h2>
        <ul className="plain-list">
          {y.bestLifts.map((b) => (
            <li key={b.name} className="row-between">
              <span>{b.name}</span>
              <strong>
                {b.weight}kg × {b.reps}
              </strong>
            </li>
          ))}
          {!y.bestLifts.length && <li className="muted">—</li>}
        </ul>
        {y.topExercises.length > 0 && (
          <p className="muted">
            {t('よくやった種目')}：{y.topExercises.map((e) => t('{name}（{n}回）', { name: e.name, n: e.count })).join(t('・'))}
          </p>
        )}
        {y.topPart && <p className="muted">{t('いちばん鍛えた部位')}：{y.topPart.name}</p>}
      </section>
      <div className="row">
        <button
          className="primary grow"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await shareYearImage(y, yearBadges).finally(() => setBusy(false))
          }}
        >
          <Icon name="share" size={18} />
          {t('画像で共有')}
        </button>
        <button className="secondary grow" onClick={() => printYear(y, badges)}>
          {t('PDFで保存')}
        </button>
      </div>
      <p className="muted hint">{t('PDFは印刷の画面から保存できます（iPhoneは共有ボタン →「ファイルに保存」）。')}</p>
    </>
  )
}

export default function Report({ initialKind = 'week', initialOffset = 0 }) {
  const input = useReportInput()
  const [kind, setKind] = useState(initialKind)
  const [offset, setOffset] = useState(initialOffset)
  const report = useMemo(() => (kind === 'year' ? null : buildReport(kind, offset, input)), [kind, offset, input])
  const badges = useMemo(() => computeBadges(input), [input])
  const range = periodRange(kind, offset)
  const label = (kind === 'year' ? t('{p}のまとめ', { p: periodLabel(range) }) : t('{p}のレポート', { p: periodLabel(range) }))

  return (
    <div className="report">
      <div className="segmented">
        {KINDS.map(([k, l]) => (
          <button
            key={k}
            className={kind === k ? 'on' : ''}
            onClick={() => {
              setKind(k)
              setOffset(0)
            }}
          >
            {t(l)}
          </button>
        ))}
      </div>
      <div className="cal-header">
        <button className="ghost" onClick={() => setOffset(offset - 1)} aria-label={t('前へ')}>
          ‹
        </button>
        <h2>{label}</h2>
        <button className="ghost" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label={t('次へ')}>
          ›
        </button>
      </div>
      {kind === 'year' ? (
        <YearBody offset={offset} />
      ) : report.empty ? (
        <section className="card">
          <p className="muted">{t('まだ始まっていない期間です。')}</p>
        </section>
      ) : report.cur.days === 0 && report.cur.mealDays === 0 ? (
        <section className="card">
          <p className="muted">{t('この期間の記録はまだありません。トレーニングや食事を記録すると、点数とアドバイスが出ます。')}</p>
        </section>
      ) : (
        <ReportBody report={report} label={label} />
      )}
      <Badges badges={badges} />
    </div>
  )
}
