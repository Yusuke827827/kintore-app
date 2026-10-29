// トレーニング記録を1枚の画像にして、スマホの共有シート（LINE・インスタ等）に渡す
import { nm, t } from '../i18n'
import { formatDateJa, formatMinutes } from './date'
import { cardioTotals, e1rm, formatPace, formatSet, isWorkingSet, personalBest, sessionVolume } from './stats'

const W = 1080
const PAD = 72
const FONT = '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif'

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

// 幅に収まるように折り返した行を返す
function wrap(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line)
      line = ch.trimStart()
    } else line += ch
  }
  if (line) lines.push(line)
  return lines
}

// 古いSafariには roundRect がないので、そのときは四角で描く
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
  ctx.fill()
}

function prExerciseIds(session, sessions) {
  const earlier = sessions.filter(
    (s) => s.id !== session.id && (s.date < session.date || (s.date === session.date && (s.finishedAt ?? 0) < (session.finishedAt ?? 0)))
  )
  const ids = new Set()
  for (const en of session.entries) {
    const best = personalBest(earlier, en.exerciseId)
    if (!best) continue
    const top = Math.max(0, ...en.sets.filter(isWorkingSet).map((s) => e1rm(s.weight, s.reps)))
    if (top > best.maxE1rm) ids.add(en.exerciseId)
  }
  return ids
}

export function drawSessionImage(session, { sessions, exercises, bodyParts }) {
  const accent = cssVar('--accent', '#4f46e5')
  const accentText = cssVar('--accent-soft', '#a5b4fc')
  const prs = prExerciseIds(session, sessions)

  // 先に高さを計算するため、同じ設定の仮キャンバスで行を組む
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = `400 34px ${FONT}`
  const blocks = session.entries.map((en) => {
    const ex = exercises.find((e) => e.id === en.exerciseId)
    const name = ex ? nm(ex) : t('（削除された種目）')
    const sets = wrap(measure, en.sets.map(formatSet).join('   '), W - PAD * 2)
    return { name, sets, pr: prs.has(en.exerciseId) }
  })
  const listHeight = blocks.reduce((h, b) => h + 56 + b.sets.length * 46 + 28, 0)
  const H = Math.max(1080, 520 + listHeight + 140)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0b0f19')
  bg.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, W, 14)

  const parts = (session.bodyPartIds ?? [])
    .map((id) => nm(bodyParts.find((p) => p.id === id)))
    .filter(Boolean)
    .join(t('＋'))

  ctx.fillStyle = accentText
  ctx.font = `600 34px ${FONT}`
  ctx.fillText(formatDateJa(session.date), PAD, 110)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 76px ${FONT}`
  for (const [i, line] of wrap(ctx, parts || t('トレーニング'), W - PAD * 2).slice(0, 2).entries()) {
    ctx.fillText(line, PAD, 200 + i * 86)
  }

  // 数字のまとめ
  const sets = session.entries.reduce((n, en) => n + en.sets.filter((s) => s.type !== 'warmup').length, 0)
  const volume = sessionVolume(session)
  const cardio = cardioTotals(session)
  const stats = volume > 0 ? [[String(session.entries.length), t('種目')], [String(sets), t('セット')], [`${Math.round(volume).toLocaleString()}`, 'kg']] : []
  // 有酸素があれば時間・距離・ペース・kcal を出す（有酸素だけの日はそれが主役）
  if (cardio.min > 0) {
    stats.push([String(cardio.min), t('分')])
    if (cardio.km > 0) stats.push([String(cardio.km), 'km'])
    if (cardio.km > 0 && volume === 0) stats.push([formatPace(cardio.min, cardio.km).replace('/km', ''), '/km'])
    if (cardio.kcal > 0) stats.push([String(Math.round(cardio.kcal)), 'kcal'])
  }
  while (stats.length > 4) stats.splice(volume > 0 ? 1 : 3, 1)
  if (stats.length === 0) stats.push([String(session.entries.length), t('種目')])
  const dur = formatMinutes((session.finishedAt ?? 0) - (session.startedAt ?? 0))
  if (dur && stats.length < 4 && cardio.min === 0) stats.push([dur, t('時間')])
  const colW = (W - PAD * 2) / stats.length
  const statsY = 380
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  roundRect(ctx, PAD - 20, statsY - 70, W - PAD * 2 + 40, 130, 24)
  stats.forEach(([v, label], i) => {
    const x = PAD + colW * i + colW / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 48px ${FONT}`
    ctx.fillText(v, x, statsY)
    ctx.fillStyle = '#9ca3af'
    ctx.font = `400 26px ${FONT}`
    ctx.fillText(label, x, statsY + 40)
  })
  ctx.textAlign = 'left'

  // 種目ごとのセット
  let y = 520
  for (const b of blocks) {
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(b.name, PAD, y)
    if (b.pr) {
      const x = PAD + ctx.measureText(b.name).width + 18
      ctx.fillStyle = '#f59e0b'
      roundRect(ctx, x, y - 34, 84, 42, 21)
      ctx.fillStyle = '#111827'
      ctx.font = `800 26px ${FONT}`
      ctx.fillText('PR', x + 24, y - 5)
    }
    y += 56
    ctx.fillStyle = '#d1d5db'
    ctx.font = `400 34px ${FONT}`
    for (const line of b.sets) {
      ctx.fillText(line, PAD, y)
      y += 46
    }
    y += 28
  }

  ctx.fillStyle = '#6b7280'
  ctx.font = `600 28px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(t('筋トレ記録'), W - PAD, H - 56)
  return canvas
}

export async function shareSessionImage(session, data) {
  const canvas = drawSessionImage(session, data)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const file = new File([blob], `kintore-${session.date}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
    }
  }
  // 共有シートが使えないブラウザでは画像を保存する
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return 'downloaded'
}
