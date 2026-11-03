// 食事の集計：1日の合計・目標に対する点数・目標を満たせたか
export function dayTotals(meals, date) {
  const tot = { kcal: 0, p: 0, f: 0, c: 0 }
  for (const m of meals) {
    if (m.date !== date) continue
    for (const k of Object.keys(tot)) tot[k] += m[k] ?? 0
  }
  return tot
}

// その日の目標に対する達成度（0〜100点）。カロリーは±10%以内、タンパク質は90%以上で満点
export function dayScore(tot, target) {
  if (!target || tot.kcal === 0) return null
  const kcalRatio = tot.kcal / target.kcal
  const kcalScore = Math.max(0, 1 - Math.max(0, Math.abs(kcalRatio - 1) - 0.1) * 2)
  const pScore = Math.min(1, tot.p / (target.p * 0.9))
  const fScore = Math.max(0, 1 - Math.max(0, Math.abs(tot.f / target.f - 1) - 0.2))
  const cScore = Math.max(0, 1 - Math.max(0, Math.abs(tot.c / target.c - 1) - 0.2))
  return Math.round((kcalScore * 0.35 + pScore * 0.35 + fScore * 0.15 + cScore * 0.15) * 100)
}

export function metGoal(tot, target) {
  if (!target || tot.kcal === 0) return false
  return Math.abs(tot.kcal / target.kcal - 1) <= 0.1 && tot.p >= target.p * 0.9
}
