// 週・月・年のレポート：期間の集計、項目ごとの点数、良かった点・改善点・次の目標
import { getLanguage, nm, t } from '../i18n'
import { addDays, daysBetween, todayStr } from './date'
import { dayScore, dayTotals, metGoal } from './nutrition'
import { BODY_TYPES, nutritionTargets } from './planner'
import { e1rm, isCardioSet, isWorkingSet, weekStart } from './stats'

// 評価に使う筋トレの部位（初期の部位）
export const STRENGTH_PARTS = ['chest', 'back', 'shoulder', 'arm', 'legs', 'core']

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))
const round1 = (n) => Math.round(n * 10) / 10

// ---- 期間 ----
// kind: week（月〜日）| month | year。offset 0 が今の期間、-1 が1つ前
export function periodRange(kind, offset = 0, today = todayStr()) {
  if (kind === 'week') {
    const start = addDays(weekStart(today), offset * 7)
    return { kind, start, end: addDays(start, 6), days: 7 }
  }
  const d = new Date(`${today}T00:00:00`)
  if (kind === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth() + offset, 1)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    return { kind, start: todayStr(first), end: todayStr(last), days: last.getDate() }
  }
  const year = d.getFullYear() + offset
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  return { kind, start, end, days: daysBetween(start, end) + 1, year }
}

export function periodLabel(range) {
  const en = getLanguage() === 'en'
  const [y, m] = range.start.split('-').map(Number)
  if (range.kind === 'year') return en ? String(y) : `${y}年`
  if (range.kind === 'month') return en ? `${m}/${y}` : `${y}年${m}月`
  const md = (s) => s.slice(5).replace('-', '/').replace(/^0/, '').replace('/0', '/')
  return `${md(range.start)}〜${md(range.end)}`
}

// 期間のうち今日までに過ぎた日数（未来の期間は0、終わった期間は全日数）
function elapsedDays(range, today) {
  if (today < range.start) return 0
  if (today > range.end) return range.days
  return daysBetween(range.start, today) + 1
}

const inRange = (date, r) => date >= r.start && date <= r.end

function chrono(sessions) {
  return [...sessions].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.finishedAt ?? 0) - (b.finishedAt ?? 0)
  )
}

// 自己ベスト（推定1RM）を更新した回数。初めての種目は数えない
const prCache = new WeakMap()
function prEvents(sessions) {
  const hit = prCache.get(sessions)
  if (hit) return hit
  const events = computePrEvents(sessions)
  prCache.set(sessions, events)
  return events
}

function computePrEvents(sessions) {
  const best = {}
  const events = []
  for (const s of chrono(sessions)) {
    for (const en of s.entries) {
      const top = Math.max(0, ...en.sets.filter(isWorkingSet).map((x) => e1rm(x.weight, x.reps)))
      if (!top) continue
      if (best[en.exerciseId] != null && top > best[en.exerciseId]) events.push({ date: s.date, exerciseId: en.exerciseId })
      best[en.exerciseId] = Math.max(best[en.exerciseId] ?? 0, top)
    }
  }
  return events
}

// ---- 期間の集計 ----
export function periodStats(range, { sessions, exercises, meals = [], bodyLogs = [], profile }, today = todayStr()) {
  const ss = sessions.filter((s) => inRange(s.date, range))
  const exMap = new Map(exercises.map((e) => [e.id, e]))
  const exOf = (id) => exMap.get(id)
  const st = {
    sessions: ss.length,
    days: new Set(ss.map((s) => s.date)).size,
    sets: 0,
    volume: 0,
    cardioMin: 0,
    cardioKm: 0,
    cardioKcal: 0,
    partSets: {},
    exerciseCount: {},
    minutes: 0,
    elapsed: elapsedDays(range, today),
  }
  for (const s of ss) {
    if (s.startedAt && s.finishedAt && s.finishedAt > s.startedAt) st.minutes += Math.min(240, (s.finishedAt - s.startedAt) / 60000)
    for (const en of s.entries) {
      st.exerciseCount[en.exerciseId] = (st.exerciseCount[en.exerciseId] ?? 0) + 1
      const partId = exOf(en.exerciseId)?.bodyPartId ?? '?'
      for (const set of en.sets) {
        if (isCardioSet(set)) {
          st.cardioMin += set.min || 0
          st.cardioKm += set.km || 0
          st.cardioKcal += set.kcal || 0
        } else if (isWorkingSet(set)) {
          st.sets++
          st.volume += set.weight * set.reps
          st.partSets[partId] = (st.partSets[partId] ?? 0) + 1
        }
      }
    }
  }
  st.prs = prEvents(sessions).filter((e) => inRange(e.date, range)).length

  // 食事：記録した日の平均と、目標に対する点数
  const target = nutritionTargets(profile)
  const mealDays = [...new Set(meals.filter((m) => inRange(m.date, range)).map((m) => m.date))]
  const totals = mealDays.map((d) => dayTotals(meals, d)).filter((x) => x.kcal > 0)
  st.target = target
  st.mealDays = totals.length
  st.avgKcal = totals.length ? Math.round(totals.reduce((a, x) => a + x.kcal, 0) / totals.length) : null
  st.avgP = totals.length ? Math.round(totals.reduce((a, x) => a + x.p, 0) / totals.length) : null
  const scores = target ? totals.map((x) => dayScore(x, target)).filter((x) => x != null) : []
  st.mealScore = scores.length ? Math.round(scores.reduce((a, x) => a + x, 0) / scores.length) : null
  st.metDays = target ? totals.filter((x) => metGoal(x, target)).length : 0

  // 体重：期間の最初と最後
  const logs = bodyLogs.filter((l) => inRange(l.date, range)).sort((a, b) => (a.date < b.date ? -1 : 1))
  st.weightStart = logs[0]?.weight ?? null
  st.weightEnd = logs[logs.length - 1]?.weight ?? null
  st.weightChange = logs.length >= 2 ? round1(st.weightEnd - st.weightStart) : null
  return st
}

