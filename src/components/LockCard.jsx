import { usePremium } from '../state/PremiumContext'
import { FEATURES } from '../lib/pricing'
import { t } from '../i18n'

// 無料版で、プレミアムの機能の代わりに出す案内（タップで有料の画面）
export default function LockCard({ feature }) {
  const { openPaywall } = usePremium()
  const f = FEATURES.find((x) => x.key === feature)
  return (
    <button className="lock-card" onClick={() => openPaywall(feature)}>
      <span>
        🔒 {t(f.label)}
        <small>{t(f.desc)}</small>
      </span>
      <span className="pro-tag">PRO</span>
    </button>
  )
}
