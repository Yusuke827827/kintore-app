// ChatGPT・Gemini・Claude との連携（無料プランで使えるよう、APIキーは使わずコピー＆貼り付けでやりとりする）
// 1) アプリが質問文を作ってコピー → 2) AIのサイトを開いて貼り付け → 3) 返ってきた答えをアプリに貼ると取り込める
import { getLanguage } from '../i18n'

export const AI_SERVICES = [
  { key: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { key: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app' },
  { key: 'claude', label: 'Claude', url: 'https://claude.ai/new' },
]

export async function copyAndOpen(service, prompt) {
  let copied = false
  try {
    await navigator.clipboard.writeText(prompt)
    copied = true
  } catch {
    copied = false
  }
  window.open(service.url, '_blank', 'noopener')
  return copied
}

const lang = () => (getLanguage() === 'en' ? 'English' : '日本語')

function exerciseCatalog(exercises, bodyParts, nameOf) {
  return bodyParts
    .map((p) => {
      const list = exercises.filter((e) => e.bodyPartId === p.id && e.active && !e.deleted)
      if (!list.length) return null
      return `- ${nameOf(p)}: ${list.map((e) => `${nameOf(e)}（${e.equipment}）`).join(' / ')}`
    })
    .filter(Boolean)
    .join('\n')
}

const MENU_JSON = `{
  "mysets": [
    {
      "name": "マイセットの名前",
      "weekday": 1,
      "exercises": [
        { "name": "種目名", "part": "部位名", "sets": 3, "reps": 10 }
      ]
    }
  ],
  "advice": "短いアドバイス"
}`

// メニュー作成の質問文（1日分 or 週の計画）
export function menuPrompt({ mode, partNames, levelLabel, profile, bodyTypeLabel, gymName, gymEquipment, exercises, bodyParts, nameOf, recent }) {
  const lines = [
    `あなたは経験豊富なパーソナルトレーナーです。以下の条件で筋トレメニューを作ってください。回答は${lang()}で。`,
    '',
    '## 条件',
  ]
  if (mode === 'week') {
    lines.push(`- 目指す体型：${bodyTypeLabel}`)
    lines.push(`- 週のトレーニング回数：${profile?.days ?? 3}回（曜日：${(profile?.weekdays ?? []).join(',') || 'おまかせ'}。0=日曜〜6=土曜）`)
    if (profile?.height) lines.push(`- 身長 ${profile.height}cm / 体重 ${profile.weight ?? '?'}kg / 年齢 ${profile.age ?? '?'} / 性別 ${profile.sex === 'female' ? '女性' : '男性'}`)
    lines.push(`- 経験：${profile?.level === 'beginner' ? '初心者' : profile?.level === 'advanced' ? '上級者' : '中級者'}`)
  } else {
    lines.push(`- 今日やる部位：${partNames.join('、')}`)
    lines.push(`- 強度：${levelLabel}`)
  }
  if (gymName) lines.push(`- ジム：${gymName}`)
  if (gymEquipment?.length) lines.push(`- 使える器具：${gymEquipment.join('、')}`)
  if (recent) lines.push(`- 最近の記録：${recent}`)
  lines.push('', '## 使える種目（できるだけこの中から選んで、名前はそのまま使ってください）', exerciseCatalog(exercises, bodyParts, nameOf))
  lines.push(
    '',
    '## 回答の形式',
    mode === 'week'
      ? '曜日ごとに1つずつマイセットを作り、weekday に曜日の番号（0=日〜6=土）を入れてください。'
      : 'マイセットは1つだけ作ってください（weekday は不要）。',
    '最後に、次のJSONだけをコードブロックで出してください（説明文はJSONの前に短く）。',
    '```json',
    MENU_JSON,
    '```'
  )
  return lines.join('\n')
}

export function foodPrompt(text) {
  return [
    `次の食事の、それぞれの品目のカロリーとタンパク質・脂質・炭水化物（g）を、一般的な量で概算してください。回答は${lang()}で。`,
    '',
    text,
    '',
    '次のJSONだけをコードブロックで出してください。',
    '```json',
    '{ "items": [ { "name": "品目と量", "kcal": 0, "p": 0, "f": 0, "c": 0 } ] }',
    '```',
  ].join('\n')
}

export function advicePrompt({ summary }) {
  return [
    `あなたは経験豊富なパーソナルトレーナー兼栄養士です。以下は私の最近のトレーニング・体重・食事の記録です。改善点と次の1〜2週間でやることを、具体的に5つ以内で教えてください。回答は${lang()}で。`,
    '',
    summary,
  ].join('\n')
}

// AIの答えからJSONを取り出す（```json のコードブロックや、前後の説明文があってもよい）
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    return null
  }
}

function normalize(s) {
  return (s ?? '').replace(/[\s　（）()・\-ー]/g, '').toLowerCase()
}

// AIが書いた種目名を、アプリの種目に当てはめる（見つからなければ null）
export function matchExercise(name, exercises, nameOf) {
  const n = normalize(name)
  if (!n) return null
  const list = exercises.filter((e) => !e.deleted)
  return (
    list.find((e) => normalize(e.name) === n || normalize(nameOf(e)) === n) ??
    list.find((e) => normalize(e.name).includes(n) || n.includes(normalize(e.name))) ??
    list.find((e) => normalize(nameOf(e)).includes(n) || n.includes(normalize(nameOf(e)))) ??
    null
  )
}

export function matchPart(name, bodyParts, nameOf) {
  const n = normalize(name)
  return bodyParts.find((p) => normalize(p.name) === n || normalize(nameOf(p)) === n) ??
    bodyParts.find((p) => n.includes(normalize(p.name)) || normalize(p.name).includes(n)) ??
    null
}