export function grade(score) {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

// ---- レポート ----
export function buildReport(kind, offset, data, today = todayStr()) {
  const { settings = {}, bodyParts = [], profile } = data
  const range = periodRange(kind, offset, today)
  const prevRange = periodRange(kind, offset - 1, today)
  const cur = periodStats(range, data, today)
  const prev = periodStats(prevRange, data, today)
  const focus = settings.focus ?? 'strength'
  const goal = settings.weeklyGoal || 3
  const frac = cur.elapsed / range.days // 進行中の期間は、過ぎた日数のぶんで比べる
  const word = kind === 'week' ? t('前の週') : kind === 'month' ? t('前の月') : t('前の年')
  const partName = (id) => nm(bodyParts.find((p) => p.id === id)) || id

  if (cur.elapsed === 0) return { range, cur, prev, empty: true }

  const cats = []
  const good = []
  const improve = []
  const next = []

  // 頻度
  const freqTarget = (goal * cur.elapsed) / 7
  const freq = clamp((cur.days / freqTarget) * 100)
  cats.push({ key: 'frequency', label: t('頻度'), score: freq, weight: 30, detail: t('{n}日（目安 {g}日）', { n: cur.days, g: round1(freqTarget) }) })
  if (freq >= 100) good.push(t('目安の{g}日以上トレーニングできました（{n}日）', { g: round1(freqTarget), n: cur.days }))
  else if (freq < 70) {
    improve.push(t('トレーニングは{n}日でした（目安 {g}日）', { n: cur.days, g: round1(freqTarget) }))
    next.push(t('週{g}回を目標に、曜日を決めて「計画」のカレンダーに入れる', { g: goal }))
  }

  // 筋トレのボリューム（前の期間との比較）とバランス
  const strengthOn = focus !== 'cardio' || cur.sets > 0
  if (strengthOn) {
    const prevComparable = prev.sets * (kind === 'week' ? frac : (cur.elapsed / prevRange.days))
    let vol
    if (prev.sets > 0) {
      const ratio = cur.sets / Math.max(1, prevComparable)
      vol = clamp(ratio * 85)
      const pct = Math.round((ratio - 1) * 100)
      if (ratio >= 1.05) good.push(t('セット数が{w}より{n}%増えました（{s}セット）', { w: word, n: pct, s: cur.sets }))
      else if (ratio < 0.8) improve.push(t('セット数が{w}より{n}%減りました（{s}セット）', { w: word, n: -pct, s: cur.sets }))
    } else vol = cur.sets > 0 ? 80 : 0
    cats.push({ key: 'volume', label: t('ボリューム'), score: vol, weight: focus === 'cardio' ? 10 : 25, detail: t('{s}セット・{v}kg', { s: cur.sets, v: Math.round(cur.volume).toLocaleString() }) })

    const parts = STRENGTH_PARTS.filter((id) => bodyParts.some((p) => p.id === id))
    const covered = parts.filter((id) => cur.partSets[id] > 0)
    const need = kind === 'week' ? Math.min(parts.length, goal + 2) : parts.length
    const bal = clamp((covered.length / Math.max(1, need)) * 100)
    cats.push({ key: 'balance', label: t('部位のバランス'), score: bal, weight: focus === 'cardio' ? 5 : 15, detail: t('{n}/{m}部位', { n: covered.length, m: parts.length }) })
    const missing = parts.filter((id) => !(cur.partSets[id] > 0))
    if (covered.length === parts.length && cur.sets > 0) good.push(t('すべての部位をまんべんなく鍛えられました'))
    else if (missing.length && cur.sets > 0 && bal < 100) {
      improve.push(t('{parts}をやっていません', { parts: missing.map(partName).join(t('・')) }))
      next.push(t('{part}の種目を1つ入れる', { part: partName(missing[0]) }))
    }
    const chest = cur.partSets.chest ?? 0
    const back = cur.partSets.back ?? 0
    if (chest >= 6 && back < chest * 0.66) {
      improve.push(t('背中（{b}セット）が胸（{c}セット）より少なめです', { b: back, c: chest }))
      next.push(t('背中の種目を2セット増やす（姿勢と肩の見た目が良くなります）'))
    }
  }

  // 有酸素
  const cardioGoal = settings.cardioGoal?.weeklyMin || 150
  const cardioOn = focus !== 'strength' || cur.cardioMin > 0
  if (cardioOn) {
    const target = (cardioGoal * cur.elapsed) / 7
    const sc = clamp((cur.cardioMin / target) * 100)
    cats.push({ key: 'cardio', label: t('有酸素'), score: sc, weight: focus === 'cardio' ? 35 : focus === 'mixed' ? 20 : 10, detail: t('{m}分・{k}km（目安 {g}分）', { m: Math.round(cur.cardioMin), k: round1(cur.cardioKm), g: Math.round(target) }) })
    if (sc >= 100) good.push(t('有酸素の目安（{g}分）を達成しました', { g: Math.round(target) }))
    else if (sc < 70 && focus !== 'strength') {
      improve.push(t('有酸素はあと{n}分で目安です', { n: Math.round(target - cur.cardioMin) }))
      next.push(t('有酸素を1回20分、週{n}回足す', { n: Math.max(1, Math.ceil((target - cur.cardioMin) / 20 / Math.max(1, cur.elapsed / 7))) }))
    }
  }

  // 食事
  if (cur.target && cur.mealDays > 0) {
    const coverage = Math.min(1, cur.mealDays / cur.elapsed)
    const sc = clamp((cur.mealScore ?? 0) * (0.5 + 0.5 * coverage))
    cats.push({ key: 'nutrition', label: t('食事'), score: sc, weight: 20, detail: t('{n}日記録・平均{k}kcal・P{p}g', { n: cur.mealDays, k: cur.avgKcal, p: cur.avgP }) })
    if (cur.metDays >= Math.max(2, cur.elapsed / 2)) good.push(t('食事の目標を{n}日達成しました', { n: cur.metDays }))
    if (cur.avgP < cur.target.p * 0.9) {
      improve.push(t('タンパク質が平均{n}gで、目標{g}gより少なめです', { n: cur.avgP, g: cur.target.p }))
      next.push(t('毎食たんぱく質を1品（卵・鶏むね・納豆・プロテインなど）'))
    }
    if (coverage < 0.5) {
      improve.push(t('食事の記録は{n}日だけでした', { n: cur.mealDays }))
      next.push(t('食事を毎日記録する（文章で入れるだけでOK）'))
    }
  } else if (!cur.target) {
    improve.push(t('「計画 → トレーナー」で体型を設定すると、食事も評価できます'))
  }

  // 自己ベスト・体重
  if (cur.prs > 0) good.push(t('自己ベストを{n}回更新しました', { n: cur.prs }))
  const type = BODY_TYPES.find((b) => b.key === profile?.bodyType)
  if (cur.weightChange != null && type) {
    const wantDown = type.kcal < 0
    const wantUp = type.kcal > 0
    if ((wantDown && cur.weightChange < 0) || (wantUp && cur.weightChange > 0)) {
      good.push(t('体重が{d}kg変わりました（目指す体型どおり）', { d: cur.weightChange > 0 ? `+${cur.weightChange}` : cur.weightChange }))
    } else if ((wantDown && cur.weightChange > 0.5) || (wantUp && cur.weightChange < -0.5)) {
      improve.push(t('体重が{d}kg変わりました（目指す体型と逆）', { d: cur.weightChange > 0 ? `+${cur.weightChange}` : cur.weightChange }))
    }
  }

  // 次の目標は3つまで。足りなければ伸ばす方向の目標で埋める
  const fillers = [
    t('メイン種目で、重量か回数を1つだけ上げる'),
    t('今のペースを続ける（頻度を落とさない）'),
    t('体重を週1回記録する'),
  ]
  for (const f of fillers) if (next.length < 3 && !next.includes(f)) next.push(f)

  const totalWeight = cats.reduce((a, c) => a + c.weight, 0)
  const total = Math.round(cats.reduce((a, c) => a + c.score * c.weight, 0) / totalWeight)
  return {
    range,
    cur,
    prev,
    cats,
    total,
    grade: grade(total),
    good: good.slice(0, 4),
    improve: improve.slice(0, 4),
    next: next.slice(0, 3),
    inProgress: cur.elapsed < range.days,
  }
}

// AIに評価してもらうための質問文
export function reportPrompt(report, { exercises }) {
  const c = report.cur
  const top = Object.entries(c.exerciseCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, n]) => `${nm(exercises.find((e) => e.id === id)) || id}×${n}`)
  const lines = [
    t('あなたはパーソナルトレーナーです。私の{p}のトレーニングと食事を評価して、良かった点・改善点・来週（来月）の具体的な目標を日本語で教えてください。', { p: periodLabel(report.range) }),
    '',
    `- ${t('トレーニング日数')}: ${c.days}`,
    `- ${t('本番セット数')}: ${c.sets}（${t('前の期間')} ${report.prev.sets}）`,
    `- ${t('総重量')}: ${Math.round(c.volume)}kg`,
    `- ${t('部位ごとのセット数')}: ${Object.entries(c.partSets).map(([k, v]) => `${k}:${v}`).join(', ') || '-'}`,
    `- ${t('よくやった種目')}: ${top.join(', ') || '-'}`,
    `- ${t('自己ベスト更新')}: ${c.prs}`,
    `- ${t('有酸素')}: ${Math.round(c.cardioMin)}${t('分')} ${round1(c.cardioKm)}km`,
    c.mealDays ? `- ${t('食事')}: ${c.mealDays}${t('日記録')}、${t('平均')} ${c.avgKcal}kcal / P${c.avgP}g${c.target ? `（${t('目標')} ${c.target.kcal}kcal / P${c.target.p}g）` : ''}` : `- ${t('食事')}: -`,
    c.weightChange != null ? `- ${t('体重')}: ${c.weightStart}kg → ${c.weightEnd}kg` : '',
    report.total != null ? `- ${t('アプリの点数')}: ${report.total}/100（${report.cats.map((x) => `${x.label} ${x.score}`).join(', ')}）` : '',
  ]
  return lines.filter((l) => l !== '').join('\n')
}

