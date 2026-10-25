// 記録データから「前回の記録」「自己ベスト」「おすすめ部位」などを計算する
import { t } from '../i18n'

// セットの形
// ・筋トレ：{ weight, reps, type? }  type は 'warmup'（ウォームアップ）/ 'drop'（ドロップセット）/ なし（通常）
// ・有酸素：{ min, km, kcal }
export function isCardio(exercise) {
  return exercise?.type === 'cardio'
}

export function isCardioSet(set) {
  return set && 'min' in set
}

// 自己ベストやボリュームに数えるセット（ウォームアップと有酸素は除く）
export function isWorkingSet(set) {
  return !isCardioSet(set) && set.type !== 'warmup'
}

export function formatSet(set) {
  if (isCardioSet(set)) {
    const parts = [t('{m}分', { m: set.min })]
    if (set.km) parts.push(`${set.km}km`)
    if (set.kcal) parts.push(`${set.kcal}kcal`)
    return parts.join(' ')
  }
  const mark = set.type === 'warmup' ? 'W ' : set.type === 'drop' ? 'D ' : ''
  return `${mark}${set.weight}kg×${set.reps}`
}

// 推定1RM（Epley式）
export function e1rm(weight, reps) {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

// 新しい順（同じ日なら後に終わった方が先）
export function sortSessionsDesc(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return (b.finishedAt ?? 0) - (a.finishedAt ?? 0)
  })
}

// 指定日以前で最新の、その種目の記録
export function previousRecord(sessions, exerciseId, { onOrBefore, excludeId } = {}) {
  for (const s of sortSessionsDesc(sessions)) {
    if (s.id === excludeId) continue
    if (onOrBefore && s.date > onOrBefore) continue
    const entry = s.entries.find((en) => en.exerciseId === exerciseId)
    if (entry && entry.sets.length > 0) return { date: s.date, sets: entry.sets, note: entry.note }
  }
  return null
}

// 種目の自己ベスト（最大重量・最大推定1RM）
export function personalBest(sessions, exerciseId, excludeId) {
  let maxWeight = 0
  let maxE1rm = 0
  let found = false
  for (const s of sessions) {
    if (s.id === excludeId) continue
    for (const en of s.entries) {
      if (en.exerciseId !== exerciseId) continue
      for (const set of en.sets) {
        if (!isWorkingSet(set)) continue
        found = true
        maxWeight = Math.max(maxWeight, set.weight)
        maxE1rm = Math.max(maxE1rm, e1rm(set.weight, set.reps))
      }
    }
  }
  return found ? { maxWeight, maxE1rm } : null
}

// セッションで実際に鍛えた部位（記録した種目の部位 ＋ 選んだ部位）
export function sessionPartIds(session, exercises) {
  const ids = new Set(session.bodyPartIds ?? [])
  for (const en of session.entries) {
    const ex = exercises.find((e) => e.id === en.exerciseId)
    if (ex) ids.add(ex.bodyPartId)
  }
  return [...ids]
}

// 部位ごとの最終実施日
export function lastTrainedByPart(sessions, exercises) {
  const map = {}
  for (const s of sessions) {
    for (const id of sessionPartIds(s, exercises)) {
      if (!map[id] || map[id] < s.date) map[id] = s.date
    }
  }
  return map
}

// 今日のおすすめ部位
// ・上半身：いちばん長く休んでいる部位（ローテーション）
// ・下半身／体幹：直近4回のうち半分以上でやっていれば今日もやる前提
export function suggestParts(bodyParts, sessions, exercises) {
  const last = lastTrainedByPart(sessions, exercises)
  const byGroup = (g) => bodyParts.filter((p) => p.group === g)
  const leastRecent = (parts) =>
    [...parts].sort((a, b) => (last[a.id] ?? '') < (last[b.id] ?? '') ? -1 : (last[a.id] ?? '') > (last[b.id] ?? '') ? 1 : 0)[0]

  const result = []
  const upper = leastRecent(byGroup('upper'))
  if (upper) result.push(upper.id)

  const recent = sortSessionsDesc(sessions).slice(0, 4).map((s) => sessionPartIds(s, exercises))
  for (const group of ['lower', 'core']) {
    const parts = byGroup(group)
    if (parts.length === 0 || recent.length === 0) continue
    const groupIds = new Set(parts.map((p) => p.id))
    const hits = recent.filter((ids) => ids.some((id) => groupIds.has(id))).length
    if (hits * 2 >= recent.length) result.push(leastRecent(parts).id)
  }
  if (result.length === 0 && bodyParts[0]) result.push(bodyParts[0].id)
  return result
}

