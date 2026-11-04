// 細かい筋肉（上腕二頭筋・三角筋中部など）：どの種目がどの筋肉に効くか、筋肉を選んでメニューを作る
import { availableAt, smartOrder } from './planner'

// part は大きな部位（chest など）。並び順は画面の表示順
export const MUSCLES = [
  { id: 'chest-upper', part: 'chest', name: '大胸筋（上部）' },
  { id: 'chest-mid', part: 'chest', name: '大胸筋（中部）' },
  { id: 'chest-lower', part: 'chest', name: '大胸筋（下部）' },
  { id: 'lats', part: 'back', name: '広背筋' },
  { id: 'traps', part: 'back', name: '僧帽筋' },
  { id: 'erectors', part: 'back', name: '脊柱起立筋' },
  { id: 'delt-front', part: 'shoulder', name: '三角筋（前部）' },
  { id: 'delt-side', part: 'shoulder', name: '三角筋（中部）' },
  { id: 'delt-rear', part: 'shoulder', name: '三角筋（後部）' },
  { id: 'biceps', part: 'arm', name: '上腕二頭筋' },
  { id: 'triceps', part: 'arm', name: '上腕三頭筋' },
  { id: 'forearm', part: 'arm', name: '前腕' },
  { id: 'quads', part: 'legs', name: '大腿四頭筋' },
  { id: 'hams', part: 'legs', name: 'ハムストリングス' },
  { id: 'glutes', part: 'legs', name: '大臀筋' },
  { id: 'glute-med', part: 'legs', name: '中臀筋' },
  { id: 'adductors', part: 'legs', name: '内転筋' },
  { id: 'calves', part: 'legs', name: 'ふくらはぎ' },
  { id: 'abs', part: 'core', name: '腹直筋' },
  { id: 'obliques', part: 'core', name: '腹斜筋' },
]

// 初期の種目 → [主に効く筋肉, …]、[補助で効く筋肉, …]
const M = (p, s = []) => ({ p, s })
export const EXERCISE_MUSCLES = {
  'chest-01': M(['chest-mid'], ['delt-front', 'triceps']),
  'chest-02': M(['chest-mid']),
  'chest-03': M(['chest-mid'], ['delt-front', 'triceps']),
  'chest-04': M(['chest-upper'], ['delt-front', 'triceps']),
  'chest-05': M(['chest-lower'], ['triceps']),
  'chest-06': M(['chest-mid'], ['triceps']),
  'chest-07': M(['chest-upper'], ['delt-front']),
  'chest-08': M(['chest-mid'], ['triceps']),
  'chest-09': M(['chest-upper'], ['delt-front']),
  'chest-10': M(['chest-mid']),
  'chest-11': M(['chest-lower'], ['chest-mid']),
  'chest-12': M(['chest-mid']),
  'chest-13': M(['chest-mid'], ['triceps']),
  'chest-14': M(['chest-upper'], ['delt-front']),
  'chest-15': M(['chest-lower'], ['triceps']),
  'back-01': M(['lats'], ['biceps']),
  'back-02': M(['lats', 'traps'], ['biceps', 'delt-rear']),
  'back-03': M(['lats', 'traps'], ['erectors', 'biceps']),
  'back-04': M(['erectors', 'hams', 'glutes'], ['traps', 'lats', 'forearm']),
  'back-05': M(['lats', 'traps'], ['biceps']),
  'back-06': M(['lats'], ['biceps']),
  'back-07': M(['erectors', 'hams'], ['glutes']),
  'back-08': M(['lats', 'traps'], ['biceps']),
  'back-09': M(['lats'], ['biceps']),
  'back-10': M(['lats']),
  'back-11': M(['lats'], ['biceps']),
  'back-12': M(['lats', 'traps'], ['biceps']),
  'back-13': M(['erectors'], ['glutes', 'hams']),
  'back-14': M(['traps'], ['forearm']),
  'back-15': M(['lats'], ['biceps']),
  'shoulder-01': M(['delt-front'], ['delt-side', 'triceps']),
  'shoulder-02': M(['delt-rear']),
  'shoulder-03': M(['delt-front'], ['delt-side', 'triceps']),
  'shoulder-04': M(['delt-side', 'traps']),
  'shoulder-05': M(['delt-front'], ['triceps']),
  'shoulder-06': M(['delt-front'], ['delt-side', 'triceps']),
  'shoulder-07': M(['delt-side']),
  'shoulder-08': M(['delt-rear']),
  'shoulder-09': M(['delt-front']),
  'shoulder-10': M(['delt-side']),
  'shoulder-11': M(['delt-rear'], ['traps']),
  'shoulder-12': M(['delt-rear']),
  'arm-01': M(['biceps']),
  'arm-02': M(['biceps', 'forearm']),
  'arm-03': M(['triceps']),
  'arm-04': M(['triceps']),
  'arm-05': M(['biceps'], ['forearm']),
  'arm-06': M(['biceps']),
  'arm-07': M(['biceps']),
  'arm-08': M(['triceps']),
  'arm-09': M(['triceps']),
  'arm-10': M(['triceps'], ['chest-lower']),
  'arm-11': M(['forearm']),
  'arm-12': M(['forearm'], ['biceps']),
  'arm-13': M(['biceps']),
  'arm-14': M(['triceps'], ['chest-mid']),
  'arm-15': M(['triceps']),
  'arm-16': M(['biceps']),
  'legs-01': M(['adductors', 'glute-med']),
  'legs-02': M(['hams']),
  'legs-03': M(['quads']),
  'legs-04': M(['quads'], ['glutes']),
  'legs-05': M(['quads', 'glutes'], ['hams', 'erectors']),
  'legs-06': M(['quads'], ['glutes']),
  'legs-07': M(['hams', 'glutes'], ['erectors']),
  'legs-08': M(['glutes'], ['hams']),
  'legs-09': M(['quads'], ['glutes']),
  'legs-10': M(['quads', 'glutes']),
  'legs-11': M(['glutes'], ['hams']),
  'legs-12': M(['quads'], ['glutes']),
  'legs-13': M(['quads', 'glutes']),
  'legs-14': M(['quads', 'glutes'], ['adductors']),
  'legs-15': M(['hams', 'glutes'], ['erectors']),
  'legs-16': M(['quads'], ['glutes']),
  'legs-17': M(['quads', 'glutes']),
  'legs-18': M(['calves']),
  'legs-19': M(['calves']),
  'legs-20': M(['glute-med']),
  'legs-21': M(['adductors']),
  'core-01': M(['abs']),
  'core-02': M(['obliques']),
  'core-03': M(['abs']),
  'core-04': M(['obliques']),
  'core-05': M(['abs']),
  'core-06': M(['abs']),
  'core-07': M(['abs']),
  'core-08': M(['glutes', 'hams'], ['erectors']),
  'core-09': M(['obliques']),
  'core-10': M(['abs'], ['lats']),
}

