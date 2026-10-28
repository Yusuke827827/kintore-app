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

// 次の重量の自動アップ：前回の通常セットがすべて目標回数以上なら、重量を step だけ上げる
export function progressionFor(prevSets, progression) {
  if (!progression?.on || !prevSets) return null
  const normal = prevSets.filter((s) => !isCardioSet(s) && !s.type)
  if (normal.length === 0) return null
  if (!normal.every((s) => s.reps >= progression.reps)) return null
  return { step: progression.step, reps: progression.reps }
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

// 週の目標：今週の回数と、目標を達成した週が何週続いているか（今週は達成していれば数える）
export function weeklyGoalStatus(sessions, goal, today) {
  const daysByWeek = {}
  for (const s of sessions) (daysByWeek[weekStart(s.date)] ??= new Set()).add(s.date)
  const thisWeek = weekStart(today)
  const count = (wk) => daysByWeek[wk]?.size ?? 0
  const thisCount = count(thisWeek)
  let streak = thisCount >= goal ? 1 : 0
  const d = new Date(`${thisWeek}T00:00:00`)
  for (;;) {
    d.setDate(d.getDate() - 7)
    const wk = weekStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    if (count(wk) >= goal) streak++
    else break
  }
  const best = Object.values(daysByWeek).filter((s) => s.size >= goal).length
  return { thisCount, streak, achievedWeeks: best }
}

// 種目ごとの自己ベスト（本番セットの最大重量・推定1RM、有酸素は最長時間・最長距離）と、その日付
export function personalRecords(sessions, exercises) {
  const map = {}
  for (const s of sortSessionsDesc(sessions).reverse()) {
    for (const en of s.entries) {
      const ex = exercises.find((e) => e.id === en.exerciseId)
      const r = (map[en.exerciseId] ??= { exerciseId: en.exerciseId, cardio: isCardio(ex), lastPrDate: null })
      for (const set of en.sets) {
        if (isCardioSet(set)) {
          if (set.min > (r.min ?? 0)) Object.assign(r, { min: set.min, minDate: s.date, lastPrDate: s.date })
          if ((set.km ?? 0) > (r.km ?? 0)) Object.assign(r, { km: set.km, kmDate: s.date, lastPrDate: s.date })
          continue
        }
        if (!isWorkingSet(set)) continue
        const est = e1rm(set.weight, set.reps)
        if (set.weight > (r.weight ?? -1) || (set.weight === r.weight && set.reps > r.reps)) {
          Object.assign(r, { weight: set.weight, reps: set.reps, weightDate: s.date, lastPrDate: s.date })
        }
        if (est > (r.e1rm ?? 0)) Object.assign(r, { e1rm: est, e1rmDate: s.date, lastPrDate: s.date })
      }
    }
  }
  return Object.values(map)
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
