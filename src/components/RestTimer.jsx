import { useEffect, useRef } from 'react'
import useNow from '../hooks/useNow'
import { formatClock } from '../lib/date'
import { cancelRestAlarm, scheduleRestAlarm } from '../lib/restAlarm'

// 画面下に出るインターバルタイマー
export default function RestTimer({ endsAt, onChange }) {
  const now = useNow(250, !!endsAt)
  // now は少し古いことがあるので、表示には常に今の時刻を使う
  const remaining = endsAt ? Math.ceil((endsAt - Math.max(now, Date.now())) / 1000) : 0
  const firedRef = useRef(null)

  useEffect(() => {
    if (endsAt && remaining <= 0 && firedRef.current !== endsAt) {
      firedRef.current = endsAt
      navigator.vibrate?.([300, 150, 300])
      onChange(null)
    }
  }, [endsAt, remaining, onChange])

  if (!endsAt || remaining <= 0) return null

  function adjust(sec) {
    const next = Math.max(Date.now() + 1000, endsAt + sec * 1000)
    scheduleRestAlarm(next)
    onChange(next)
  }

  return (
    <div className="rest-timer">
      <span className="rest-label">休憩</span>
      <span className="rest-time">{formatClock(remaining)}</span>
      <button onClick={() => adjust(-15)}>−15秒</button>
      <button onClick={() => adjust(15)}>+15秒</button>
      <button
        onClick={() => {
          cancelRestAlarm()
          onChange(null)
        }}
      >
        スキップ
      </button>
    </div>
  )
}
