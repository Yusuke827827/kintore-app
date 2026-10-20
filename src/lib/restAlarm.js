// インターバル終了の音。✓をタップした瞬間（ユーザー操作中）に鳴らす予約をしておくと、
// iPhoneでも画面を触らずに鳴る。
let ctx = null
let scheduled = []

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function scheduleRestAlarm(endsAt) {
  cancelRestAlarm()
  const c = getCtx()
  if (!c) return
  const delay = Math.max(0, (endsAt - Date.now()) / 1000)
  for (const offset of [0, 0.3, 0.6]) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.25
    osc.connect(gain).connect(c.destination)
    const t = c.currentTime + delay + offset
    osc.start(t)
    osc.stop(t + 0.18)
    scheduled.push(osc)
  }
}

export function cancelRestAlarm() {
  for (const osc of scheduled) {
    try {
      osc.stop()
    } catch {
      // すでに止まっている
    }
  }
  scheduled = []
}
