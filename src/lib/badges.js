// バッジ（実績）：記録から計算するだけで、保存はしない。獲得した日と、まだのものは進み具合を返す
import { addDays, daysBetween } from './date'
import { e1rm, isCardioSet, isWorkingSet, sessionVolume, weekStart } from './stats'

// icon は components/Icon の名前
export const BADGES = [
  { id: 'first', icon: 'flag', title: 'はじめの一歩', desc: '最初のトレーニングを記録', target: 1 },
  { id: 'count10', icon: 'live', title: '10回達成', desc: 'トレーニングを10回記録', target: 10 },
  { id: 'count50', icon: 'live', title: '50回達成', desc: 'トレーニングを50回記録', target: 50 },
  { id: 'count100', icon: 'live', title: '100回達成', desc: 'トレーニングを100回記録', target: 100 },
  { id: 'count300', icon: 'crown', title: '300回達成', desc: 'トレーニングを300回記録', target: 300 },
  { id: 'streak4', icon: 'flame', title: '4週連続', desc: '週の目標を4週続けて達成', target: 4 },
  { id: 'streak12', icon: 'flame', title: '12週連続', desc: '週の目標を12週続けて達成', target: 12 },
  { id: 'w60', icon: 'trophy', title: '60kgの壁', desc: '1セットで60kg以上を挙げる', target: 60 },
  { id: 'w100', icon: 'trophy', title: '100kgクラブ', desc: '1セットで100kg以上を挙げる', target: 100 },
  { id: 'w140', icon: 'crown', title: '140kgの怪力', desc: '1セットで140kg以上を挙げる', target: 140 },
  { id: 'vol10k', icon: 'bolt', title: '1日10トン', desc: '1回のトレーニングで総重量10,000kg', target: 10000 },
  { id: 'pr10', icon: 'trend', title: '自己ベスト10回', desc: '自己ベストを10回更新', target: 10 },
  { id: 'pr50', icon: 'trend', title: '自己ベスト50回', desc: '自己ベストを50回更新', target: 50 },
  { id: 'allparts', icon: 'target', title: '全身まんべんなく', desc: '1週間で胸・背中・肩・腕・脚をすべて鍛える', target: 5 },
  { id: 'early', icon: 'sun', title: '朝活', desc: '朝7時前にトレーニングを始める', target: 1 },
  { id: 'km10', icon: 'pulse', title: '1回10km', desc: '有酸素で1回に10km以上', target: 10 },
  { id: 'km100', icon: 'pulse', title: '累計100km', desc: '有酸素の距離が合計100km', target: 100 },
  { id: 'km500', icon: 'pulse', title: '累計500km', desc: '有酸素の距離が合計500km', target: 500 },
  { id: 'min1000', icon: 'pulse', title: '有酸素1000分', desc: '有酸素の時間が合計1000分', target: 1000 },
  { id: 'meal7', icon: 'bowl', title: '食事7日連続', desc: '7日続けて食事を記録', target: 7 },
  { id: 'meal30', icon: 'bowl', title: '食事30日連続', desc: '30日続けて食事を記録', target: 30 },
  { id: 'body30', icon: 'scale', title: '体重30日', desc: '体重を30日ぶん記録', target: 30 },
]

function chrono(sessions) {
  return [...sessions].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.finishedAt ?? 0) - (b.finishedAt ?? 0)
  )
}

// 連続した日（YYYY-MM-DD の集合）を古い順にたどり、n日続いた最初の日付と最長記録
function consecutive(dates, n) {
  const list = [...new Set(dates)].sort()
  let run = 0
  let best = 0
  let at = null
  for (let i = 0; i < list.length; i++) {
    run = i > 0 && daysBetween(list[i - 1], list[i]) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    if (run >= n && !at) at = list[i]
  }
  return { at, best }
}

