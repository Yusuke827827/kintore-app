import {
  SEED_V2_PART_IDS,
  SEED_VERSION,
  initialBodyParts,
  initialExercises,
} from '../data/initialData'
import { DEFAULT_THEME } from './theme'

const STORAGE_KEY = 'kintore-app-data-v1'

export const DEFAULT_PROGRESSION = { on: true, reps: 10, step: 2.5 }

export const DEFAULT_SETTINGS = {
  restSeconds: 90,
  lang: 'ja',
  sound: true,
  theme: DEFAULT_THEME,
  progression: DEFAULT_PROGRESSION,
  weeklyGoal: 3,
}

// 前の版のデータに、あとから増えた初期の部位・種目（有酸素）を足す
function addNewSeeds(data) {
  if (!data || (data.seedVersion ?? 1) >= SEED_VERSION) return data
  const parts = data.bodyParts ?? initialBodyParts
  const exercises = data.exercises ?? initialExercises
  const partIds = new Set(parts.map((p) => p.id))
  const exIds = new Set(exercises.map((e) => e.id))
  const newParts = initialBodyParts.filter((p) => SEED_V2_PART_IDS.includes(p.id) && !partIds.has(p.id))
  const newExercises = initialExercises.filter(
    (e) => SEED_V2_PART_IDS.includes(e.bodyPartId) && !exIds.has(e.id)
  )
  return { ...data, bodyParts: [...parts, ...newParts], exercises: [...exercises, ...newExercises] }
}

// 古い形式の保存データも、足りない項目を補って今の形式にそろえる
export function normalizeData(raw) {
  const data = addNewSeeds(raw)
  return {
    version: 2,
    seedVersion: SEED_VERSION,
    bodyParts: data?.bodyParts ?? initialBodyParts,
    exercises: data?.exercises ?? initialExercises,
    sessions: data?.sessions ?? [],
    deletedSessionIds: data?.deletedSessionIds ?? [],
    endedWorkoutIds: data?.endedWorkoutIds ?? [],
    routines: data?.routines ?? [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...data?.settings,
      theme: { ...DEFAULT_THEME, ...data?.settings?.theme },
      progression: { ...DEFAULT_PROGRESSION, ...data?.settings?.progression },
    },
    // 初期値のままなら0。以前の版で保存されていたデータは自分で編集した可能性があるので1。
    masterUpdatedAt: data?.masterUpdatedAt ?? (data ? 1 : 0),
    activeWorkout: data?.activeWorkout ?? null,
    bodyLogs: data?.bodyLogs ?? [],
    deletedBodyLogIds: data?.deletedBodyLogIds ?? [],
    // カレンダーの予定：日付ごと（dates）と、毎週の曜日ごと（weekly: 0=日〜6=土）にマイセットを割り当てる
    plans: { dates: data?.plans?.dates ?? {}, weekly: data?.plans?.weekly ?? {} },
    // トレーナー用のプロフィール（身長・体重・目指す体型など）と、通っているジム
    profile: data?.profile ?? null,
    gym: data?.gym ?? null,
    meals: data?.meals ?? [],
    deletedMealIds: data?.deletedMealIds ?? [],
  }
}

// id ごとの和集合（同じ id は更新日時が新しい方、削除したものは除く）
function unionById(a, b, deletedA, deletedB) {
  const deleted = [...new Set([...deletedA, ...deletedB])].sort()
  const deletedSet = new Set(deleted)
  const byId = new Map()
  for (const x of [...a, ...b]) {
    if (deletedSet.has(x.id)) continue
    const cur = byId.get(x.id)
    if (!cur || (x.updatedAt ?? 0) > (cur.updatedAt ?? 0)) byId.set(x.id, x)
  }
  const list = [...byId.values()].sort((x, y) =>
    x.date !== y.date ? (x.date < y.date ? -1 : 1) : x.id < y.id ? -1 : x.id > y.id ? 1 : 0
  )
  return { list, deleted }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return normalizeData(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeData(null)
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorageが使えない環境（プライベートモード等）では保存をあきらめる
  }
}

// ブラウザに「容量が足りなくなっても消さないで」とお願いする
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {})
}

// 2つのデータ（この端末 と 同期先/バックアップ）を、どちらの記録も失わないように合わせる
// ・トレーニング記録：両方の和集合（同じ記録は新しく更新された方）。削除した記録は消したまま。
// ・部位/種目/ルーティン/設定：最後に編集された方（同時刻なら other）
// ・記録中のトレーニング：最後に更新された方（もう終了したものは除く）
export function mergeData(localRaw, otherRaw) {
  const local = normalizeData(localRaw)
  const other = normalizeData(otherRaw)

  const deleted = [...new Set([...local.deletedSessionIds, ...other.deletedSessionIds])].sort()
  const deletedSet = new Set(deleted)
  const ended = [...new Set([...local.endedWorkoutIds, ...other.endedWorkoutIds])].sort()
  const endedSet = new Set(ended)

  const byId = new Map()
  for (const s of [...local.sessions, ...other.sessions]) {
    if (deletedSet.has(s.id)) continue
    const cur = byId.get(s.id)
    if (!cur || (s.updatedAt ?? 0) > (cur.updatedAt ?? 0)) byId.set(s.id, s)
  }
  const sessions = [...byId.values()].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  )

  const master = local.masterUpdatedAt > other.masterUpdatedAt ? local : other

  const workouts = [local.activeWorkout, other.activeWorkout].filter(
    (w) => w && !endedSet.has(w.id)
  )
  workouts.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  const meals = unionById(local.meals, other.meals, local.deletedMealIds, other.deletedMealIds)

  // 体重の記録も、記録と同じく和集合（削除したものは消したまま）
  const deletedLogs = [...new Set([...local.deletedBodyLogIds, ...other.deletedBodyLogIds])].sort()
  const deletedLogSet = new Set(deletedLogs)
  const logsById = new Map()
  for (const l of [...local.bodyLogs, ...other.bodyLogs]) {
    if (deletedLogSet.has(l.id)) continue
    const cur = logsById.get(l.id)
    if (!cur || (l.updatedAt ?? 0) > (cur.updatedAt ?? 0)) logsById.set(l.id, l)
  }
  const bodyLogs = [...logsById.values()].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.id < b.id ? -1 : 1
  )

  return normalizeData({
    bodyParts: master.bodyParts,
    exercises: master.exercises,
    routines: master.routines,
    settings: master.settings,
    masterUpdatedAt: master.masterUpdatedAt,
    sessions,
    deletedSessionIds: deleted,
    endedWorkoutIds: ended,
    activeWorkout: workouts[0] ?? null,
    bodyLogs,
    deletedBodyLogIds: deletedLogs,
    plans: master.plans,
    profile: master.profile,
    gym: master.gym,
    meals: meals.list,
    deletedMealIds: meals.deleted,
  })
}