// その部位を最後にやったときの種目（＝今日もそのまま使うメニュー）
export function lastExercisesForPart(sessions, exercises, partId) {
  const activeIds = new Set(exercises.filter((e) => e.active && e.bodyPartId === partId).map((e) => e.id))
  for (const s of sortSessionsDesc(sessions)) {
    const ids = s.entries.map((en) => en.exerciseId).filter((id) => activeIds.has(id))
    if (ids.length > 0) return ids
  }
  return []
}

// その部位で一度でもやったことのある種目（最近やった順）
export function doneExercisesForPart(sessions, exercises, partId) {
  const activeIds = new Set(exercises.filter((e) => e.active && e.bodyPartId === partId).map((e) => e.id))
  const seen = []
  for (const s of sortSessionsDesc(sessions)) {
    for (const en of s.entries) {
      if (activeIds.has(en.exerciseId) && !seen.includes(en.exerciseId)) seen.push(en.exerciseId)
    }
  }
  return seen
}

// 記録中の入力欄が埋まっているか（有酸素は時間だけでOK）
export function isFilledSet(set) {
  if (isCardioSet(set)) return set.min !== '' && set.min != null
  return set.weight !== '' && set.reps !== '' && set.weight != null && set.reps != null
}

// 入力欄の文字列 → 保存する数値
export function toStoredSet(set) {
  if (isCardioSet(set)) {
    const out = { min: Number(set.min) }
    if (set.km !== '' && set.km != null) out.km = Number(set.km)
    if (set.kcal !== '' && set.kcal != null) out.kcal = Number(set.kcal)
    return out
  }
  const out = { weight: Number(set.weight), reps: Number(set.reps) }
  if (set.type) out.type = set.type
  return out
}

// 保存した数値 → 入力欄の文字列（記録を修正するとき）
export function toDraftSet(set) {
  if (isCardioSet(set)) {
    return { min: String(set.min), km: set.km != null ? String(set.km) : '', kcal: set.kcal != null ? String(set.kcal) : '', done: true }
  }
  return { weight: String(set.weight), reps: String(set.reps), type: set.type, done: true }
}

// 新しく始めるときの空のセット（前回のセットの種類はそのまま引き継ぐ）
export function emptySet(cardio, like) {
  if (cardio) return { min: '', km: '', kcal: '', done: false }
  return { weight: '', reps: '', done: false, ...(like?.type ? { type: like.type } : {}) }
}

// 月曜はじまりの週の初日
export function weekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 週ごと・部位ごとの本番セット数とボリューム（ウォームアップは除く）、有酸素の分数
export function weeklyStats(sessions, exercises) {
  const weeks = {}
  for (const s of sessions) {
    const wk = weekStart(s.date)
    const w = (weeks[wk] ??= { sets: {}, volume: {}, cardioMin: 0, days: new Set() })
    w.days.add(s.date)
    for (const en of s.entries) {
      const partId = exercises.find((e) => e.id === en.exerciseId)?.bodyPartId ?? '?'
      for (const set of en.sets) {
        if (isCardioSet(set)) {
          w.cardioMin += set.min || 0
          continue
        }
        if (!isWorkingSet(set)) continue
        w.sets[partId] = (w.sets[partId] ?? 0) + 1
        w.volume[partId] = (w.volume[partId] ?? 0) + set.weight * set.reps
      }
    }
  }
  return weeks
}

export function sessionVolume(session) {
  return session.entries.reduce(
    (sum, en) =>
      sum + en.sets.filter(isWorkingSet).reduce((s2, set) => s2 + set.weight * set.reps, 0),
    0
  )
}
