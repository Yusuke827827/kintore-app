// 食事の集計：1日の合計・目標に対する点数・目標を満たせたか
// 日付ごとの合計を、食事の記録が変わったときだけまとめて計算しておく（何年分あっても速いように）
const totalsCache = new WeakMap()

function totalsByDate(meals) {
  let map = totalsCache.get(meals)
  if (!map) {
    map = new Map()
    for (const m of meals) {
      const tot = map.get(m.date) ?? { kcal: 0, p: 0, f: 0, c: 0 }
      for (const k of ['kcal', 'p', 'f', 'c']) tot[k] += m[k] ?? 0
      map.set(m.date, tot)
    }
    totalsCache.set(meals, map)
  }
  return map
}

export function dayTotals(meals, date) {
  return { ...(totalsByDate(meals).get(date) ?? { kcal: 0, p: 0, f: 0, c: 0 }) }
}

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
