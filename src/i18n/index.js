// 画面の言語切り替え。日本語の文をキーにして、英語のときだけ辞書で置き換える。
import en from './en'
import { DEFAULT_NAMES_EN } from './names'
import { initialBodyParts, initialExercises } from '../data/initialData'

export const LANGUAGES = [
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
]

let current = 'ja'

export function setLanguage(lang) {
  current = lang === 'en' ? 'en' : 'ja'
  if (typeof document !== 'undefined') document.documentElement.lang = current
}

export function getLanguage() {
  return current
}

// t('今週 {n}回', { n: 3 }) → 「今週 3回」/「3 this week」
export function t(ja, vars) {
  let s = current === 'en' ? (en[ja] ?? ja) : ja
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  }
  return s
}

// 最初から入っている部位・種目は英語名で表示する（自分で名前を変えたものはそのまま）
const DEFAULT_JA = Object.fromEntries(
  [...initialBodyParts, ...initialExercises].map((x) => [x.id, x.name])
)

export function nm(item) {
  if (!item) return ''
  if (current === 'en' && DEFAULT_NAMES_EN[item.id] && item.name === DEFAULT_JA[item.id]) {
    return DEFAULT_NAMES_EN[item.id]
  }
  return item.name
}

// 器具名（保存されている値は日本語のまま、表示だけ切り替える）
export function eq(name) {
  return t(name)
}
