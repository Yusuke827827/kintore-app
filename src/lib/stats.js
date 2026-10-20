// 記録データから「前回の記録」「自己ベスト」「おすすめ部位」などを計算する

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

export function isFilledSet(set) {
  return set.weight !== '' && set.reps !== '' && set.weight != null && set.reps != null
}

export function sessionVolume(session) {
  return session.entries.reduce(
    (sum, en) => sum + en.sets.reduce((s2, set) => s2 + set.weight * set.reps, 0),
    0
  )
}
