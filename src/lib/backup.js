// バックアップ：今のデータをまるごと1つのファイルにする。最後に保存した日はこの端末に覚えておく
import { todayStr } from './date'
import { downloadFile } from './csv'

const LAST_KEY = 'kintore-last-backup'
const SNOOZE_KEY = 'kintore-backup-snooze'

// 画面用に絞り込む前の、削除済みも含めた全データ
export function snapshot(data) {
  return {
    version: data.version,
    bodyParts: data.allBodyParts,
    exercises: data.allExercises,
    sessions: data.sessions,
    deletedSessionIds: data.deletedSessionIds,
    endedWorkoutIds: data.endedWorkoutIds,
    routines: data.routines,
    settings: data.settings,
    masterUpdatedAt: data.masterUpdatedAt,
    activeWorkout: data.activeWorkout,
    bodyLogs: data.bodyLogs,
    deletedBodyLogIds: data.deletedBodyLogIds,
    plans: data.plans,
    profile: data.profile,
    gym: data.gym,
    meals: data.meals,
    deletedMealIds: data.deletedMealIds,
    seedVersion: data.seedVersion,
  }
}

const read = (k) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    // 保存できなくても、ファイルの書き出しはできている
  }
}

export function downloadBackup(data) {
  downloadFile(`kintore-backup-${todayStr()}.json`, JSON.stringify(snapshot(data), null, 2), 'application/json')
  write(LAST_KEY, todayStr())
}

export function lastBackup() {
  return read(LAST_KEY)
}

export function snoozeBackup(days = 7) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  write(SNOOZE_KEY, todayStr(d))
}

// 同期していない人に、30日ごとにバックアップを勧める（記録が5回以上あるときだけ）
export function backupDue({ sessions, syncConfigured }, today = todayStr()) {
  if (syncConfigured || sessions.length < 5) return null
  const snooze = read(SNOOZE_KEY)
  if (snooze && snooze > today) return null
  const last = lastBackup()
  if (!last) return { days: null }
  const days = Math.round((new Date(`${today}T00:00:00`) - new Date(`${last}T00:00:00`)) / 86400000)
  return days >= 30 ? { days } : null
}