// ---- 年間まとめ ----
export function yearSummary(offset, data, today = todayStr()) {
  const range = periodRange('year', offset, today)
  const st = periodStats(range, data, today)
  const { sessions, exercises, bodyParts = [], settings = {} } = data
  const ss = sessions.filter((s) => inRange(s.date, range))
  // 種目ごとの最大推定1RM（その年）
  const best = {}
  for (const s of ss) {
    for (const en of s.entries) {
      for (const set of en.sets.filter(isWorkingSet)) {
        const est = e1rm(set.weight, set.reps)
        if (est > (best[en.exerciseId]?.e1rm ?? 0)) best[en.exerciseId] = { e1rm: est, weight: set.weight, reps: set.reps }
      }
    }
  }
  const bestLifts = Object.entries(best)
    .sort((a, b) => b[1].e1rm - a[1].e1rm)
    .slice(0, 3)
    .map(([id, b]) => ({ name: nm(exercises.find((e) => e.id === id)) || id, ...b }))
  const topExercises = Object.entries(st.exerciseCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => ({ name: nm(exercises.find((e) => e.id === id)) || id, count: n }))
  const topPart = Object.entries(st.partSets).sort((a, b) => b[1] - a[1])[0]
  // 月ごとの回数
  const months = Array.from({ length: 12 }, (_, i) => ss.filter((s) => Number(s.date.slice(5, 7)) === i + 1).length)
  // 目標を達成した週の最長連続
  const goal = settings.weeklyGoal || 3
  const days = {}
  for (const s of ss) (days[weekStart(s.date)] ??= new Set()).add(s.date)
  let streak = 0
  let bestStreak = 0
  for (let w = weekStart(range.start); w <= range.end; w = addDays(w, 7)) {
    streak = (days[w]?.size ?? 0) >= goal ? streak + 1 : 0
    bestStreak = Math.max(bestStreak, streak)
  }
  return {
    range,
    ...st,
    bestLifts,
    topExercises,
    topPart: topPart ? { name: nm(bodyParts.find((p) => p.id === topPart[0])) || topPart[0], sets: topPart[1] } : null,
    months,
    bestStreak,
    goal,
  }
}