export function computeBadges({ sessions, exercises, meals = [], bodyLogs = [], settings = {} }) {
  const got = {} // id → 獲得日
  const val = {} // id → 今の値（進み具合用）
  const hit = (id, date, value) => {
    if (value != null) val[id] = Math.max(val[id] ?? 0, value)
    const b = BADGES.find((x) => x.id === id)
    if (!got[id] && (val[id] ?? 0) >= b.target) got[id] = date
  }

  const list = chrono(sessions)
  const best = {}
  let prs = 0
  let km = 0
  let min = 0
  const weekParts = {}
  const exPart = (id) => exercises.find((e) => e.id === id)?.bodyPartId
  list.forEach((s, i) => {
    hit('first', s.date, i + 1)
    for (const id of ['count10', 'count50', 'count100', 'count300']) hit(id, s.date, i + 1)
    if (s.startedAt && new Date(s.startedAt).getHours() < 7) hit('early', s.date, 1)
    hit('vol10k', s.date, sessionVolume(s))
    const wk = weekStart(s.date)
    for (const en of s.entries) {
      const part = exPart(en.exerciseId)
      let top = 0
      let sessionKm = 0
      for (const set of en.sets) {
        if (isCardioSet(set)) {
          km += set.km || 0
          min += set.min || 0
          sessionKm += set.km || 0
          continue
        }
        if (!isWorkingSet(set)) continue
        for (const id of ['w60', 'w100', 'w140']) hit(id, s.date, set.weight)
        top = Math.max(top, e1rm(set.weight, set.reps))
        if (part) (weekParts[wk] ??= new Set()).add(part)
      }
      if (sessionKm) hit('km10', s.date, sessionKm)
      if (top) {
        if (best[en.exerciseId] != null && top > best[en.exerciseId]) prs++
        best[en.exerciseId] = Math.max(best[en.exerciseId] ?? 0, top)
      }
    }
    hit('pr10', s.date, prs)
    hit('pr50', s.date, prs)
    hit('km100', s.date, km)
    hit('km500', s.date, km)
    hit('min1000', s.date, min)
    const covered = ['chest', 'back', 'shoulder', 'arm', 'legs'].filter((p) => weekParts[wk]?.has(p)).length
    hit('allparts', s.date, covered)
  })

  // 週の目標の連続達成
  const goal = settings.weeklyGoal || 3
  const days = {}
  for (const s of list) (days[weekStart(s.date)] ??= new Set()).add(s.date)
  const weeks = Object.keys(days).sort()
  let run = 0
  let prevWeek = null
  for (const w of weeks) {
    const ok = days[w].size >= goal
    run = ok ? (prevWeek && addDays(prevWeek, 7) === w ? run + 1 : 1) : 0
    prevWeek = ok ? w : null
    const last = [...days[w]].sort().pop()
    hit('streak4', last, run)
    hit('streak12', last, run)
  }

  // 食事・体重
  const mealDates = meals.map((m) => m.date)
  const m7 = consecutive(mealDates, 7)
  const m30 = consecutive(mealDates, 30)
  val.meal7 = m7.best
  val.meal30 = m30.best
  if (m7.at) got.meal7 = m7.at
  if (m30.at) got.meal30 = m30.at
  const bodyDates = [...new Set(bodyLogs.map((l) => l.date))].sort()
  val.body30 = bodyDates.length
  if (bodyDates.length >= 30) got.body30 = bodyDates[29]

  return BADGES.map((b) => ({
    ...b,
    earned: got[b.id] ?? null,
    value: Math.round(val[b.id] ?? 0),
    progress: Math.min(1, (val[b.id] ?? 0) / b.target),
  }))
}

// 今回のトレーニングで新しく取ったバッジ
export function newBadges(data, sessionId) {
  const before = computeBadges({ ...data, sessions: data.sessions.filter((s) => s.id !== sessionId) })
  const after = computeBadges(data)
  return after.filter((b) => b.earned && !before.find((x) => x.id === b.id)?.earned)
}
