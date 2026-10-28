import { daysBetween } from '../lib/date'
import { nm, t } from '../i18n'

// 前回からの日数で色分け：0〜1日＝回復中（赤）、2日＝もう少し（黄）、3日以上＝回復済み（緑）
export function recoveryColor(days) {
  if (days == null) return 'var(--surface-2)'
  if (days <= 1) return '#ef4444'
  if (days === 2) return '#f59e0b'
  return '#22c55e'
}

// 初期の部位を人体図のどこに描くか（前・後ろ）
const SHAPES = {
  shoulder: [
    { k: 'c', cx: 31, cy: 50, r: 8 },
    { k: 'c', cx: 69, cy: 50, r: 8 },
    { k: 'c', cx: 131, cy: 50, r: 8 },
    { k: 'c', cx: 169, cy: 50, r: 8 },
  ],
  chest: [
    { x: 38, y: 47, w: 11, h: 17 },
    { x: 51, y: 47, w: 11, h: 17 },
  ],
  back: [{ x: 137, y: 46, w: 26, h: 46 }],
  arm: [
    { x: 19, y: 59, w: 9, h: 42 },
    { x: 72, y: 59, w: 9, h: 42 },
    { x: 119, y: 59, w: 9, h: 42 },
    { x: 172, y: 59, w: 9, h: 42 },
  ],
  core: [{ x: 40, y: 67, w: 20, h: 34 }],
  legs: [
    { x: 38, y: 106, w: 11, h: 66 },
    { x: 51, y: 106, w: 11, h: 66 },
    { x: 138, y: 106, w: 11, h: 66 },
    { x: 151, y: 106, w: 11, h: 66 },
  ],
}

export default function RecoveryMap({ bodyParts, lastByPart, today, selected, onToggle }) {
  const daysOf = (id) => (lastByPart[id] ? daysBetween(lastByPart[id], today) : null)
  const visible = new Set(bodyParts.map((p) => p.id))
  // 人体図に描けない自分で作った部位は下にチップで出す（有酸素は回復と関係ないので出さない）
  const others = bodyParts.filter((p) => !SHAPES[p.id] && p.id !== 'cardio')

  return (
    <div className="recovery">
      <svg viewBox="0 0 200 182" className="recovery-svg" role="img" aria-label={t('部位の回復マップ')}>
        {[50, 150].map((cx) => (
          <g key={cx} className="silhouette">
            <circle cx={cx} cy={24} r={11} />
            <rect x={cx - 15} y={40} width={30} height={64} rx={8} />
          </g>
        ))}
        {Object.entries(SHAPES).map(([id, shapes]) => {
          if (!visible.has(id)) return null
          const on = selected.includes(id)
          const style = {
            fill: recoveryColor(daysOf(id)),
            stroke: on ? 'var(--text)' : 'transparent',
            strokeWidth: on ? 2 : 0,
            cursor: 'pointer',
          }
          return (
            <g key={id} onClick={() => onToggle(id)}>
              <title>{nm(bodyParts.find((p) => p.id === id))}</title>
              {shapes.map((s, i) =>
                s.k === 'c' ? (
                  <circle key={i} cx={s.cx} cy={s.cy} r={s.r} style={style} />
                ) : (
                  <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={4} style={style} />
                )
              )}
            </g>
          )
        })}
        <text x="50" y="180" textAnchor="middle" className="recovery-label">
          {t('前')}
        </text>
        <text x="150" y="180" textAnchor="middle" className="recovery-label">
          {t('後ろ')}
        </text>
      </svg>
      {others.length > 0 && (
        <div className="chips">
          {others.map((p) => (
            <button
              key={p.id}
              className={`chip small ${selected.includes(p.id) ? 'on' : ''}`}
              onClick={() => onToggle(p.id)}
            >
              <span className="dot" style={{ background: recoveryColor(daysOf(p.id)) }} />
              {nm(p)}
            </button>
          ))}
        </div>
      )}
      <div className="legend">
        <span>
          <i style={{ background: '#ef4444' }} />
          {t('回復中')}
        </span>
        <span>
          <i style={{ background: '#f59e0b' }} />
          {t('もう少し')}
        </span>
        <span>
          <i style={{ background: '#22c55e' }} />
          {t('回復済み')}
        </span>
        <span>
          <i style={{ background: 'var(--surface-2)' }} />
          {t('未実施')}
        </span>
      </div>
    </div>
  )
}
