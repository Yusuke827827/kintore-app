// マイセットの色分け：カレンダーや一覧で、どのマイセットをやった日か見分ける
export const ROUTINE_COLORS = ['#ff5a1f', '#0a84ff', '#30d158', '#bf5af2', '#ffd60a', '#ff375f', '#64d2ff', '#ac8e68']

// 色を決めていないマイセットは、並び順で色を割り当てる
export function routineColor(routine, routines) {
  if (routine?.color) return routine.color
  const i = Math.max(0, routines.findIndex((r) => r.id === routine?.id))
  return ROUTINE_COLORS[i % ROUTINE_COLORS.length]
}

// 新しく作るマイセットには、まだ使っていない色を選ぶ
export function nextRoutineColor(routines) {
  const used = new Set(routines.map((r) => routineColor(r, routines)))
  return ROUTINE_COLORS.find((c) => !used.has(c)) ?? ROUTINE_COLORS[routines.length % ROUTINE_COLORS.length]
}

// その日のトレーニングがどのマイセットか。マイセットから始めた記録はその印、
// 古い記録は種目の重なり（6割以上）がいちばん大きいマイセットとみなす
export function routineOfSession(session, routines) {
  if (session.routineId) return routines.find((r) => r.id === session.routineId) ?? null
  const ids = new Set(session.entries.map((en) => en.exerciseId))
  let best = null
  let bestScore = 0
  for (const r of routines) {
    if (!r.exerciseIds.length) continue
    const inter = r.exerciseIds.filter((id) => ids.has(id)).length
    const score = inter / new Set([...r.exerciseIds, ...ids]).size
    if (score > bestScore) {
      best = r
      bestScore = score
    }
  }
  return bestScore >= 0.6 ? best : null
}
