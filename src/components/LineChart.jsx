import { t } from '../i18n'

// 依存ライブラリなしの、シンプルな折れ線グラフ（色はCSS変数も使えるよう style で指定）
// zeroBased=false にすると縦軸を値の範囲に合わせる（体重のように変化が小さいもの用）
export default function LineChart({
  points: allPoints,
  unit,
  color = 'var(--accent-text)',
  zeroBased = true,
}) {
  const width = 300
  const height = 120
  const padding = 28

  // 点が多すぎると読めないので直近20回分
  const points = allPoints.slice(-20)
  if (points.length === 0) {
    return <p className="muted">{t('データがありません。')}</p>
  }

  const values = points.map((p) => p.value)
  const top = Math.max(...values)
  const bottom = Math.min(...values)
  const margin = zeroBased ? 0 : Math.max((top - bottom) * 0.2, 0.5)
  const maxV = top + margin
  const minV = zeroBased ? Math.min(0, bottom) : bottom - margin
  const range = maxV - minV || 1
  const crowded = points.length > 8

  function xAt(i) {
    if (points.length === 1) return padding
    return padding + (i * (width - padding * 2)) / (points.length - 1)
  }
  function yAt(v) {
    return height - padding - ((v - minV) * (height - padding * 2)) / range
  }
  // 点が多いときは、最初・最後・最大だけ数字を出す
  function showLabel(i) {
    if (!crowded) return true
    return i === 0 || i === points.length - 1 || points[i].value === top
  }

  const linePoints = points.map((p, i) => `${xAt(i)},${yAt(p.value)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart">
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        style={{ stroke: 'var(--border)' }}
      />
      <polyline points={linePoints} fill="none" strokeWidth="2" style={{ stroke: color }} />
      {points.map((p, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(p.value)} r="3" style={{ fill: color }} />
      ))}
      {points.map(
        (p, i) =>
          showLabel(i) && (
            <text
              key={`v-${i}`}
              x={xAt(i)}
              y={yAt(p.value) - 8}
              fontSize="9"
              style={{ fill: 'var(--text)' }}
              textAnchor="middle"
            >
              {Math.round(p.value * 10) / 10}
              {unit}
            </text>
          )
      )}
      {points.map(
        (p, i) =>
          showLabel(i) && (
            <text
              key={`l-${i}`}
              x={xAt(i)}
              y={height - padding + 14}
              fontSize="8"
              style={{ fill: 'var(--muted)' }}
              textAnchor="middle"
            >
              {p.label.slice(5)}
            </text>
          )
      )}
    </svg>
  )
}
