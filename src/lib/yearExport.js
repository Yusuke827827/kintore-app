// 年間まとめ：1枚の画像（SNS用）と、PDF用の文書
import { t } from '../i18n'
import { periodLabel } from './report'
import { FONT, PAD, W, cssVar, roundRect, shareCanvas } from './shareImage'

const fmt = (n) => Math.round(n).toLocaleString()
const tons = (kg) => (kg >= 10000 ? `${Math.round(kg / 100) / 10}t` : `${fmt(kg)}kg`)

// 年間まとめの数字（画像とPDFで同じものを使う）
export function yearTiles(y) {
  return [
    [String(y.sessions), t('回トレーニング')],
    [String(y.days), t('日')],
    [tons(y.volume), t('総重量')],
    [fmt(y.sets), t('セット')],
    [`${Math.round(y.minutes / 60)}h`, t('トレーニング時間')],
    [`${Math.round(y.cardioKm * 10) / 10}km`, t('有酸素')],
    [String(y.prs), t('自己ベスト更新')],
    [t('{n}週', { n: y.bestStreak }), t('目標の最長連続')],
  ]
}

export function drawYearImage(y, badgeCount) {
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const accent = cssVar('--accent', '#ff5a1f')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0b0b0c')
  bg.addColorStop(1, '#1d1d21')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, W, 14)

  ctx.fillStyle = accent
  ctx.font = `800 40px ${FONT}`
  ctx.fillText(t('{y} トレーニングまとめ', { y: periodLabel(y.range) }), PAD, 120)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 120px ${FONT}`
  ctx.fillText(tons(y.volume), PAD, 260)
  ctx.fillStyle = '#9b9ba3'
  ctx.font = `500 34px ${FONT}`
  ctx.fillText(t('1年で挙げた総重量'), PAD, 312)

  // 数字のタイル 2列×3段
  const tiles = yearTiles(y).filter((x) => x[1] !== t('総重量')).slice(0, 6)
  const tw = (W - PAD * 2 - 24) / 2
  tiles.forEach(([v, label], i) => {
    const x = PAD + (i % 2) * (tw + 24)
    const yy = 370 + Math.floor(i / 2) * 150
    ctx.fillStyle = '#1f1f23'
    roundRect(ctx, x, yy, tw, 128, 24)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 54px ${FONT}`
    ctx.fillText(v, x + 32, yy + 70)
    ctx.fillStyle = '#9b9ba3'
    ctx.font = `500 28px ${FONT}`
    ctx.fillText(label, x + 32, yy + 108)
  })

  // 月ごとの回数
  let top = 850
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 34px ${FONT}`
  ctx.fillText(t('月ごとの回数'), PAD, top)
  const max = Math.max(1, ...y.months)
  const bw = (W - PAD * 2) / 12
  y.months.forEach((n, i) => {
    const h = (n / max) * 150
    ctx.fillStyle = n === max && n > 0 ? accent : '#3a3a40'
    roundRect(ctx, PAD + i * bw + 8, top + 190 - h, bw - 16, Math.max(4, h), 8)
    ctx.fillStyle = '#9b9ba3'
    ctx.font = `500 22px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(String(i + 1), PAD + i * bw + bw / 2, top + 226)
    ctx.textAlign = 'left'
  })

  // ベストリフト
  top = 1130
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 34px ${FONT}`
  ctx.fillText(t('ベストリフト'), PAD, top)
  ctx.font = `500 30px ${FONT}`
  y.bestLifts.slice(0, 3).forEach((b, i) => {
    ctx.fillStyle = '#d6d6db'
    ctx.fillText(`${b.name}  ${b.weight}kg×${b.reps}`, PAD, top + 52 + i * 44)
  })
  if (!y.bestLifts.length) {
    ctx.fillStyle = '#9b9ba3'
    ctx.fillText('—', PAD, top + 52)
  }

  ctx.fillStyle = '#6e6e75'
  ctx.font = `600 26px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(`${t('バッジ')} ${badgeCount} ・ ${t('筋トレ記録')}`, W - PAD, H - 48)
  return canvas
}

