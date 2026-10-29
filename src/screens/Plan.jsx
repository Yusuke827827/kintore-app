import { useState } from 'react'
import { useData } from '../state/DataContext'
import MenuEditor from '../components/MenuEditor'
import AiBridge from '../components/AiBridge'
import useAiMenuImport from '../hooks/useAiMenuImport'
import { formatDateJa, todayStr } from '../lib/date'
import {
  BODY_TYPES,
  DEFAULT_WEEKDAYS,
  EQUIPMENT,
  GYM_PRESETS,
  availableAt,
  buildWeeklyPlan,
  nutritionTargets,
  planFor,
  presetForName,
  trainerAdvice,
  weekdayLabel,
} from '../lib/planner'
import { advicePrompt, extractJson, matchExercise, menuPrompt } from '../lib/aiBridge'
import { getLanguage, nm, t } from '../i18n'
import { formatSet, sortSessionsDesc } from '../lib/stats'

// ---- カレンダー：日ごと・毎週の曜日ごとにマイセットを予定に入れる ----
function PlanCalendar({ onStart }) {
  const { routines, plans, sessions, setPlanDate, setWeeklyPlan } = useData()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(null)
  const today = todayStr()
  const base = new Date()
  base.setDate(1)
  base.setMonth(base.getMonth() + offset)
  const year = base.getFullYear()
  const month = base.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const trained = new Set(sessions.map((s) => s.date))
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(todayStr(new Date(year, month, d)))
  const nameOf = (id) => routines.find((r) => r.id === id)?.name

  const dows = getLanguage() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['月', '火', '水', '木', '金', '土', '日']
  const selWd = selected ? new Date(`${selected}T00:00:00`).getDay() : null
  const selPlan = selected ? planFor(selected, plans) : null

  return (
    <>
      <section className="card">
        <div className="cal-header">
          <button className="ghost" onClick={() => setOffset(offset - 1)}>
            ‹
          </button>
          <h2>{t('{y}年{m}月', { y: year, m: month + 1 })}</h2>
          <button className="ghost" onClick={() => setOffset(offset + 1)}>
            ›
          </button>
        </div>
        <div className="calendar plan-cal">
          {dows.map((w) => (
            <span key={w} className="dow">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />
            const planId = planFor(d, plans)
            const name = nameOf(planId)
            return (
              <button
                key={i}
                className={`day ${trained.has(d) ? 'trained' : ''} ${d === today ? 'today' : ''} ${name ? 'planned' : ''}`}
                onClick={() => setSelected(d)}
              >
                <span>{Number(d.slice(8))}</span>
                {name && <small>{name.slice(0, 4)}</small>}
              </button>
            )
          })}
        </div>
        <p className="muted">{t('日付をタップして、その日にやるマイセットを入れられます。色付きはトレーニングした日です。')}</p>
      </section>

      <section className="card">
        <h2>{t('毎週の予定')}</h2>
        <p className="muted">{t('曜日ごとに決まったマイセットがあれば入れておくと、毎週カレンダーに入ります。')}</p>
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
          <label key={wd} className="field">
            {weekdayLabel(wd)}
            <select value={plans.weekly[wd] ?? ''} onChange={(e) => setWeeklyPlan(wd, e.target.value || null)}>
              <option value="">{t('休み')}</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>

      {selected && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet action-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{formatDateJa(selected)}</h2>
            <p className="muted">
              {t('今の予定：{name}', { name: nameOf(selPlan) ?? t('なし') })}
              {!(selected in plans.dates) && plans.weekly[selWd] && <> {t('（毎週の予定）')}</>}
            </p>
            {routines.length === 0 && <p className="muted">{t('先にマイセットを作ってください（トレーナーやホームの自動作成から作れます）。')}</p>}
            {routines.map((r) => (
              <button
                key={r.id}
                className={selPlan === r.id ? 'on' : ''}
                onClick={() => {
                  setPlanDate(selected, r.id)
                  setSelected(null)
                }}
              >
                {r.name}
              </button>
            ))}
            <button
              onClick={() => {
                setPlanDate(selected, null)
                setSelected(null)
              }}
            >
              {t('この日は休み')}
            </button>
            {selected in plans.dates && (
              <button
                onClick={() => {
                  setPlanDate(selected, undefined)
                  setSelected(null)
                }}
              >
                {t('この日の変更を取り消す（毎週の予定に戻す）')}
              </button>
            )}
            {selPlan && (
              <button
                onClick={() => {
                  setWeeklyPlan(selWd, selPlan)
                  setPlanDate(selected, undefined)
                  setSelected(null)
                }}
              >
                {t('毎週{wd}にする', { wd: weekdayLabel(selWd) })}
              </button>
            )}
            {selected === today && selPlan && (
              <button className="on" onClick={() => onStart(routines.find((r) => r.id === selPlan))}>
                {t('今すぐこのマイセットで始める')}
              </button>
            )}
            <button onClick={() => setSelected(null)}>{t('閉じる')}</button>
          </div>
        </div>
      )}
    </>
  )
}

