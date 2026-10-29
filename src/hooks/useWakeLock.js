import { useEffect, useState } from 'react'

// 記録中に画面が暗くならないようにする（Screen Wake Lock。iPhone は iOS 16.4 以降で対応）
// アプリを切り替えると解除されるので、戻ってきたらもう一度お願いする
export default function useWakeLock(enabled) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled || !supported) return
    let lock = null
    let cancelled = false

    async function acquire() {
      if (document.visibilityState !== 'visible' || lock) return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        setActive(true)
        lock.addEventListener('release', () => {
          lock = null
          if (!cancelled) setActive(false)
        })
      } catch {
        // 電池残量が少ないときなど、断られることがある
        setActive(false)
      }
    }

    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      lock?.release().catch(() => {})
      lock = null
      setActive(false)
    }
  }, [enabled, supported])

  return { supported, active: enabled && supported && active }
}
