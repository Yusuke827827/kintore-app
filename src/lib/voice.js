// 声で入力：「60キロ10回」「60の10」「30分5キロ」などを数字にする
import { getLanguage } from '../i18n'

export function voiceSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// 漢数字（〜9999）を算用数字に。「六十」「百二十」「十」など
const KANJI = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
const UNIT = { 十: 10, 百: 100, 千: 1000 }
function kanjiToNumber(s) {
  return s.replace(/[〇零一二三四五六七八九十百千]+/g, (m) => {
    let total = 0
    let cur = 0
    for (const ch of m) {
      if (ch in KANJI) cur = cur * 10 + KANJI[ch]
      else {
        total += (cur || 1) * UNIT[ch]
        cur = 0
      }
    }
    return String(total + cur)
  })
}

export function parseVoice(text, cardio) {
  const s = kanjiToNumber(String(text))
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/点|てん/g, '.')
    .replace(/,/g, '')
  const n = (re) => {
    const m = s.match(re)
    return m ? Number(m[1]) : null
  }
  if (cardio) {
    const kcal = n(/(\d+)\s*(?:キロカロリー|kcal|カロリー)/i)
    const rest = s.replace(/\d+\s*(?:キロカロリー|kcal|カロリー)/gi, '')
    const m = rest.match(/(\d+(?:\.\d+)?)\s*(?:キロ|km|㎞|kilo)/i)
    return {
      min: n(/(\d+(?:\.\d+)?)\s*(?:分|ふん|ぷん|min)/i),
      km: m ? Number(m[1]) : null,
      kcal,
    }
  }
  let weight = n(/(\d+(?:\.\d+)?)\s*(?:キロ|kg|㎏|kilo|きろ)/i)
  let reps = n(/(\d+)\s*(?:回|かい|レップ|reps?|times)/i)
  // 単位なしの「60の10」「60 10」
  if (weight == null || reps == null) {
    const nums = [...s.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
    if (weight == null && reps == null && nums.length >= 2) [weight, reps] = nums
    else if (weight == null && reps != null && nums.length >= 2) weight = nums.find((x) => x !== reps) ?? null
    else if (reps == null && weight != null && nums.length >= 2) reps = nums.find((x) => x !== weight) ?? null
  }
  return { weight, reps }
}

// 1回だけ聞き取る。onResult(文字列)、onEnd()
export function listenOnce({ onResult, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  const rec = new SR()
  rec.lang = getLanguage() === 'en' ? 'en-US' : 'ja-JP'
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.onresult = (e) => onResult(e.results[0][0].transcript)
  rec.onerror = (e) => onError?.(e.error)
  rec.onend = () => onEnd?.()
  rec.start()
  return () => rec.abort()
}
