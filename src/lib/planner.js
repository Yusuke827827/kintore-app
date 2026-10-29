// 内蔵トレーナー：ルールにもとづいてメニュー作成・並べ替え・週の計画・栄養目標・アドバイスを作る
// （外部のAIは使わず、端末の中だけで計算する）
import { getLanguage, t } from '../i18n'
import { daysBetween, todayStr } from './date'
import {
  isCardio,
  isWorkingSet,
  lastTrainedByPart,
  sortSessionsDesc,
  weekStart,
  weeklyStats,
} from './stats'

// ---- 器具とジム ----
export const EQUIPMENT = ['マシン', 'バーベル', 'ダンベル', 'スミスマシン', 'ケーブル', '自重', 'その他']

// 種目の器具名 → 器具の分類（「バーベル／EZバー」はバーベル扱い）
export function equipmentKind(eq) {
  if (!eq) return 'その他'
  if (eq.startsWith('バーベル')) return 'バーベル'
  return EQUIPMENT.includes(eq) ? eq : 'その他'
}

// 主なジムに一般的に置いてある器具（店舗によって違うので、使う人がチェックして直す前提）
export const GYM_PRESETS = [
  { key: 'anytime', label: 'エニタイムフィットネス', equipment: ['マシン', 'バーベル', 'ダンベル', 'スミスマシン', 'ケーブル', '自重', 'その他'] },
  { key: 'gold', label: 'ゴールドジム', equipment: ['マシン', 'バーベル', 'ダンベル', 'スミスマシン', 'ケーブル', '自重', 'その他'] },
  { key: 'joyfit', label: 'JOYFIT24', equipment: ['マシン', 'バーベル', 'ダンベル', 'スミスマシン', 'ケーブル', '自重', 'その他'] },
  { key: 'fit365', label: 'FIT365', equipment: ['マシン', 'ダンベル', 'スミスマシン', 'ケーブル', '自重'] },
  { key: 'chocozap', label: 'chocoZAP', equipment: ['マシン', '自重'] },
  { key: 'konami', label: 'コナミスポーツ', equipment: ['マシン', 'バーベル', 'ダンベル', 'スミスマシン', 'ケーブル', '自重', 'その他'] },
  { key: 'public', label: '公共のトレーニング室', equipment: ['マシン', 'バーベル', 'ダンベル', '自重'] },
  { key: 'home', label: '自宅（ダンベルのみ）', equipment: ['ダンベル', '自重'] },
  { key: 'custom', label: 'その他（自分で選ぶ）', equipment: ['マシン', 'ダンベル', '自重'] },
]

export function presetForName(name) {
  const n = (name ?? '').replace(/\s/g, '').toLowerCase()
  if (!n) return null
  const rules = [
    [/エニタイム|anytime/, 'anytime'],
    [/ゴールド|gold/, 'gold'],
    [/joyfit|ジョイフィット/, 'joyfit'],
    [/fit365/, 'fit365'],
    [/chocozap|チョコザップ/, 'chocozap'],
    [/コナミ|konami/, 'konami'],
    [/市|区|町|村|体育館|公共|スポーツセンター/, 'public'],
    [/自宅|家|ホーム/, 'home'],
  ]
  const hit = rules.find(([re]) => re.test(n))
  return hit ? GYM_PRESETS.find((g) => g.key === hit[1]) : null
}

export function availableAt(exercise, gym) {
  if (!gym?.equipment?.length) return true
  const kind = equipmentKind(exercise.equipment)
  return kind === 'その他' || kind === '自重' || gym.equipment.includes(kind)
}

// ---- 並べ替え（おまかせ） ----
// 大きい筋肉 → 小さい筋肉、多関節 → 単関節、有酸素は最後
const PART_ORDER = { legs: 0, back: 1, chest: 2, shoulder: 3, arm: 4, core: 5, cardio: 9 }
const TYPE_ORDER = { compound: 0, isolation: 1, cardio: 2 }

