import { useEffect, useState } from 'react'
import { usePremium } from '../state/PremiumContext'
import { DEFAULT_PLAN, FEATURES, FREE_LIMITS, annualSavingPct, yen } from '../lib/pricing'
import { t } from '../i18n'

export const PRIVACY_URL = 'https://yusuke827827.github.io/kintore-app/privacy.html'
export const TERMS_URL = 'https://yusuke827827.github.io/kintore-app/terms.html'

const PERIOD = { year: '年', month: '月' }

function priceOf(plan) {
  return plan.priceString ?? yen(plan.price)
}

// プランの下に出す説明（App Store の審査で必要：期間・価格・自動更新・お試し後の価格）
function planNote(plan) {
  if (plan.period === 'lifetime') return t('1回払い・ずっと使える')
  const per = plan.period === 'year' ? t('月あたり{p}', { p: yen(plan.price / 12) }) : ''
  return per
}

export default function Paywall({ feature, onClose }) {
  const { kind, premium, getPlans, purchase, restore } = usePremium()
  const [plans, setPlans] = useState(null)
  const [selected, setSelected] = useState(DEFAULT_PLAN)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch(() => setMessage(t('プランを読み込めませんでした。通信を確認してください。')))
  }, [getPlans])

  const plan = plans?.find((p) => p.id === selected) ?? plans?.[0]
  const saving = plans ? annualSavingPct(plans) : 0
  const highlight = FEATURES.find((f) => f.key === feature)

  async function handleBuy() {
    if (!plan) return
    setBusy(true)
    setMessage('')
    try {
      if (await purchase(plan.id)) onClose()
    } catch (e) {
      setMessage(e?.message || t('購入できませんでした。'))
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore() {
    setBusy(true)
    setMessage('')
    try {
      if (await restore()) onClose()
      else setMessage(t('復元できる購入が見つかりませんでした。'))
    } catch (e) {
      setMessage(e?.message || t('復元できませんでした。'))
    } finally {
      setBusy(false)
    }
  }

  const cta = !plan
    ? t('読み込み中…')
    : plan.trialDays
      ? t('{n}日間 無料で試す', { n: plan.trialDays })
      : plan.period === 'lifetime'
        ? t('{p}で購入する', { p: priceOf(plan) })
        : t('{p}/{u}で始める', { p: priceOf(plan), u: t(PERIOD[plan.period]) })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet paywall" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{t('💪 プレミアム')}</h2>
          <button className="ghost" onClick={onClose} aria-label={t('閉じる')}>
            ✕
          </button>
        </div>

        <div className="paywall-body">
          {highlight && (
            <p className="paywall-lead">
              {highlight.icon} {t('「{f}」はプレミアムの機能です', { f: t(highlight.label) })}
            </p>
          )}
          {kind === 'beta' && (
            <p className="paywall-lead">{t('Web版はベータ期間中のため、すべての機能を無料で使えます。下はアプリ版の料金です。')}</p>
          )}

          <ul className="paywall-features">
            {FEATURES.map((f) => (
              <li key={f.key} className={f.key === feature ? 'on' : ''}>
                <span>{f.icon}</span>
                <div>
                  <strong>{t(f.label)}</strong>
                  <small>{t(f.desc, { n: FREE_LIMITS.routines })}</small>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted">{t('記録・自動保存・履歴・グラフ・バックアップは、無料版でも無制限です。')}</p>
        </div>

        {/* 料金と購入ボタンは、スクロールしなくても見える位置に固定 */}
        <div className="paywall-footer">
          <div className="paywall-plans">
            {(plans ?? []).map((p) => (
              <button
                key={p.id}
                className={`plan ${selected === p.id ? 'on' : ''}`}
                onClick={() => setSelected(p.id)}
              >
                {p.id === 'annual' && saving > 0 && (
                  <span className="plan-badge">{t('{n}%お得', { n: saving })}</span>
                )}
                <strong>{t(p.label)}</strong>
                <span className="plan-price">
                  {priceOf(p)}
                  {PERIOD[p.period] && <small>/{t(PERIOD[p.period])}</small>}
                </span>
                <small className="muted">{planNote(p)}</small>
                {p.trialDays > 0 && <small className="plan-trial">{t('{n}日間無料', { n: p.trialDays })}</small>}
              </button>
            ))}
          </div>

          {kind !== 'beta' && !premium && (
            <button className="primary wide" disabled={busy || !plan} onClick={handleBuy}>
              {busy ? t('処理中…') : cta}
            </button>
          )}
          {premium && kind !== 'beta' && <p className="target">{t('✓ プレミアムを利用中です')}</p>}
          {message && <p className="error">{message}</p>}

          {plan && plan.period !== 'lifetime' && (
            <p className="paywall-legal">
              {plan.trialDays
                ? t('無料期間が終わると{p}/{u}で自動更新されます。', { p: priceOf(plan), u: t(PERIOD[plan.period]) })
                : t('{p}/{u}で自動更新されます。', { p: priceOf(plan), u: t(PERIOD[plan.period]) })}
              {t('更新日の24時間前までに解約すれば料金はかかりません。解約は iPhone の「設定 → Apple ID → サブスクリプション」からいつでもできます。')}
            </p>
          )}
          <div className="paywall-links">
            {kind !== 'beta' && (
              <button className="link" disabled={busy} onClick={handleRestore}>
                {t('購入を復元')}
              </button>
            )}
            <a href={TERMS_URL} target="_blank" rel="noreferrer">
              {t('利用規約')}
            </a>
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
              {t('プライバシーポリシー')}
            </a>
          </div>
          {kind === 'test' && <p className="muted">{t('テストモード：お金はかかりません（模擬購入）。')}</p>}
        </div>
      </div>
    </div>
  )
}
