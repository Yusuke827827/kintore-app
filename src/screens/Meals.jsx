import { useState } from 'react'
import { useData } from '../state/DataContext'
import AiBridge from '../components/AiBridge'
import { formatDateJa, todayStr } from '../lib/date'
import { nutritionTargets } from '../lib/planner'
import { FOODS, foodLabel, parseMealText, searchFoods } from '../lib/foods'
import { extractJson, foodPrompt } from '../lib/aiBridge'
import { getLanguage, t } from '../i18n'

const MEAL_TYPES = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
]
const NUTRIENTS = [
  { key: 'kcal', label: 'カロリー', unit: 'kcal', color: '#f59e0b' },
  { key: 'p', label: 'タンパク質', unit: 'g', color: '#ef4444' },
  { key: 'f', label: '脂質', unit: 'g', color: '#eab308' },
  { key: 'c', label: '炭水化物', unit: 'g', color: '#3b82f6' },
]

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

function dayTotals(meals, date) {
  const tot = { kcal: 0, p: 0, f: 0, c: 0 }
  for (const m of meals) {
    if (m.date !== date) continue
    for (const k of Object.keys(tot)) tot[k] += m[k] ?? 0
  }
  return tot
}

// その日の目標に対する達成度（0〜100点）。カロリーは±10%以内、タンパク質は90%以上で満点
function dayScore(tot, target) {
  if (!target || tot.kcal === 0) return null
  const kcalRatio = tot.kcal / target.kcal
  const kcalScore = Math.max(0, 1 - Math.max(0, Math.abs(kcalRatio - 1) - 0.1) * 2)
  const pScore = Math.min(1, tot.p / (target.p * 0.9))
  const fScore = Math.max(0, 1 - Math.max(0, Math.abs(tot.f / target.f - 1) - 0.2))
  const cScore = Math.max(0, 1 - Math.max(0, Math.abs(tot.c / target.c - 1) - 0.2))
  return Math.round((kcalScore * 0.35 + pScore * 0.35 + fScore * 0.15 + cScore * 0.15) * 100)
}

function metGoal(tot, target) {
  if (!target || tot.kcal === 0) return false
  return Math.abs(tot.kcal / target.kcal - 1) <= 0.1 && tot.p >= target.p * 0.9
}

function scoreColor(score) {
  if (score == null) return 'transparent'
  if (score >= 85) return '#22c55e'
  if (score >= 65) return '#eab308'
  return '#ef4444'
}

