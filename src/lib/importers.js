// 他のアプリからの引っ越し：CSV（Strong・Hevy・このアプリ・筋トレMEMOなど）と、
// ヘルスケア（Apple Watch）のワークアウトを、このアプリの記録に変える
import { DEFAULT_NAMES_EN } from '../i18n/names'
import { todayStr } from './date'

// ---- CSV の読み取り（" で囲まれた値・改行・, と ; と タブ区切り）----
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const first = src.split(/\r?\n/, 1)[0] ?? ''
  const delim = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0]
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[\s・\-_/.,'"]/g, '')

// Strong・Hevy でよく使われる名前 → 初期の種目
const ALIASES = {
  squat: 'legs-05',
  barbellsquat: 'legs-05',
  overheadpress: 'shoulder-03',
  barbelloverheadpress: 'shoulder-03',
  militarypress: 'shoulder-03',
  tricepspushdown: 'arm-08',
  tricepspushdowncable: 'arm-08',
  bicepcurlbarbell: 'arm-05',
  barbellbicepcurl: 'arm-05',
  bicepcurldumbbell: 'arm-01',
  dumbbellbicepcurl: 'arm-01',
  seatedcablerow: 'back-08',
  bentoverrowbarbell: 'back-03',
  barbellbentoverrow: 'back-03',
  romaniandeadlift: 'back-04',
}

// 種目名を、今ある種目（日本語名・英語名）に合わせる。Strong の「Bench Press (Dumbbell)」なども探す
function exerciseMatcher(exercises) {
  const index = new Map()
  for (const [alias, id] of Object.entries(ALIASES)) {
    const e = exercises.find((x) => x.id === id && !x.deleted)
    if (e) index.set(alias, e)
  }
  for (const e of exercises) {
    index.set(norm(e.name), e)
    if (DEFAULT_NAMES_EN[e.id]) index.set(norm(DEFAULT_NAMES_EN[e.id]), e)
  }
  return (name) => {
    const raw = String(name ?? '').trim()
    const m = raw.match(/^(.*?)\s*[(（](.*?)[)）]\s*$/)
    const base = m ? m[1] : raw
    const equip = m ? m[2] : ''
    for (const cand of [raw, `${equip} ${base}`, `${base} ${equip}`, base]) {
      const hit = index.get(norm(cand))
      if (hit) return hit
    }
    return null
  }
}

// 知らない種目の部位を名前から推測する
const PART_WORDS = [
  ['cardio', /run|treadmill|walk|bike|cycl|elliptical|row(ing)? machine|stair|swim|jog|cardio|ラン|ウォーク|ウォーキング|バイク|ジョグ|有酸素|水泳|トレッドミル/i],
  ['chest', /bench|chest|fly|pec|push ?up|dip|胸|ベンチ|フライ|腕立て|チェスト/i],
  ['back', /row|pull|lat|deadlift|chin|back|背|ロウ|プル|懸垂|デッド|ラット/i],
  ['shoulder', /shoulder|overhead|lateral|raise|delt|press$|肩|ショルダー|レイズ/i],
  ['arm', /curl|tricep|bicep|extension|pushdown|skull|腕|カール|トライセプス|二頭|三頭/i],
  ['legs', /squat|leg|lunge|calf|hip|glute|thrust|脚|スクワット|レッグ|ランジ|カーフ|ヒップ/i],
  ['core', /crunch|plank|ab|sit ?up|core|腹|クランチ|プランク|体幹|シットアップ/i],
]

function guessPart(name, cardio) {
  if (cardio) return 'cardio'
  return PART_WORDS.find(([, re]) => re.test(name))?.[0] ?? 'chest'
}

// 日付の文字列 → YYYY-MM-DD（「2024-05-01 18:30」「1 May 2024, 18:30」「2024/5/1」など）
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
export function toDate(text) {
  const s = String(text ?? '').trim()
  let m = s.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/)
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = s.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/)
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}-${m[2].padStart(2, '0')}`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : todayStr(d)
}

function toTime(text) {
  const s = String(text ?? '').trim()
  const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])).getTime()
  const d = new Date(s.replace(',', ''))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

const num = (v) => {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

// 「1h 5m」「65分」「00:45:10」→ 分
function minutesOf(text) {
  const s = String(text ?? '')
  if (!s) return null
  const hms = s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/)
  if (hms) return hms[3] != null ? Number(hms[1]) * 60 + Number(hms[2]) + Number(hms[3]) / 60 : Number(hms[1]) + Number(hms[2]) / 60
  const h = s.match(/(\d+)\s*(h|時間)/)
  const m = s.match(/(\d+)\s*(m(?!s)|min|分)/)
  if (h || m) return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
  return num(s)
}

// ---- CSV の種類を見分けて、共通の形（ワークアウト → 種目 → セット）にする ----
// 戻り値の row: { key, date, title, startedAt, finishedAt, exercise, set: { weight, reps } | { min, km, kcal }, type, note }
function detect(header) {
  const h = header.map((x) => x.trim().toLowerCase())
  const has = (...names) => names.every((n) => h.includes(n))
  if (has('exercise_title', 'set_index')) return 'hevy'
  if (has('date', 'exercise name', 'set order')) return 'strong'
  if ((h[0] === '日付' || h[0] === 'date') && (h[2] === '種目' || h[2] === 'exercise')) return 'kintore'
  return 'generic'
}

export const SOURCE_LABEL = { hevy: 'Hevy', strong: 'Strong', kintore: 'このアプリのCSV', generic: 'CSV', health: 'ヘルスケア（Apple Watch）' }

export function readCsvWorkouts(text, { lb = false } = {}) {
  const rows = parseCsv(text)
  if (rows.length < 2) return { source: null, rows: [] }
  const header = rows[0]
  const source = detect(header)
  const col = (...names) => {
    const lower = header.map((x) => x.trim().toLowerCase())
    for (const n of names) {
      const i = lower.indexOf(n.toLowerCase())
      if (i >= 0) return i
    }
    for (const n of names) {
      const i = lower.findIndex((x) => x.includes(n.toLowerCase()))
      if (i >= 0) return i
    }
    return -1
  }
  const toKg = (w) => (w == null ? null : lb ? Math.round(w * 0.45359237 * 4) / 4 : w)
  const out = []
  for (const r of rows.slice(1)) {
    const get = (i) => (i >= 0 ? r[i] : '')
    let item
    if (source === 'hevy') {
      const start = get(col('start_time'))
      const kg = header.includes('weight_kg') ? num(get(col('weight_kg'))) : num(get(col('weight_lbs'))) != null ? num(get(col('weight_lbs'))) * 0.45359237 : null
      const type = get(col('set_type'))
      item = {
        date: toDate(start),
        title: get(col('title')),
        startedAt: toTime(start),
        finishedAt: toTime(get(col('end_time'))),
        exercise: get(col('exercise_title')),
        type: type === 'warmup' ? 'warmup' : type === 'dropset' ? 'drop' : undefined,
        weight: kg != null ? Math.round(kg * 4) / 4 : null,
        reps: num(get(col('reps'))),
        km: num(get(col('distance_km'))),
        sec: num(get(col('duration_seconds'))),
        note: get(col('exercise_notes')),
      }
    } else if (source === 'strong') {
      const date = get(col('date'))
      item = {
        date: toDate(date),
        title: get(col('workout name')),
        startedAt: toTime(date),
        finishedAt: null,
        duration: minutesOf(get(col('duration'))),
        exercise: get(col('exercise name')),
        type: /^w/i.test(get(col('set order'))) ? 'warmup' : /^d/i.test(get(col('set order'))) ? 'drop' : undefined,
        weight: toKg(num(get(col('weight')))),
        reps: num(get(col('reps'))),
        km: num(get(col('distance'))) != null ? (lb ? num(get(col('distance'))) * 1.609344 : num(get(col('distance'))) / (num(get(col('distance'))) > 100 ? 1000 : 1)) : null,
        sec: num(get(col('seconds'))),
        note: get(col('notes')),
      }
    } else if (source === 'kintore') {
      // 日付,部位,種目,セット,種類,重量,回数,推定1RM,時間,距離,kcal,(ペース,歩数,歩幅,)メモ
      const kind = get(4)
      item = {
        date: toDate(get(0)),
        title: '',
        exercise: get(2),
        type: /ウォーム|warm/i.test(kind) ? 'warmup' : /ドロップ|drop/i.test(kind) ? 'drop' : undefined,
        cardio: /有酸素|cardio/i.test(kind),
        weight: num(get(5)),
        reps: num(get(6)),
        min: num(get(8)),
        km: num(get(9)),
        kcal: num(get(10)),
        note: get(header.length - 1),
      }
    } else {
      // 見出しの言葉から列を探す（筋トレMEMO など）
      item = {
        date: toDate(get(col('日付', 'date', '日時', 'day'))),
        title: '',
        exercise: get(col('種目', 'exercise', '種目名', 'メニュー', 'name')),
        weight: toKg(num(get(col('重量', 'weight', 'kg', '重さ')))),
        reps: num(get(col('回数', 'reps', 'rep', '回'))),
        min: minutesOf(get(col('時間', 'minutes', 'duration'))),
        km: num(get(col('距離', 'distance', 'km'))),
        note: get(col('メモ', 'note', 'memo')),
      }
    }
    if (!item.date || !item.exercise) continue
    out.push(item)
  }
  return { source, rows: out }
}

// 共通の形の行 → このアプリの記録（同じ日・同じワークアウト名で1回分）
export function rowsToImport(rows, source, exercises) {
  const match = exerciseMatcher(exercises)
  const newExercises = new Map()
  const sessions = new Map()
  for (const r of rows) {
    const cardio = r.cardio || ((r.weight == null || r.weight === 0) && !r.reps && (r.km || r.sec || r.min))
    let ex = match(r.exercise) ?? newExercises.get(norm(r.exercise))
    if (!ex) {
      const name = String(r.exercise).trim()
      ex = {
        id: `ex-imp-${norm(name).slice(0, 24)}-${newExercises.size}`,
        name,
        bodyPartId: guessPart(name, cardio),
        equipment: 'その他',
        type: cardio ? 'cardio' : 'compound',
        active: true,
      }
      newExercises.set(norm(name), ex)
    }
    const key = `${r.date}|${r.title ?? ''}|${r.startedAt ?? ''}`
    const s =
      sessions.get(key) ??
      sessions
        .set(key, {
          id: `imp-${source}-${r.date}-${norm(r.title || '').slice(0, 12)}-${sessions.size}`,
          date: r.date,
          bodyPartIds: [],
          entries: [],
          startedAt: r.startedAt ?? null,
          finishedAt: r.finishedAt ?? (r.startedAt && r.duration ? r.startedAt + r.duration * 60000 : null),
          updatedAt: Date.now(),
          source,
        })
        .get(key)
    let en = s.entries[s.entries.length - 1]
    if (!en || en.exerciseId !== ex.id) {
      en = { exerciseId: ex.id, sets: [] }
      if (r.note) en.note = r.note
      s.entries.push(en)
    }
    if (ex.type === 'cardio' || ex.bodyPartId === 'cardio' || cardio) {
      const min = r.min ?? (r.sec ? Math.round((r.sec / 60) * 10) / 10 : null)
      if (!min && !r.km) continue
      en.sets.push({ min: min ?? 0, ...(r.km ? { km: Math.round(r.km * 100) / 100 } : {}), ...(r.kcal ? { kcal: r.kcal } : {}) })
    } else {
      if (r.weight == null && r.reps == null) continue
      en.sets.push({ weight: r.weight ?? 0, reps: r.reps ?? 0, ...(r.type ? { type: r.type } : {}) })
    }
  }
  const list = [...sessions.values()]
    .map((s) => ({ ...s, entries: s.entries.filter((en) => en.sets.length) }))
    .filter((s) => s.entries.length)
  const allEx = [...exercises, ...newExercises.values()]
  for (const s of list) s.bodyPartIds = [...new Set(s.entries.map((en) => allEx.find((e) => e.id === en.exerciseId)?.bodyPartId).filter(Boolean))]
  // 実際に使った新しい種目だけ
  const used = new Set(list.flatMap((s) => s.entries.map((en) => en.exerciseId)))
  return { sessions: list, exercises: [...newExercises.values()].filter((e) => used.has(e.id)) }
}

// ---- ヘルスケアのワークアウト → 有酸素の記録 ----
// w: { type, start (Date の時刻), end, min, km, kcal, source }
const HK_EXERCISE = {
  running: 'cardio-07',
  runningTreadmill: 'cardio-01',
  walking: 'cardio-06',
  hiking: 'cardio-06',
  cycling: 'cardio-02',
  bikingStationary: 'cardio-02',
  elliptical: 'cardio-03',
  stairClimbing: 'cardio-04',
  stairClimbingMachine: 'cardio-04',
  stairs: 'cardio-04',
  rowing: 'cardio-05',
  rowingMachine: 'cardio-05',
}
const HK_NAME = {
  swimming: '水泳',
  swimmingPool: '水泳',
  swimmingOpenWater: '水泳',
  highIntensityIntervalTraining: 'HIIT',
  dance: 'ダンス',
  cardioDance: 'ダンス',
  yoga: 'ヨガ',
  jumpRope: '縄跳び',
  mixedCardio: 'その他の有酸素',
}
// 筋トレはこのアプリで記録しているので取り込まない
const HK_SKIP = new Set(['traditionalStrengthTraining', 'functionalStrengthTraining', 'strengthTraining', 'weightlifting', 'coreTraining', 'cooldown', 'preparationAndRecovery', 'flexibility', 'mindAndBody'])

export function healthToImport(workouts, exercises) {
  const newExercises = new Map()
  const sessions = []
  for (const w of workouts) {
    if (HK_SKIP.has(w.type) || !w.min) continue
    let exId = HK_EXERCISE[w.type]
    if (!exId || !exercises.some((e) => e.id === exId)) {
      const name = HK_NAME[w.type] ?? 'その他の有酸素'
      const found = exercises.find((e) => e.name === name) ?? newExercises.get(name)
      if (found) exId = found.id
      else {
        const ex = { id: `ex-hk-${w.type}`, name, bodyPartId: 'cardio', equipment: 'その他', type: 'cardio', active: true }
        newExercises.set(name, ex)
        exId = ex.id
      }
    }
    const set = { min: Math.round(w.min * 10) / 10 }
    if (w.km) set.km = Math.round(w.km * 100) / 100
    if (w.kcal) set.kcal = Math.round(w.kcal)
    sessions.push({
      id: `hk-${w.start}`,
      // 書き出しファイルの日付（その地域の日付）があればそれを使う
      date: w.date ?? todayStr(new Date(w.start)),
      bodyPartIds: ['cardio'],
      entries: [{ exerciseId: exId, sets: [set], ...(w.source ? { note: w.source } : {}) }],
      startedAt: w.start,
      finishedAt: w.end ?? w.start + w.min * 60000,
      updatedAt: Date.now(),
      source: 'health',
    })
  }
  return { sessions, exercises: [...newExercises.values()] }
}

// 取り込みの中身の要約（確認画面用）
export function summarize(imp) {
  const dates = imp.sessions.map((s) => s.date).sort()
  return {
    sessions: imp.sessions.length,
    sets: imp.sessions.reduce((a, s) => a + s.entries.reduce((b, en) => b + en.sets.length, 0), 0),
    from: dates[0],
    to: dates[dates.length - 1],
    newExercises: imp.exercises.map((e) => e.name),
    bodyLogs: imp.bodyLogs?.length ?? 0,
  }
}
