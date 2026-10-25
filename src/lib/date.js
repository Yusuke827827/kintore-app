// 端末のローカル日付（日本時間）で YYYY-MM-DD を返す。
// toISOString() は UTC なので、朝9時前に記録すると前日の日付になってしまう。
import { getLanguage, t } from '../i18n'

export function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysBetween(fromStr, toStr) {
  const a = new Date(`${fromStr}T00:00:00`)
  const b = new Date(`${toStr}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

export function daysAgoLabel(dateStr, today = todayStr()) {
  if (!dateStr) return t('未実施')
  const d = daysBetween(dateStr, today)
  if (d <= 0) return t('今日')
  if (d === 1) return t('昨日')
  return t('{n}日前', { n: d })
}

// 秒 → "1:05" / "1:02:03"
export function formatClock(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = String(sec % 60).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`
  return `${m}:${s}`
}

export function formatMinutes(ms) {
  if (!ms || ms < 0) return ''
  const min = Math.round(ms / 60000)
  if (min < 1) return ''
  if (min < 60) return t('{m}分', { m: min })
  return t('{h}時間{m}分', { h: Math.floor(min / 60), m: min % 60 })
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatDateJa(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (getLanguage() === 'en') return `${WEEKDAYS_EN[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
}