export function smartOrder(exerciseIds, exercises) {
  const rank = (id) => {
    const e = exercises.find((x) => x.id === id)
    if (!e) return [8, 9]
    return [PART_ORDER[e.bodyPartId] ?? 6, TYPE_ORDER[e.type] ?? 1]
  }
  return exerciseIds
    .map((id, i) => ({ id, i, r: rank(id) }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.i - b.i)
    .map((x) => x.id)
}

// ---- メニュー自動作成 ----
export const LEVELS = [
  { key: 'light', label: 'ライト', desc: '短時間・軽め（1部位2種目×2セット）' },
  { key: 'standard', label: 'スタンダード', desc: '基本（1部位3種目×3セット）' },
  { key: 'advanced', label: 'アドバンス', desc: 'しっかり（1部位4種目×3〜4セット）' },
]

const LEVEL_RULES = {
  light: { perPart: 2, sets: 2, reps: 12 },
  standard: { perPart: 3, sets: 3, reps: 10 },
  advanced: { perPart: 4, sets: 4, reps: 8 },
}

const SMALL_PARTS = ['arm', 'core', 'shoulder']

// その部位の種目を、多関節を先に・よくやる種目を優先して選ぶ（offset で日ごとに少しずらす）
function pickForPart(partId, count, { exercises, sessions, gym, offset = 0, exclude = [] }) {
  const usage = {}
  for (const s of sessions) for (const en of s.entries) usage[en.exerciseId] = (usage[en.exerciseId] ?? 0) + 1
  const pool = exercises.filter(
    (e) => e.active && !e.deleted && e.bodyPartId === partId && availableAt(e, gym) && !exclude.includes(e.id)
  )
  const sorted = [...pool].sort(
    (a, b) =>
      (TYPE_ORDER[a.type] ?? 1) - (TYPE_ORDER[b.type] ?? 1) ||
      (usage[b.id] ?? 0) - (usage[a.id] ?? 0) ||
      pool.indexOf(a) - pool.indexOf(b)
  )
  const compounds = sorted.filter((e) => e.type === 'compound')
  const isolations = sorted.filter((e) => e.type !== 'compound')
  const rotate = (list) => (list.length ? [...list.slice(offset % list.length), ...list.slice(0, offset % list.length)] : list)
  // 多関節と単関節をバランスよく（多関節を少し多めに）
  const nCompound = Math.min(compounds.length, Math.ceil(count / 2) + (count >= 3 ? 0 : 0))
  const picked = [...rotate(compounds).slice(0, nCompound), ...rotate(isolations).slice(0, count - nCompound)]
  if (picked.length < count) {
    for (const e of sorted) if (picked.length < count && !picked.includes(e)) picked.push(e)
  }
  return picked.map((e) => e.id)
}

export function generateMenu({ partIds, level = 'standard', exercises, sessions, gym, repsOverride, setsOverride }) {
  const rule = LEVEL_RULES[level] ?? LEVEL_RULES.standard
  const ids = []
  for (const partId of partIds) {
    const n = partId === 'cardio' ? 1 : SMALL_PARTS.includes(partId) ? Math.max(1, rule.perPart - 1) : rule.perPart
    ids.push(...pickForPart(partId, n, { exercises, sessions, gym, exclude: ids }))
  }
  const ordered = smartOrder(ids, exercises)
  const targets = {}
  for (const id of ordered) {
    const e = exercises.find((x) => x.id === id)
    if (isCardio(e)) continue
    const iso = e?.type === 'isolation'
    targets[id] = {
      sets: setsOverride ?? (level === 'advanced' && iso ? 3 : rule.sets),
      reps: repsOverride ?? (iso ? rule.reps + 2 : rule.reps),
    }
  }
  return { exerciseIds: ordered, targets }
}

// ---- 目指す体型と週の計画 ----
export const BODY_TYPES = [
  {
    key: 'hosomacho',
    label: '細マッチョ',
    stars: 5,
    desc: '初心者・標準的な体型を目指す人',
    reps: 10,
    sets: 3,
    emphasis: {},
    kcal: -200,
    protein: 1.8,
    cardio: 15,
  },
  {
    key: 'v-shape',
    label: '逆三角形',
    stars: 5,
    desc: '肩・背中を広く、ウエストを引き締めたい人',
    reps: 10,
    sets: 3,
    emphasis: { shoulder: 2, back: 2, core: 1.5 },
    kcal: -150,
    protein: 2.0,
    cardio: 10,
  },
  {
    key: 'physique',
    label: 'フィジーク体型',
    stars: 5,
    desc: '全身のバランスが取れた理想的な男性体型を目指す人',
    reps: 10,
    sets: 4,
    emphasis: { shoulder: 1.5, back: 1.5, chest: 1.5 },
    kcal: 0,
    protein: 2.0,
    cardio: 10,
  },
  {
    key: 'abs',
    label: '腹筋バキバキ',
    stars: 5,
    desc: '腹筋の視認性を重視する人',
    reps: 12,
    sets: 3,
    emphasis: { core: 3 },
    kcal: -400,
    protein: 2.0,
    cardio: 25,
  },
  {
    key: 'idol',
    label: '韓国アイドル体型',
    stars: 4,
    desc: 'スリムで引き締まった体型を目指す人',
    reps: 15,
    sets: 3,
    emphasis: { shoulder: 1.5, core: 2 },
    kcal: -300,
    protein: 1.6,
    cardio: 25,
  },
  {
    key: 'beauty',
    label: '美ボディ',
    stars: 4,
    desc: '全身の筋肉バランスを重視する人',
    reps: 12,
    sets: 3,
    emphasis: { legs: 1.5, core: 1.5 },
    kcal: -100,
    protein: 1.6,
    cardio: 20,
  },
  {
    key: 'gorimacho',
    label: 'ゴリマッチョ',
    stars: 4,
    desc: '筋肉量を大きく増やしたい人',
    reps: 8,
    sets: 4,
    emphasis: { chest: 1.5, back: 1.5, legs: 1.5 },
    kcal: 400,
    protein: 2.2,
    cardio: 0,
  },
  {
    key: 'athlete',
    label: 'アスリート',
    stars: 3,
    desc: '筋力・パワー・身体能力を重視する人',
    reps: 5,
    sets: 5,
    emphasis: { legs: 2, back: 1.5 },
    kcal: 200,
    protein: 2.0,
    cardio: 15,
  },
]

// 週の回数ごとの分け方（部位id）
const SPLITS = {
  1: [['chest', 'back', 'legs', 'shoulder', 'core']],
  2: [['chest', 'shoulder', 'arm'], ['back', 'legs', 'core']],
  3: [['chest', 'shoulder', 'arm'], ['back', 'arm', 'core'], ['legs', 'core']],
  4: [['chest', 'arm'], ['back', 'core'], ['shoulder', 'arm'], ['legs', 'core']],
  5: [['chest'], ['back'], ['shoulder', 'core'], ['legs'], ['arm', 'core']],
  6: [['chest', 'shoulder'], ['back', 'arm'], ['legs', 'core'], ['chest', 'shoulder'], ['back', 'arm'], ['legs', 'core']],
}

export const DEFAULT_WEEKDAYS = {
  1: [3],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
}

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function weekdayLabel(d) {
  return getLanguage() === 'en' ? WEEKDAY_EN[d] : `${WEEKDAY_JA[d]}曜`
}

export function buildWeeklyPlan({ profile, bodyParts, exercises, sessions, gym, partName }) {
  const type = BODY_TYPES.find((b) => b.key === profile.bodyType) ?? BODY_TYPES[0]
  const days = Math.min(6, Math.max(1, profile.days ?? 3))
  const weekdays = (profile.weekdays?.length === days ? profile.weekdays : DEFAULT_WEEKDAYS[days]).slice().sort()
  const visible = new Set(bodyParts.map((p) => p.id))
  const levelKey = profile.level === 'beginner' ? 'light' : profile.level === 'advanced' ? 'advanced' : 'standard'
  const base = LEVEL_RULES[levelKey]

  return SPLITS[days].map((partsOfDay, i) => {
    let parts = partsOfDay.filter((p) => visible.has(p))
    // 重視する部位：週の回数が少ないときも毎回入れる（体幹など）
    for (const [p, w] of Object.entries(type.emphasis)) {
      if (w >= 2 && visible.has(p) && !parts.includes(p) && (p === 'core' || i % 2 === 0)) parts.push(p)
    }
    parts = [...new Set(parts)]
    // 部位ごとの種目数を決め、1日の上限（ライト5・標準7・アドバンス9）を超えたら重視しない部位から減らす
    const counts = Object.fromEntries(
      parts.map((p) => {
        const w = type.emphasis[p] ?? 1
        let n = SMALL_PARTS.includes(p) ? Math.max(1, base.perPart - 1) : base.perPart
        if (w >= 1.5) n += 1
        if (days === 1) n = Math.max(1, n - 1)
        return [p, n]
      })
    )
    const cap = { light: 5, standard: 7, advanced: 9 }[levelKey]
    while (Object.values(counts).reduce((a, b) => a + b, 0) > cap) {
      const p = [...parts]
        .filter((x) => counts[x] > 1)
        .sort((a, b) => (type.emphasis[a] ?? 1) - (type.emphasis[b] ?? 1) || counts[b] - counts[a])[0]
      if (!p) break
      counts[p]--
    }
    const ids = []
    for (const p of parts) {
      ids.push(...pickForPart(p, counts[p], { exercises, sessions, gym, offset: i, exclude: ids }))
    }
    if (type.cardio > 0 && visible.has('cardio')) ids.push(...pickForPart('cardio', 1, { exercises, sessions, gym, offset: i }))
    const ordered = smartOrder(ids, exercises)
    const targets = {}
    for (const id of ordered) {
      const e = exercises.find((x) => x.id === id)
      if (isCardio(e)) continue
      const iso = e?.type === 'isolation'
      targets[id] = { sets: iso ? Math.min(type.sets, 3) : type.sets, reps: iso ? Math.max(type.reps, 10) + 2 : type.reps }
    }
    const wd = weekdays[i]
    return {
      weekday: wd,
      partIds: parts,
      exerciseIds: ordered,
      targets,
      name: `${t(type.label)} ${weekdayLabel(wd)}：${parts.map(partName).join(t('・'))}`,
    }
  })
}

// ---- 栄養の目標 ----
export function nutritionTargets(profile) {
  if (!profile?.height || !profile?.weight) return null
  const type = BODY_TYPES.find((b) => b.key === profile.bodyType) ?? BODY_TYPES[0]
  const age = profile.age || 30
  const bmr =
    10 * profile.weight + 6.25 * profile.height - 5 * age + (profile.sex === 'female' ? -161 : 5)
  const activity = 1.375 + Math.min(6, profile.days ?? 3) * 0.035
  const kcal = Math.round((bmr * activity + type.kcal) / 10) * 10
  const p = Math.round(profile.weight * type.protein)
  const f = Math.round((kcal * 0.25) / 9)
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4))
  return { kcal, p, f, c }
}