// 種目に効く筋肉。自分で作った種目は、種目に保存した muscles（主に効く筋肉）を使う
export function musclesOf(exercise) {
  if (!exercise) return { p: [], s: [] }
  if (exercise.muscles?.length) return { p: exercise.muscles, s: [] }
  return EXERCISE_MUSCLES[exercise.id] ?? { p: [], s: [] }
}

// その筋肉に効く種目：主に効くもの → 補助で効くもの。多関節を先に、よくやる種目を優先
export function exercisesForMuscle(muscleId, { exercises, sessions = [], gym }) {
  const usage = {}
  for (const s of sessions) for (const en of s.entries) usage[en.exerciseId] = (usage[en.exerciseId] ?? 0) + 1
  const pool = exercises.filter((e) => !e.deleted && availableAt(e, gym))
  const rank = (e) => {
    const m = musclesOf(e)
    return m.p.includes(muscleId) ? 0 : m.s.includes(muscleId) ? 1 : 9
  }
  return pool
    .filter((e) => rank(e) < 9)
    .sort((a, b) => rank(a) - rank(b) || (usage[b.id] ?? 0) - (usage[a.id] ?? 0) || (a.type === 'compound' ? -1 : 1) - (b.type === 'compound' ? -1 : 1))
    .map((e) => ({ exercise: e, primary: rank(e) === 0, count: usage[e.id] ?? 0 }))
}

// 筋肉ごとに、最後に（主に）鍛えた日
export function lastTrainedByMuscle(sessions, exercises) {
  const last = {}
  for (const s of sessions) {
    for (const en of s.entries) {
      const ex = exercises.find((e) => e.id === en.exerciseId)
      for (const m of musclesOf(ex).p) if (!last[m] || last[m] < s.date) last[m] = s.date
    }
  }
  return last
}

const RULES = {
  light: { per: 1, sets: 2, reps: 12 },
  standard: { per: 2, sets: 3, reps: 10 },
  advanced: { per: 3, sets: 4, reps: 8 },
}

// 選んだ筋肉に絞ったメニュー（1筋肉あたり ライト1・スタンダード2・アドバンス3種目）
export function generateMuscleMenu({ muscleIds, level = 'standard', exercises, sessions, gym }) {
  const rule = RULES[level] ?? RULES.standard
  const ids = []
  for (const m of muscleIds) {
    const list = exercisesForMuscle(m, { exercises: exercises.filter((e) => e.active), sessions, gym })
    const primary = list.filter((x) => x.primary && !ids.includes(x.exercise.id))
    const rest = list.filter((x) => !x.primary && !ids.includes(x.exercise.id))
    ids.push(...[...primary, ...rest].slice(0, rule.per).map((x) => x.exercise.id))
  }
  const ordered = smartOrder(ids, exercises)
  const targets = {}
  for (const id of ordered) {
    const iso = exercises.find((e) => e.id === id)?.type === 'isolation'
    targets[id] = { sets: level === 'advanced' && iso ? 3 : rule.sets, reps: iso ? rule.reps + 2 : rule.reps }
  }
  return { exerciseIds: ordered, targets }
}

// マイセットで鍛えられる筋肉（主に効くもの）
export function musclesOfMenu(exerciseIds, exercises) {
  const set = new Set()
  for (const id of exerciseIds) for (const m of musclesOf(exercises.find((e) => e.id === id)).p) set.add(m)
  return MUSCLES.filter((m) => set.has(m.id))
}