export function shareYearImage(y, badgeCount) {
  return shareCanvas(drawYearImage(y, badgeCount), `kintore-${y.range.year}.png`)
}

// ---- PDF：印刷用の文書を作り、印刷画面から「PDFとして保存」 ----
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function printHtml(title, html) {
  document.getElementById('print-root')?.remove()
  const el = document.createElement('div')
  el.id = 'print-root'
  el.innerHTML = html
  document.body.appendChild(el)
  // 保存するファイル名の候補になる
  const prevTitle = document.title
  document.title = title
  const cleanup = () => {
    el.remove()
    document.title = prevTitle
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

function table(rows) {
  return `<table>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</table>`
}

export function printYear(y, badges) {
  const earned = badges.filter((b) => b.earned && b.earned >= y.range.start && b.earned <= y.range.end)
  const html = `
    <h1>${esc(t('{y} トレーニングまとめ', { y: periodLabel(y.range) }))}</h1>
    <div class="p-tiles">${yearTiles(y)
      .map(([v, l]) => `<div><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`)
      .join('')}</div>
    <h2>${esc(t('月ごとの回数'))}</h2>
    ${table([y.months.map((_, i) => t('{m}月', { m: i + 1 })), y.months.map(String)].map((r, i) => [i === 0 ? t('月') : t('回数'), ...r]))}
    <h2>${esc(t('ベストリフト'))}</h2>
    ${y.bestLifts.length ? table(y.bestLifts.map((b) => [b.name, `${b.weight}kg × ${b.reps}`, `${t('推定1RM')} ${Math.round(b.e1rm)}kg`])) : '<p>—</p>'}
    <h2>${esc(t('よくやった種目'))}</h2>
    ${y.topExercises.length ? table(y.topExercises.map((e) => [e.name, t('{n}回', { n: e.count })])) : '<p>—</p>'}
    <h2>${esc(t('その他'))}</h2>
    ${table([
      [t('いちばん鍛えた部位'), y.topPart ? `${y.topPart.name}（${y.topPart.sets}${t('セット')}）` : '—'],
      [t('有酸素'), `${Math.round(y.cardioMin)}${t('分')} / ${Math.round(y.cardioKm * 10) / 10}km / ${fmt(y.cardioKcal)}kcal`],
      [t('食事の記録'), t('{n}日', { n: y.mealDays })],
      [t('体重'), y.weightChange != null ? `${y.weightStart}kg → ${y.weightEnd}kg（${y.weightChange > 0 ? '+' : ''}${y.weightChange}kg）` : '—'],
    ])}
    <h2>${esc(t('この年に取ったバッジ'))}</h2>
    <p>${earned.length ? earned.map((b) => esc(t(b.title))).join('、') : '—'}</p>
    <p class="p-foot">${esc(t('筋トレ記録'))}</p>`
  printHtml(`kintore-${y.range.year}`, html)
}

export function printReport(report, label) {
  const c = report.cur
  const html = `
    <h1>${esc(label)}</h1>
    <p class="p-score">${esc(report.grade)} <span>${report.total}${esc(t('点'))}</span></p>
    ${table(report.cats.map((x) => [x.label, `${x.score}${t('点')}`, x.detail]))}
    ${table([
      [t('トレーニング日数'), String(c.days)],
      [t('本番セット数'), String(c.sets)],
      [t('総重量'), `${fmt(c.volume)}kg`],
      [t('有酸素'), `${Math.round(c.cardioMin)}${t('分')} / ${Math.round(c.cardioKm * 10) / 10}km`],
      [t('自己ベスト更新'), String(c.prs)],
    ])}
    <h2>${esc(t('良かった点'))}</h2><ul>${report.good.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul>
    <h2>${esc(t('改善点'))}</h2><ul>${report.improve.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul>
    <h2>${esc(t('次の目標'))}</h2><ol>${report.next.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    <p class="p-foot">${esc(t('筋トレ記録'))}</p>`
  printHtml(`kintore-report-${report.range.start}`, html)
}