// ---- トレーナーのアドバイス ----
// 直近の記録・体重・食事から、気づいたことを優先度順に返す
export function trainerAdvice({ sessions, exercises, bodyParts, bodyLogs, meals, profile, settings, partName, exName }) {
  const out = []
  const today = todayStr()
  const type = BODY_TYPES.find((b) => b.key === profile?.bodyType)

  if (!profile?.bodyType) {
    out.push({ icon: '👤', title: t('目指す体型を設定しましょう'), text: t('「計画 → トレーナー」で身長・体重と目指す体型を選ぶと、週のメニューと食事の目標を作れます。') })
  }
  if (sessions.length === 0) {
    out.push({ icon: '🏁', title: t('まずは1回記録してみましょう'), text: t('記録がたまるほど、アドバイスが具体的になります。') })
    return out
  }

  // 頻度
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const recentDays = new Set(sessions.filter((s) => s.date >= todayStr(fourWeeksAgo)).map((s) => s.date)).size
  const perWeek = Math.round((recentDays / 4) * 10) / 10
  const goal = settings.weeklyGoal || profile?.days || 0
  if (goal && perWeek < goal * 0.75) {
    out.push({ icon: '📅', title: t('頻度が目標より少なめです'), text: t('直近4週は週{n}回ペース（目標 週{goal}回）。予定を「計画」のカレンダーに入れておくと続けやすくなります。', { n: perWeek, goal }) })
  } else if (goal && perWeek >= goal) {
    out.push({ icon: '💪', title: t('いいペースです'), text: t('直近4週は週{n}回ペースで、目標の週{goal}回を守れています。', { n: perWeek, goal }) })
  }

  // 空いている部位
  const last = lastTrainedByPart(sessions, exercises)
  for (const p of bodyParts) {
    if (p.id === 'cardio') continue
    const d = last[p.id] ? daysBetween(last[p.id], today) : null
    if (d != null && d >= 10) {
      out.push({ icon: '⏰', title: t('{part}が{n}日空いています', { part: partName(p.id), n: d }), text: t('そろそろ入れておくと、筋力が落ちにくくなります。') })
    }
  }

  // 押す・引くのバランス（胸と背中のセット数）
  const weeks = weeklyStats(sessions, exercises)
  const wk = Object.keys(weeks).sort().slice(-4)
  const sum = (part) => wk.reduce((n, w) => n + (weeks[w].sets[part] ?? 0), 0)
  const chest = sum('chest')
  const back = sum('back')
  if (chest >= 6 && back < chest * 0.6) {
    out.push({ icon: '⚖️', title: t('背中が胸より少なめです'), text: t('直近4週で胸{c}セット・背中{b}セット。背中を増やすと姿勢と肩の見た目が良くなります。', { c: chest, b: back }) })
  }
  if (type) {
    for (const [p, w] of Object.entries(type.emphasis)) {
      if (w >= 2 && sum(p) < 8 && bodyParts.some((b) => b.id === p)) {
        out.push({ icon: '🎯', title: t('{type}には{part}が大事です', { type: t(type.label), part: partName(p) }), text: t('直近4週で{n}セット。週に2回は入れるのがおすすめです。', { n: sum(p) }) })
      }
    }
  }

  // 停滞（同じ種目で3回続けて重量も回数も伸びていない）
  const byEx = {}
  for (const s of sortSessionsDesc(sessions)) {
    for (const en of s.entries) {
      const sets = en.sets.filter(isWorkingSet)
      if (sets.length === 0) continue
      ;(byEx[en.exerciseId] ??= []).push(Math.max(...sets.map((x) => x.weight * (1 + x.reps / 30))))
    }
  }
  for (const [id, scores] of Object.entries(byEx)) {
    if (scores.length >= 3 && scores[0] <= scores[2] && scores[1] <= scores[2]) {
      out.push({ icon: '🔁', title: t('{ex}が伸び悩み中', { ex: exName(id) }), text: t('3回続けて記録が伸びていません。回数を変える（例：8回→12回）、別の種目に替える、1週間軽めにする、のどれかを試してみましょう。') })
      break
    }
  }

  // 自己ベスト
  const recent = sortSessionsDesc(sessions).slice(0, 3)
  if (recent.length && daysBetween(recent[0].date, today) <= 7) {
    out.push({ icon: '🏆', title: t('最近の記録を確認しましょう'), text: t('「履歴 → 分析」で自己ベストの更新を確認できます。') })
  }

  // 体重の変化と目指す体型
  const logs = [...bodyLogs].sort((a, b) => (a.date < b.date ? -1 : 1))
  if (type && logs.length >= 2) {
    const first = logs.find((l) => daysBetween(l.date, today) <= 28) ?? logs[0]
    const lastLog = logs[logs.length - 1]
    const diff = Math.round((lastLog.weight - first.weight) * 10) / 10
    if (type.kcal < 0 && diff > 0.5) {
      out.push({ icon: '📈', title: t('体重が増えています（{d}kg）', { d: diff > 0 ? `+${diff}` : diff }), text: t('{type}を目指すなら、食事を少し減らすか有酸素を増やしましょう。', { type: t(type.label) }) })
    } else if (type.kcal > 0 && diff < -0.3) {
      out.push({ icon: '🍚', title: t('体重が減っています（{d}kg）', { d: diff }), text: t('{type}を目指すなら、もう少し食べて体重を増やしましょう。', { type: t(type.label) }) })
    } else if (Math.abs(diff) <= 0.5 && type.kcal < 0 && daysBetween(first.date, lastLog.date) >= 21) {
      out.push({ icon: '⚖️', title: t('体重が横ばいです'), text: t('引き締めが目的なら、1日の食事を100〜200kcal減らすか、有酸素を10分増やしてみましょう。') })
    }
  } else if (logs.length === 0) {
    out.push({ icon: '⚖️', title: t('体重を記録しましょう'), text: t('「履歴 → 体重」に週1回でも入れると、体つきの変化に合わせたアドバイスができます。') })
  }

  // 食事（直近7日のタンパク質）
  const target = nutritionTargets(profile)
  if (target) {
    const week = new Date()
    week.setDate(week.getDate() - 7)
    const days = {}
    for (const m of meals) if (m.date >= todayStr(week)) days[m.date] = (days[m.date] ?? 0) + (m.p ?? 0)
    const vals = Object.values(days)
    if (vals.length >= 3) {
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      if (avg < target.p * 0.85) {
        out.push({ icon: '🥩', title: t('タンパク質が不足ぎみです'), text: t('直近の平均は1日{n}g（目標{goal}g）。鶏むね肉・卵・プロテインなどで足しましょう。', { n: avg, goal: target.p }) })
      }
    }
  }
  return out
}

// 今週・今月の予定を組み立てる
export function planFor(date, plans) {
  if (date in plans.dates) return plans.dates[date]
  const wd = new Date(`${date}T00:00:00`).getDay()
  return plans.weekly[wd] ?? null
}

export { weekStart }
