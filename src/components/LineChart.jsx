// 依存ライブラリなしの、シンプルな折れ線グラフ
export default function LineChart({ points: allPoints, unit, color = '#818cf8' }) {
  const width = 300
  const height = 120
  const padding = 28

  // 点が多すぎると読めないので直近20回分
  const points = allPoints.slice(-20)
  if (points.length === 0) {
    return <p className="muted">データがありません。</p>
  }

  const values = points.map((p) => p.value)
  const maxV = Math.max(...values)
  const minV = Math.min(0, ...values)
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
    return i === 0 || i === points.length - 1 || points[i].value === maxV
  }

  const linePoints = points.map((p, i) => `${xAt(i)},${yAt(p.value)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart">
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#374151"
      />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(p.value)} r="3" fill={color} />
      ))}
      {points.map(
        (p, i) =>
          showLabel(i) && (
            <text
              key={`v-${i}`}
              x={xAt(i)}
              y={yAt(p.value) - 8}
              fontSize="9"
              fill="#e5e7eb"
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
              fill="#9ca3af"
              textAnchor="middle"
            >
              {p.label.slice(5)}
            </text>
          )
      )}
    </svg>
  )
}