function Bars({ tot, target }) {
  return (
    <div className="nutri-bars">
      {NUTRIENTS.map((n) => {
        const goal = target?.[n.key]
        const v = Math.round(tot[n.key])
        const pct = goal ? Math.min(150, (v / goal) * 100) : 0
        return (
          <div key={n.key} className="nutri-row">
            <span className="nutri-label">{t(n.label)}</span>
            <div className="nutri-track">
              <div className="nutri-fill" style={{ width: `${(pct / 150) * 100}%`, background: n.color }} />
              {goal && <div className="nutri-goal" style={{ left: `${(100 / 150) * 100}%` }} />}
            </div>
            <span className="nutri-val">
              {v}
              {goal ? <small>/{goal}{n.unit}</small> : <small>{n.unit}</small>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MealCalendar({ meals, target, onPick, selected }) {
  const [offset, setOffset] = useState(0)
  const base = new Date()
  base.setDate(1)
  base.setMonth(base.getMonth() + offset)
  const y = base.getFullYear()
  const m = base.getMonth()
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(todayStr(new Date(y, m, d)))
  const dows = getLanguage() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['月', '火', '水', '木', '金', '土', '日']
  return (
    <section className="card">
      <div className="cal-header">
        <button className="ghost" onClick={() => setOffset(offset - 1)}>
          ‹
        </button>
        <h2>{t('{y}年{m}月', { y, m: m + 1 })}</h2>
        <button className="ghost" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
          ›
        </button>
      </div>
      <div className="calendar">
        {dows.map((w) => (
          <span key={w} className="dow">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const score = dayScore(dayTotals(meals, d), target)
          return (
            <button
              key={i}
              className={`day meal-day ${d === selected ? 'today' : ''}`}
              style={{ boxShadow: score != null ? `inset 0 -4px 0 ${scoreColor(score)}` : 'none' }}
              onClick={() => onPick(d)}
            >
              {Number(d.slice(8))}
            </button>
          )
        })}
      </div>
      <div className="legend">
        <span>
          <i style={{ background: '#22c55e' }} />
          {t('目標どおり')}
        </span>
        <span>
          <i style={{ background: '#eab308' }} />
          {t('少しずれ')}
        </span>
        <span>
          <i style={{ background: '#ef4444' }} />
          {t('大きくずれ')}
        </span>
      </div>
    </section>
  )
}

function AddMeal({ date, mealType, onDone }) {
  const { saveMeal } = useData()
  const [text, setText] = useState('')
  const [items, setItems] = useState(null)
  const [unknown, setUnknown] = useState([])
  const [q, setQ] = useState('')

  function read() {
    const r = parseMealText(text)
    setItems(r.items)
    setUnknown(r.unknown)
  }
  function addFood(food) {
    const base = food.unit === 'g' ? `${food.name}100g` : `${food.name}1${food.unit}`
    setItems([...(items ?? []), { name: base, kcal: food.kcal, p: food.p, f: food.f, c: food.c }])
  }
  function editItem(i, key, v) {
    setItems(items.map((x, k) => (k === i ? { ...x, [key]: key === 'name' ? v : Number(v) || 0 } : x)))
  }
  function saveAll() {
    for (const it of items) saveMeal({ date, meal: mealType, ...it })
    onDone()
  }

  return (
    <div className="add-meal">
      <textarea
        className="memo-area"
        rows={3}
        placeholder={t('食べたものを書く（例：鶏むね肉200g、ご飯大盛り、卵2個）')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="secondary wide" onClick={read} disabled={!text.trim()}>
        {t('栄養を計算する')}
      </button>
      {unknown.length > 0 && (
        <p className="muted">{t('わからなかったもの：{list}（下の一覧から選ぶか、AIに聞いてください）', { list: unknown.join('、') })}</p>
      )}
      <details>
        <summary className="muted">{t('一覧から選ぶ')}</summary>
        <input className="search" placeholder={t('食品を検索')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {searchFoods(q).map((f) => (
            <button key={f.name} className="chip small" onClick={() => addFood(f)}>
              {foodLabel(f)}
            </button>
          ))}
        </div>
      </details>
      <AiBridge
        hint={t('ChatGPT・Gemini・Claudeに栄養を計算してもらえます。上に書いた食事が質問文になります。')}
        buildPrompt={() => foodPrompt(text || t('（ここに食べたものを書いてください）'))}
        onImport={(answer) => {
          const data = extractJson(answer)
          if (!Array.isArray(data?.items)) return { ok: false, message: t('答えの中に栄養のJSONが見つかりませんでした。') }
          const list = data.items.map((x) => ({
            name: String(x.name ?? '').slice(0, 40),
            kcal: Math.round(Number(x.kcal) || 0),
            p: Number(x.p) || 0,
            f: Number(x.f) || 0,
            c: Number(x.c) || 0,
          }))
          setItems([...(items ?? []), ...list])
          return { ok: true, message: t('{n}品を取り込みました。確認して保存してください。', { n: list.length }) }
        }}
        importLabel={t('答えを取り込む')}
      />
      {items && items.length > 0 && (
        <>
          <ul className="plain-list meal-items">
            {items.map((it, i) => (
              <li key={i}>
                <input className="grow" value={it.name} onChange={(e) => editItem(i, 'name', e.target.value)} />
                <div className="meal-nums">
                  {['kcal', 'p', 'f', 'c'].map((k) => (
                    <label key={k}>
                      <small>{k === 'kcal' ? 'kcal' : k.toUpperCase()}</small>
                      <input type="number" inputMode="decimal" value={it[k]} onChange={(e) => editItem(i, k, e.target.value)} />
                    </label>
                  ))}
                  <button className="ghost danger" onClick={() => setItems(items.filter((_, k) => k !== i))}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button className="primary wide" onClick={saveAll}>
            {t('記録する')}
          </button>
        </>
      )}
      <button className="link" onClick={onDone}>
        {t('閉じる')}
      </button>
    </div>
  )
}

export default function Meals() {
  const { meals, profile, deleteMeal } = useData()
  const today = todayStr()
  const [date, setDate] = useState(today)
  const [adding, setAdding] = useState(null) // 食事の種類
  const target = nutritionTargets(profile)
  const tot = dayTotals(meals, date)
  const score = dayScore(tot, target)

  // 目標を満たせた日が何日続いているか（今日がまだなら昨日から数える）
  let streak = 0
  if (target) {
    let d = metGoal(dayTotals(meals, today), target) ? today : addDays(today, -1)
    while (metGoal(dayTotals(meals, d), target)) {
      streak++
      d = addDays(d, -1)
    }
  }

  // 直近7日のカロリーとタンパク質
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({ d, ...dayTotals(meals, d) }))
  const maxKcal = Math.max(target?.kcal ?? 0, ...week.map((w) => w.kcal), 1)

  return (
    <div className="screen">
      <h1>{t('食事')}</h1>

      {!target && (
        <section className="card">
          <p className="muted">{t('「計画 → トレーナー」で身長・体重・目指す体型を入れると、1日の目標が決まり、記録と比べられます。')}</p>
        </section>
      )}

      <section className="card">
        <div className="cal-header">
          <button className="ghost" onClick={() => setDate(addDays(date, -1))}>
            ‹
          </button>
          <h2>
            {formatDateJa(date)} {date === today && <span className="badge">{t('今日')}</span>}
          </h2>
          <button className="ghost" onClick={() => setDate(addDays(date, 1))} disabled={date >= today}>
            ›
          </button>
        </div>
        <Bars tot={tot} target={target} />
        {score != null && (
          <p className="muted">
            {t('今日の点数 {s}点', { s: score })}
            {streak > 0 && <> ・ {t('🔥 {n}日連続で目標達成', { n: streak })}</>}
          </p>
        )}
      </section>

      {MEAL_TYPES.map((mt) => {
        const list = meals.filter((m) => m.date === date && (m.meal ?? 'snack') === mt.key)
        const sum = list.reduce((a, m) => a + (m.kcal ?? 0), 0)
        return (
          <section key={mt.key} className="card">
            <div className="item-header">
              <h2>
                {t(mt.label)} <span className="muted">{Math.round(sum)}kcal</span>
              </h2>
              {adding !== mt.key && (
                <button className="ghost" onClick={() => setAdding(mt.key)}>
                  {t('＋ 追加')}
                </button>
              )}
            </div>
            <ul className="plain-list">
              {list.map((m) => (
                <li key={m.id} className="row-between">
                  <span>
                    {m.name}
                    <small className="muted">
                      {' '}
                      {Math.round(m.kcal)}kcal P{Math.round(m.p)} F{Math.round(m.f)} C{Math.round(m.c)}
                    </small>
                  </span>
                  <button className="ghost danger" onClick={() => deleteMeal(m.id)} aria-label={t('削除')}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {adding === mt.key && <AddMeal date={date} mealType={mt.key} onDone={() => setAdding(null)} />}
          </section>
        )
      })}

      <section className="card">
        <h2>{t('直近7日')}</h2>
        <div className="week-columns meal-week">
          {week.map((w) => (
            <button key={w.d} className={`week-col ${w.d === date ? 'current' : ''}`} onClick={() => setDate(w.d)}>
              <span className="week-num">{w.kcal ? Math.round(w.kcal) : ''}</span>
              <div className="week-bar" style={{ height: `${(w.kcal / maxKcal) * 100}%` }} />
              <span className="week-label">{w.d.slice(5).replace('-', '/')}</span>
            </button>
          ))}
        </div>
        {target && <p className="muted">{t('1日の目標 {k}kcal', { k: target.kcal })}</p>}
      </section>

      <MealCalendar meals={meals} target={target} selected={date} onPick={setDate} />
      <p className="muted hint">{t('栄養は食品の一般的な値からの概算です。')}{' '}{FOODS.length}{t('品目に対応')}</p>
    </div>
  )
}
