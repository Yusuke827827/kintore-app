// iPhoneアプリ版：ヘルスケア（Apple Watch のワークアウト・体重）を直接読む
import { isNativeApp } from './billing'
import { todayStr } from './date'

export function healthAvailable() {
  return isNativeApp()
}

let plugin = null
async function getHealth() {
  if (!plugin) ({ Health: plugin } = await import('@capgo/capacitor-health'))
  return plugin
}

// since（YYYY-MM-DD）以降のワークアウトと体重。初回はアクセスの許可を聞かれる
export async function readHealth({ since }) {
  const Health = await getHealth()
  const { available, reason } = await Health.isAvailable()
  if (!available) throw new Error(reason || 'ヘルスケアが使えません')
  await Health.requestAuthorization({ read: ['workouts', 'weight'], write: [] })
  const startDate = new Date(`${since}T00:00:00`).toISOString()
  const endDate = new Date().toISOString()
  const { workouts = [] } = await Health.queryWorkouts({ startDate, endDate, limit: 1000, ascending: true })
  const { samples = [] } = await Health.readSamples({ dataType: 'weight', startDate, endDate, limit: 1000, ascending: true })
  const weights = new Map()
  for (const s of samples) weights.set(todayStr(new Date(s.startDate)), Math.round(s.value * 10) / 10)
  return {
    workouts: workouts.map((w) => ({
      type: w.workoutType,
      start: Date.parse(w.startDate),
      end: Date.parse(w.endDate),
      min: w.duration / 60, // 秒 → 分
      km: w.totalDistance ? w.totalDistance / 1000 : null,
      kcal: w.totalEnergyBurned ?? null,
      source: w.sourceName,
    })),
    bodyLogs: [...weights].map(([date, weight]) => ({ id: `hk-bw-${date}`, date, weight, updatedAt: Date.now() })),
  }
}
