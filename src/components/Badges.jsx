import { useState } from 'react'
import { formatDateJa } from '../lib/date'
import { t } from '../i18n'
import Icon from './Icon'

// バッジの一覧：取ったものは色つき・日付、まだのものはグレーと進み具合
export function BadgeGrid({ badges }) {
  return (
    <div className="badge-grid">
      {badges.map((b) => (
        <div key={b.id} className={`medal ${b.earned ? 'earned' : ''}`} title={t(b.desc)}>
          <span className="medal-icon">
            <Icon name={b.icon} size={24} />
          </span>
          <strong>{t(b.title)}</strong>
          {b.earned ? (
            <small>{formatDateJa(b.earned)}</small>
          ) : (
            <>
              <span className="medal-bar">
                <i style={{ width: `${b.progress * 100}%` }} />
              </span>
              <small>
                {b.value.toLocaleString()}/{b.target.toLocaleString()}
              </small>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Badges({ badges }) {
  const [all, setAll] = useState(false)
  const earned = badges.filter((b) => b.earned).length
  // 取ったもの（新しい順）→ もうすぐ取れそうなもの
  const sorted = [
    ...badges.filter((b) => b.earned).sort((a, b) => (a.earned < b.earned ? 1 : -1)),
    ...badges.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress),
  ]
  return (
    <section className="card">
      <div className="row-between">
        <h2 className="with-icon">
          <Icon name="trophy" size={20} /> {t('バッジ')}
        </h2>
        <span className="muted">
          {earned}/{badges.length}
        </span>
      </div>
      {/* 最初は取ったものと、もうすぐ取れそうなものだけ */}
      <BadgeGrid badges={all ? sorted : sorted.slice(0, Math.max(6, earned + 3))} />
      {!all && sorted.length > Math.max(6, earned + 3) && (
        <button className="link" onClick={() => setAll(true)}>
          {t('すべて見る（{n}項目）', { n: badges.length })}
        </button>
      )}
    </section>
  )
}