// ---- トレーナー：体型を選ぶと週のメニューを作る・栄養の目標・アドバイス ----
function Trainer() {
  const data = useData()
  const { profile, setProfile, bodyLogs, bodyParts, exercises, allExercises, allBodyParts, sessions, gym, applyWeeklyPlan, updateSettings, meals, settings } = data
  const importMenu = useAiMenuImport()
  const lastWeight = [...bodyLogs].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.weight
  const p = { sex: 'male', level: 'intermediate', days: 3, ...profile, weight: profile?.weight ?? lastWeight }
  const [plan, setPlan] = useState(null)
  const [saved, setSaved] = useState(false)
  const partName = (id) => nm(allBodyParts.find((b) => b.id === id))
  const exName = (id) => nm(allExercises.find((e) => e.id === id))

  function update(patch) {
    const next = { ...p, ...patch }
    if (patch.days) next.weekdays = DEFAULT_WEEKDAYS[patch.days]
    setProfile(next)
    setSaved(false)
  }
  function toggleWeekday(wd) {
    const cur = p.weekdays ?? DEFAULT_WEEKDAYS[p.days]
    const next = cur.includes(wd) ? cur.filter((x) => x !== wd) : [...cur, wd].sort()
    setProfile({ ...p, weekdays: next, days: Math.max(1, Math.min(6, next.length)) })
  }
  function makePlan() {
    setPlan(buildWeeklyPlan({ profile: p, bodyParts, exercises, sessions, gym, partName }))
    setSaved(false)
  }
  function savePlan() {
    applyWeeklyPlan(plan)
    updateSettings({ weeklyGoal: plan.length })
    setSaved(true)
  }

  const target = nutritionTargets(p)
  const type = BODY_TYPES.find((b) => b.key === p.bodyType)
  const advice = trainerAdvice({ sessions, exercises: allExercises, bodyParts, bodyLogs, meals, profile, settings, partName, exName })

  function summaryForAi() {
    const recent = sortSessionsDesc(sessions).slice(0, 12)
    const lines = [
      `プロフィール：${p.sex === 'female' ? '女性' : '男性'} ${p.age ?? '?'}歳 ${p.height ?? '?'}cm ${p.weight ?? '?'}kg、目指す体型：${type ? type.label : '未設定'}、週${p.days}回`,
      '最近のトレーニング：',
      ...recent.map((s) => `${s.date} ` + s.entries.map((en) => `${exName(en.exerciseId)} ${en.sets.map(formatSet).join(' ')}`).join(' / ')),
      '体重：' + [...bodyLogs].slice(-10).map((l) => `${l.date} ${l.weight}kg${l.fat != null ? ` ${l.fat}%` : ''}`).join('、'),
    ]
    if (target) {
      const byDay = {}
      for (const m of meals.slice(-60)) {
        const d = (byDay[m.date] ??= { kcal: 0, p: 0, f: 0, c: 0 })
        d.kcal += m.kcal ?? 0
        d.p += m.p ?? 0
        d.f += m.f ?? 0
        d.c += m.c ?? 0
      }
      lines.push(`食事の目標：${target.kcal}kcal P${target.p}g F${target.f}g C${target.c}g`)
      lines.push('食事の実績：' + Object.entries(byDay).slice(-7).map(([d, v]) => `${d} ${Math.round(v.kcal)}kcal P${Math.round(v.p)}`).join('、'))
    }
    return lines.join('\n')
  }

  return (
    <>
      <section className="card">
        <h2>{t('あなたについて')}</h2>
        <div className="segmented">
          {[
            ['male', t('男性')],
            ['female', t('女性')],
          ].map(([k, label]) => (
            <button key={k} className={p.sex === k ? 'on' : ''} onClick={() => update({ sex: k })}>
              {label}
            </button>
          ))}
        </div>
        <div className="body-form">
          {[
            ['age', t('年齢'), '30'],
            ['height', t('身長（cm）'), '170'],
            ['weight', t('体重（kg）'), '65'],
          ].map(([key, label, ph]) => (
            <label key={key} className="field">
              {label}
              <input
                type="number"
                inputMode="decimal"
                placeholder={ph}
                value={p[key] ?? ''}
                onChange={(e) => update({ [key]: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <h3>{t('経験')}</h3>
        <div className="segmented">
          {[
            ['beginner', t('初心者')],
            ['intermediate', t('中級者')],
            ['advanced', t('上級者')],
          ].map(([k, label]) => (
            <button key={k} className={p.level === k ? 'on' : ''} onClick={() => update({ level: k })}>
              {label}
            </button>
          ))}
        </div>
        <h3>{t('トレーニングする曜日')}</h3>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
            <button
              key={wd}
              className={`chip small ${(p.weekdays ?? DEFAULT_WEEKDAYS[p.days]).includes(wd) ? 'on' : ''}`}
              onClick={() => toggleWeekday(wd)}
            >
              {weekdayLabel(wd)}
            </button>
          ))}
        </div>
        <p className="muted">{t('週{n}回', { n: (p.weekdays ?? DEFAULT_WEEKDAYS[p.days]).length })}</p>
      </section>

      <section className="card">
        <h2>{t('目指す体型')}</h2>
        <div className="body-types">
          {BODY_TYPES.map((b) => (
            <button key={b.key} className={`body-type ${p.bodyType === b.key ? 'on' : ''}`} onClick={() => update({ bodyType: b.key })}>
              <span className="stars">{'★'.repeat(b.stars)}{'☆'.repeat(5 - b.stars)}</span>
              <strong>{t(b.label)}</strong>
              <small>{t(b.desc)}</small>
            </button>
          ))}
        </div>
        <button className="primary wide big" disabled={!p.bodyType} onClick={makePlan}>
          {t('週のメニューを作る')}
        </button>
      </section>

      {plan && (
        <section className="card">
          <h2>{t('{type}の週のメニュー', { type: type ? t(type.label) : '' })}</h2>
          <p className="muted">{t('種目の入れ替え・セット数や回数の変更ができます。保存すると、マイセットと毎週の予定に入ります。')}</p>
          {plan.map((day, i) => (
            <details key={i} className="plan-day" open={i === 0}>
              <summary>
                <strong>{weekdayLabel(day.weekday)}</strong> {day.name}
              </summary>
              <MenuEditor
                value={day}
                preferPartIds={day.partIds}
                onChange={(v) => setPlan(plan.map((d, k) => (k === i ? { ...d, ...v } : d)))}
              />
            </details>
          ))}
          <div className="row">
            <button className="secondary" onClick={makePlan}>
              {t('作り直す')}
            </button>
            <button className="primary" onClick={savePlan} disabled={saved}>
              {saved ? t('保存しました ✓') : t('マイセットと曜日に保存')}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <AiBridge
          hint={t('ChatGPT・Gemini・Claudeに週のメニューを作ってもらうこともできます。質問文をコピーしてAIを開き、返ってきた答えを下に貼ってください。')}
          buildPrompt={() =>
            menuPrompt({
              mode: 'week',
              profile: p,
              bodyTypeLabel: type ? type.label : 'おまかせ',
              gymName: gym?.name,
              gymEquipment: gym?.equipment,
              exercises,
              bodyParts,
              nameOf: nm,
            })
          }
          onImport={(text) => {
            const r = importMenu(text)
            if (r.ok) {
              const wds = p.weekdays ?? DEFAULT_WEEKDAYS[p.days]
              setPlan(r.days.map((d, i) => ({ ...d, weekday: d.weekday ?? wds[i % wds.length], partIds: [] })))
              setSaved(false)
            }
            return r
          }}
          importLabel={t('答えを週のメニューに取り込む')}
        />
      </section>

      {target && (
        <section className="card">
          <h2>{t('1日の食事の目標')}</h2>
          <div className="stats">
            <div>
              <strong>{target.kcal}</strong>
              <span>kcal</span>
            </div>
            <div>
              <strong>{target.p}g</strong>
              <span>{t('タンパク質')}</span>
            </div>
            <div>
              <strong>{target.f}g</strong>
              <span>{t('脂質')}</span>
            </div>
            <div>
              <strong>{target.c}g</strong>
              <span>{t('炭水化物')}</span>
            </div>
          </div>
          <p className="muted">{t('身長・体重・年齢と目指す体型から計算した目安です。「食事」タブで毎日の記録と比べられます。')}</p>
        </section>
      )}

      <section className="card">
        <h2>{t('トレーナーからのアドバイス')}</h2>
        <ul className="plain-list advice">
          {advice.map((a, i) => (
            <li key={i}>
              <span className="advice-icon">{a.icon}</span>
              <div>
                <strong>{a.title}</strong>
                <p className="muted">{a.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <AiBridge
          hint={t('記録をまとめた質問文をコピーします。AIに貼り付けると、もっと詳しいアドバイスがもらえます。')}
          buildPrompt={() => advicePrompt({ summary: summaryForAi() })}
        />
      </section>
    </>
  )
}

// ---- ジム：器具を選ぶと、使える種目を提案。チェックして保存 ----
function GymSetup() {
  const { gym, setGym, allExercises, bodyParts } = useData()
  const [name, setName] = useState(gym?.name ?? '')
  const [preset, setPreset] = useState(gym?.preset ?? '')
  const [equipment, setEquipment] = useState(gym?.equipment ?? EQUIPMENT)
  const exercises = allExercises.filter((e) => !e.deleted)
  const [checked, setChecked] = useState(() => new Set(exercises.filter((e) => e.active).map((e) => e.id)))
  const [saved, setSaved] = useState(false)

  function applyEquipment(eqs) {
    setEquipment(eqs)
    const g = { equipment: eqs }
    setChecked(new Set(exercises.filter((e) => availableAt(e, g)).map((e) => e.id)))
    setSaved(false)
  }
  function choosePreset(key) {
    setPreset(key)
    const pr = GYM_PRESETS.find((g) => g.key === key)
    if (pr) applyEquipment(pr.equipment)
  }
  function toggle(id) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
    setSaved(false)
  }

  function gymPrompt() {
    return [
      `「${name || 'このジム'}」の公式サイトや口コミを調べて、置いてある器具・マシンを確認してください。`,
      'そのうえで、次の種目のうち、このジムでできるものだけを選んでください。',
      '',
      exercises.map((e) => `- ${e.name}（${e.equipment}）`).join('\n'),
      '',
      '次のJSONだけをコードブロックで出してください。',
      '```json',
      '{ "available": ["できる種目名", "..."], "note": "調べた結果の短いメモ" }',
      '```',
    ].join('\n')
  }

  return (
    <>
      <section className="card">
        <h2>{t('通っているジム')}</h2>
        <input
          className="search"
          placeholder={t('ジムの名前（例：エニタイムフィットネス 野田店）')}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
          onBlur={() => {
            const pr = presetForName(name)
            if (pr && !preset) choosePreset(pr.key)
          }}
        />
        <h3>{t('ジムの種類')}</h3>
        <div className="chips">
          {GYM_PRESETS.map((g) => (
            <button key={g.key} className={`chip small ${preset === g.key ? 'on' : ''}`} onClick={() => choosePreset(g.key)}>
              {t(g.label)}
            </button>
          ))}
        </div>
        <p className="muted">{t('選ぶと、そのジムに一般的にある器具が入ります。店舗によって違うので、実際にあるものに直してください。')}</p>
        <h3>{t('ある器具')}</h3>
        <div className="chips">
          {EQUIPMENT.map((eq) => (
            <button
              key={eq}
              className={`chip small ${equipment.includes(eq) ? 'on' : ''}`}
              onClick={() => applyEquipment(equipment.includes(eq) ? equipment.filter((x) => x !== eq) : [...equipment, eq])}
            >
              {t(eq)}
            </button>
          ))}
        </div>
        <AiBridge
          hint={t('ChatGPT・Gemini・Claudeにジムのサイトを調べてもらい、できる種目を選んでもらえます（ネット検索ができるAIで使ってください）。')}
          buildPrompt={gymPrompt}
          onImport={(text) => {
            const data = extractJson(text)
            if (!Array.isArray(data?.available)) return { ok: false, message: t('答えの中に種目のJSONが見つかりませんでした。') }
            const ids = data.available.map((n) => matchExercise(n, exercises, nm)?.id).filter(Boolean)
            setChecked(new Set(ids))
            setSaved(false)
            return { ok: true, message: t('{n}種目にチェックを入れました。確認して保存してください。', { n: ids.length }) + (data.note ? `\n💬 ${data.note}` : '') }
          }}
          importLabel={t('答えを種目のチェックに反映')}
        />
      </section>

      <section className="card">
        <h2>{t('このジムでできる種目')}</h2>
        <p className="muted">{t('チェックした種目だけが、種目選びとメニュー作成に使われます。')}</p>
        {bodyParts.map((bp) => {
          const list = exercises.filter((e) => e.bodyPartId === bp.id)
          if (!list.length) return null
          return (
            <details key={bp.id} className="gym-part">
              <summary>
                {nm(bp)} <span className="muted">{list.filter((e) => checked.has(e.id)).length}/{list.length}</span>
              </summary>
              {list.map((e) => (
                <label key={e.id} className="option gym-ex">
                  <input type="checkbox" checked={checked.has(e.id)} onChange={() => toggle(e.id)} />
                  {nm(e)}
                  <span className="tag">{t(e.equipment)}</span>
                </label>
              ))}
            </details>
          )
        })}
        <button
          className="primary wide"
          onClick={() => {
            setGym({ name: name.trim(), preset, equipment }, [...checked])
            setSaved(true)
          }}
          disabled={saved}
        >
          {saved ? t('保存しました ✓') : t('この内容で保存')}
        </button>
      </section>
    </>
  )
}

export default function Plan({ onStartRoutine }) {
  const [tab, setTab] = useState('calendar')
  return (
    <div className="screen">
      <h1>{t('計画')}</h1>
      <div className="segmented">
        {[
          ['calendar', t('カレンダー')],
          ['trainer', t('トレーナー')],
          ['gym', t('ジム')],
        ].map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'calendar' && <PlanCalendar onStart={onStartRoutine} />}
      {tab === 'trainer' && <Trainer />}
      {tab === 'gym' && <GymSetup />}
    </div>
  )
}
