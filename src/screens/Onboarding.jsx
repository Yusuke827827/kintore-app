import { useState } from 'react'
import { useData } from '../state/DataContext'
import { usePremium } from '../state/PremiumContext'
import { BODY_TYPES, DEFAULT_WEEKDAYS, buildWeeklyPlan, nutritionTargets, weekdayLabel } from '../lib/planner'
import { nm, t } from '../i18n'
import Icon from '../components/Icon'
import { startTour } from '../lib/tour'

// 初めて開いたときの案内：目標・体型・頻度・体のことを聞いて、その場で週のメニューを作る
const STEPS = ['welcome', 'focus', 'type', 'schedule', 'body', 'plan']

const FOCUS = [
  { key: 'strength', icon: 'live', label: '筋トレ中心', desc: 'マシン・フリーウェイトで体を変えたい' },
  { key: 'cardio', icon: 'pulse', label: '有酸素中心', desc: 'ランニング・バイク・ウォーキング' },
  { key: 'mixed', icon: 'bolt', label: '両方', desc: '筋トレも有酸素もバランスよく' },
]

export default function Onboarding({ onDone }) {
  const { bodyParts, exercises, allBodyParts, sessions, gym, setProfile, applyWeeklyPlan, updateSettings } = useData()
  const { kind, premium, openPaywall } = usePremium()
  const [step, setStep] = useState(0)
  const [focus, setFocus] = useState('strength')
  const [p, setP] = useState({ sex: 'male', level: 'beginner', days: 3, bodyType: null })
  const set = (patch) => setP((cur) => ({ ...cur, ...patch }))

  const types = BODY_TYPES.filter((b) => (focus === 'strength' ? !b.cardioType : focus === 'cardio' ? b.cardioType : true))
  const profile = { ...p, weekdays: DEFAULT_WEEKDAYS[p.days] }
  const plan =
    STEPS[step] === 'plan'
      ? buildWeeklyPlan({ profile, bodyParts, exercises, sessions, gym, partName: (id) => nm(allBodyParts.find((b) => b.id === id)) })
      : null
  const target = nutritionTargets(profile)

  function finish(apply) {
    if (apply && plan) {
      setProfile(profile)
      applyWeeklyPlan(plan)
      updateSettings({ focus, weeklyGoal: plan.length, onboarded: true })
    } else {
      updateSettings({ onboarded: true, ...(apply ? { focus } : {}) })
    }
    onDone()
    // プランを作ったら、最初の記録をガイドつきで
    if (apply) startTour()
    // アプリ版では、最初のプランを作った直後に無料お試しを案内する
    if (apply && kind !== 'beta' && !premium) setTimeout(() => openPaywall('trainer'), 400)
  }

  const next = () => setStep((s) => s + 1)
  const back = () => setStep((s) => Math.max(0, s - 1))
  const name = STEPS[step]

  return (
    <div className="onboarding">
      <div className="onb-top">
        {step > 0 ? (
          <button className="ghost" onClick={back}>
            ‹ {t('戻る')}
          </button>
        ) : (
          <span />
        )}
        <div className="onb-dots">
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <button className="ghost" onClick={() => finish(false)}>
          {t('スキップ')}
        </button>
      </div>

      {name === 'welcome' && (
        <div className="onb-body">
          <img className="onb-logo" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
          <h1>{t('ようこそ')}</h1>
          <p className="onb-lead">{t('いくつかの質問に答えるだけで、あなた専用の週のメニューを作ります。')}</p>
          <ul className="onb-points">
            <li>
              <Icon name="check" size={18} /> {t('前回の記録が最初から入っていて、✓を押すだけ')}
            </li>
            <li>
              <Icon name="check" size={18} /> {t('入力するたびに自動保存。アプリを閉じても消えない')}
            </li>
            <li>
              <Icon name="check" size={18} /> {t('週・月のレポートで、成長が見える')}
            </li>
          </ul>
          <button className="primary wide big" onClick={next}>
            {t('はじめる')}
          </button>
        </div>
      )}

      {name === 'focus' && (
        <div className="onb-body">
          <h1>{t('どんなトレーニングをしますか？')}</h1>
          <div className="onb-options">
            {FOCUS.map((f) => (
              <button
                key={f.key}
                className={`onb-option ${focus === f.key ? 'on' : ''}`} aria-pressed={!!(focus === f.key)}
                onClick={() => {
                  setFocus(f.key)
                  set({ bodyType: null })
                }}
              >
                <span className="settings-icon">
                  <Icon name={f.icon} size={18} />
                </span>
                <span>
                  <strong>{t(f.label)}</strong>
                  <small>{t(f.desc)}</small>
                </span>
              </button>
            ))}
          </div>
          <button className="primary wide big" onClick={next}>
            {t('次へ')}
          </button>
        </div>
      )}

      {name === 'type' && (
        <div className="onb-body">
          <h1>{t('目指す体は？')}</h1>
          <div className="onb-options">
            {types.map((b) => (
              <button key={b.key} className={`onb-option ${p.bodyType === b.key ? 'on' : ''}`} aria-pressed={!!(p.bodyType === b.key)} onClick={() => set({ bodyType: b.key })}>
                <span>
                  <strong>{t(b.label)}</strong>
                  <small>{t(b.desc)}</small>
                </span>
              </button>
            ))}
          </div>
          <button className="primary wide big" disabled={!p.bodyType} onClick={next}>
            {t('次へ')}
          </button>
        </div>
      )}

      {name === 'schedule' && (
        <div className="onb-body">
          <h1>{t('週に何回できそうですか？')}</h1>
          <div className="onb-days">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} className={`chip ${p.days === n ? 'on' : ''}`} aria-pressed={!!(p.days === n)} onClick={() => set({ days: n })}>
                {t('週{n}回', { n })}
              </button>
            ))}
          </div>
          <p className="muted">{DEFAULT_WEEKDAYS[p.days].map(weekdayLabel).join(t('・'))}</p>
          <h3>{t('経験')}</h3>
          <div className="segmented">
            {[
              ['beginner', t('初心者')],
              ['intermediate', t('中級者')],
              ['advanced', t('上級者')],
            ].map(([k, label]) => (
              <button key={k} className={p.level === k ? 'on' : ''} aria-pressed={!!(p.level === k)} onClick={() => set({ level: k })}>
                {label}
              </button>
            ))}
          </div>
          <button className="primary wide big" onClick={next}>
            {t('次へ')}
          </button>
        </div>
      )}

      {name === 'body' && (
        <div className="onb-body">
          <h1>{t('あなたについて')}</h1>
          <p className="onb-lead">{t('食事の目標（カロリー・タンパク質）を決めるのに使います。あとからでも入れられます。')}</p>
          <div className="segmented">
            {[
              ['male', t('男性')],
              ['female', t('女性')],
            ].map(([k, label]) => (
              <button key={k} className={p.sex === k ? 'on' : ''} aria-pressed={!!(p.sex === k)} onClick={() => set({ sex: k })}>
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
                  onChange={(e) => set({ [key]: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <button className="primary wide big" onClick={next}>
            {t('プランを作る')}
          </button>
        </div>
      )}

      {name === 'plan' && plan && (
        <div className="onb-body">
          <h1>{t('あなたのプランができました')}</h1>
          <p className="onb-lead">
            {t('{type}を目指す、週{n}回のメニューです。', { type: t(BODY_TYPES.find((b) => b.key === p.bodyType)?.label ?? ''), n: plan.length })}
          </p>
          <ul className="onb-plan">
            {plan.map((d) => (
              <li key={d.weekday}>
                <span className="onb-wd">{weekdayLabel(d.weekday)}</span>
                <span>
                  <strong>{d.name}</strong>
                  <small>{t('{n}種目', { n: d.exerciseIds.length })}</small>
                </span>
              </li>
            ))}
          </ul>
          {target && (
            <p className="muted">
              {t('1日の目安：{k}kcal・タンパク質{p}g', { k: target.kcal, p: target.p })}
            </p>
          )}
          <button className="primary wide big" onClick={() => finish(true)}>
            {t('このプランで始める')}
          </button>
          <p className="muted">{t('マイセットと曜日の予定に保存します。あとから自由に変えられます。')}</p>
        </div>
      )}
    </div>
  )
}
