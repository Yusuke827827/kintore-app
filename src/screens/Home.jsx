import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { daysAgoLabel, formatDateJa, todayStr } from '../lib/date'
import { nm, t } from '../i18n'
import {
  doneExercisesForPart,
  lastExercisesForPart,
  lastTrainedByPart,
  sessionPartIds,
  sortSessionsDesc,
  suggestParts,
  weeklyGoalStatus,
} from '../lib/stats'
import RecoveryMap from '../components/RecoveryMap'
import CardioHome from '../components/CardioHome'
import MenuEditor from '../components/MenuEditor'
import AiBridge from '../components/AiBridge'
import useAiMenuImport from '../hooks/useAiMenuImport'
import { LEVELS, generateMenu, planFor } from '../lib/planner'
import { menuPrompt } from '../lib/aiBridge'
import { usePremium } from '../state/PremiumContext'
import LockCard from '../components/LockCard'
import Icon from '../components/Icon'
import { routineColor } from '../lib/routineColors'
import { buildReport } from '../lib/report'
import { ScoreRing } from '../components/Report'
import MuscleFocus from '../components/MuscleFocus'

const GROUPS = [
  { key: 'upper', label: '上半身' },
  { key: 'lower', label: '下半身' },
  { key: 'core', label: '体幹' },
  { key: 'other', label: 'その他' },
] // label は表示時に t() で訳す

// 今週の達成度を円で表す（中に回数）
function GoalRing({ done, goal }) {
  const r = 22
  const len = 2 * Math.PI * r
  const ratio = Math.min(1, done / goal)
  return (
    <div className="goal-ring">
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <circle cx="28" cy="28" r={r} className="goal-ring-track" />
        {ratio > 0 && <circle
          cx="28"
          cy="28"
          r={r}
          className="goal-ring-fill"
          strokeDasharray={`${len * ratio} ${len}`}
          transform="rotate(-90 28 28)"
        />}
      </svg>
      <span>
        {done}
        <small>/{goal}</small>
      </span>
    </div>
  )
}

export default function Home({ onOpenWorkout, onOpenCustomize, onOpenReport }) {
  const {
    bodyParts,
    allBodyParts,
    exercises,
    allExercises,
    sessions,
    routines,
    activeWorkout,
    startWorkout,
    settings,
    plans,
    gym,
    addRoutine,
    meals,
    bodyLogs,
    profile,
  } = useData()
  const importMenu = useAiMenuImport()
  const { premium, gate } = usePremium()
  const focus = settings.focus ?? 'strength'
  const [showStrength, setShowStrength] = useState(false)
  const today = todayStr()

  const lastByPart = useMemo(() => lastTrainedByPart(sessions, allExercises), [sessions, allExercises])
  const suggested = useMemo(
    () => suggestParts(bodyParts, sessions, allExercises),
    [bodyParts, sessions, allExercises]
  )
  // 何も触らなければ「おすすめ」のまま。タップしたら自分の選択に切り替わる。
  const [picked, setPicked] = useState(null)
  const chosen = picked ?? suggested

  // 前回のメニューは最初からオン。ほかに一度でもやった種目はタップでオンにできる。
  const baseMenu = useMemo(
    () => chosen.flatMap((pid) => lastExercisesForPart(sessions, exercises, pid)),
    [chosen, sessions, exercises]
  )
  const candidates = useMemo(() => {
    const done = chosen.flatMap((pid) => doneExercisesForPart(sessions, exercises, pid))
    return [...new Set([...baseMenu, ...done])]
  }, [chosen, sessions, exercises, baseMenu])
  const [toggled, setToggled] = useState({}) // 種目id → オン/オフ（触ったものだけ）
  const isOn = (id) => toggled[id] ?? baseMenu.includes(id)
  const menu = candidates.filter(isOn)

  const lastSession = useMemo(() => sortSessionsDesc(sessions)[0] ?? null, [sessions])
  const weekCount = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // 今週の月曜
    const monday = todayStr(d)
    return new Set(sessions.filter((s) => s.date >= monday).map((s) => s.date)).size
  }, [sessions])

  const visibleIds = new Set(exercises.map((e) => e.id))
  const goal = settings.weeklyGoal ?? 0
  const goalStatus = useMemo(
    () => (goal > 0 ? weeklyGoalStatus(sessions, goal, today) : null),
    [sessions, goal, today]
  )
  // 週の前半（月〜水）は、先週のレポートをホームに出す
  const weekday = (new Date(`${today}T00:00:00`).getDay() + 6) % 7
  const lastWeek = useMemo(() => {
    if (weekday > 2) return null
    const r = buildReport('week', -1, { sessions, exercises: allExercises, bodyParts: allBodyParts, meals, bodyLogs, profile, settings }, today)
    return r.cur.days > 0 ? r : null
  }, [weekday, sessions, allExercises, allBodyParts, meals, bodyLogs, profile, settings, today])

  const [showMap, setShowMap] = useState(() => {
    try {
      return localStorage.getItem('kintore-show-map') === '1'
    } catch {
      return false
    }
  })
  function toggleMap() {
    setShowMap((v) => {
      try {
        localStorage.setItem('kintore-show-map', v ? '0' : '1')
      } catch {
        // 保存できなくても表示の切り替えはできる
      }
      return !v
    })
  }

  function partName(id) {
    return nm(allBodyParts.find((p) => p.id === id))
  }
  function exName(id) {
    return nm(allExercises.find((e) => e.id === id))
  }

  function togglePart(id) {
    setPicked((cur) => {
      const base = cur ?? suggested
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    })
  }

  function start(exerciseIds, partIds, targets, routineId) {
    if (activeWorkout && !confirm(t('記録中のトレーニングがあります。破棄して新しく始めますか？'))) return
    startWorkout(exerciseIds, partIds, targets, routineId)
    onOpenWorkout()
  }

  // 今日の予定（カレンダー）
  const plannedId = planFor(today, plans)
  const planned = routines.find((r) => r.id === plannedId)

  // メニュー自動作成
  // 無料版はライトだけ。スタンダード・アドバンスはプレミアム
  const [level, setLevel] = useState(premium ? 'standard' : 'light')
  const [generated, setGenerated] = useState(null)
  const [genOpen, setGenOpen] = useState(false)
  const [pickMode, setPickMode] = useState(() => {
    try {
      return localStorage.getItem('kintore-pick-mode') === 'muscle' ? 'muscle' : 'part'
    } catch {
      return 'part'
    }
  })
  function changePickMode(k) {
    setPickMode(k)
    try {
      localStorage.setItem('kintore-pick-mode', k)
    } catch {
      // 保存できなくても切り替えはできる
    }
  }
  function generate(lv = level) {
    setGenerated(generateMenu({ partIds: chosen, level: premium ? lv : 'light', exercises, sessions, gym }))
  }
  function saveGenerated() {
    const name = prompt(t('マイセットの名前（例：胸の日）'), chosen.map(partName).join(t('＋')))
    if (!gate('routines', routines.length)) return
    if (!name?.trim()) return
    addRoutine(name.trim(), generated.exerciseIds, generated.targets)
    alert(t('「{name}」を保存しました。ホームからワンタップで始められます。', { name: name.trim() }))
  }

  return (
    <div className="screen">
      <h1>{t('今日のトレーニング')}</h1>
      <p className="muted">
        {formatDateJa(today)} ・ {t('今週 {n}回', { n: weekCount })}
        {lastSession && (
          <>
            {' '}
            ・ {t('前回')} {daysAgoLabel(lastSession.date, today)}
            {t('（')}
            {sessionPartIds(lastSession, allExercises).map(partName).filter(Boolean).join(t('＋'))}
            {t('）')}
          </>
        )}
      </p>

      {lastWeek && (
        <button className="card report-teaser" onClick={() => onOpenReport?.('week', -1)}>
          <ScoreRing score={lastWeek.total} grade={lastWeek.grade} size={56} />
          <span className="report-teaser-text">
            <strong>{t('先週のレポートが届きました')}</strong>
            <small className="muted">
              {t('{n}日・{s}セット', { n: lastWeek.cur.days, s: lastWeek.cur.sets })}
              {lastWeek.cur.prs > 0 && ` ・ ${t('自己ベスト{n}回', { n: lastWeek.cur.prs })}`}
            </small>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {goalStatus && (
        <section className="card goal">
          <GoalRing done={goalStatus.thisCount} goal={goal} />
          <div className="goal-text">
            <strong>
              {goalStatus.thisCount >= goal
                ? t('今週の目標達成！')
                : t('今週 {n}/{goal}回', { n: goalStatus.thisCount, goal })}
            </strong>
            <span className="muted">
              {goalStatus.streak > 0
                ? <><Icon name="flame" size={14} /> {t('{n}週連続で達成中', { n: goalStatus.streak })}</>
                : t('あと{n}回で今週の目標達成', { n: goal - goalStatus.thisCount })}
            </span>
          </div>
        </section>
      )}

      {planned && !activeWorkout && (
        <section className="card today-plan">
          <div>
            <span className="muted">{t('今日の予定')}</span>
            <strong>{planned.name}</strong>
            <span className="muted">
              {planned.exerciseIds.map(exName).filter(Boolean).join(t('・'))}
            </span>
          </div>
          <button
            className="primary small"
            onClick={() =>
              start(planned.exerciseIds.filter((id) => visibleIds.has(id)), [], planned.targets, planned.id)
            }
          >
            {t('始める')}
          </button>
        </section>
      )}

      {activeWorkout && (
        <section className="card resume">
          <h2>{activeWorkout.sourceSessionId ? t('修正中の記録があります') : t('トレーニング記録中')}</h2>
          <p className="muted">
            {activeWorkout.items.map((it) => exName(it.exerciseId)).join(t('・')) || t('種目なし')}
          </p>
          <button className="primary wide" onClick={onOpenWorkout}>
            {t('続きから記録する')}
          </button>
        </section>
      )}

      {routines.length > 0 && !activeWorkout && (
        <section className="quick-sets">
          <div className="row-between">
            <h2>{t('マイセットですぐ始める')}</h2>
            <button className="ghost" onClick={() => onOpenCustomize('routines')}>
              {t('編集')}
            </button>
          </div>
          <div className="quick-scroll">
            {routines.map((r) => (
              <button
                key={r.id}
                className="quick-card routine-main"
                style={{ '--rc': routineColor(r, routines) }}
                onClick={() => start(r.exerciseIds.filter((id) => visibleIds.has(id)), [], r.targets, r.id)}
              >
                <strong>{r.name}</strong>
                <span className="muted">{t('{n}種目', { n: r.exerciseIds.length })}</span>
                <small>{r.exerciseIds.map(exName).filter(Boolean).slice(0, 3).join(t('・'))}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {focus !== 'strength' && <CardioHome onStart={(ids, parts) => start(ids, parts)} />}

      {focus === 'cardio' && !showStrength && (
        <button className="link" onClick={() => setShowStrength(true)}>
          {t('＋ 筋トレもする')}
        </button>
      )}

      {(focus !== 'cardio' || showStrength) && (
        <>
      <section className="card">
        {/* 部位で選ぶ／細かい筋肉で選ぶ */}
        <div className="segmented pick-mode">
          {[
            ['part', t('部位で選ぶ')],
            ['muscle', t('筋肉で選ぶ')],
          ].map(([k, label]) => (
            <button key={k} className={pickMode === k ? 'on' : ''} onClick={() => changePickMode(k)}>
              {label}
            </button>
          ))}
        </div>
        {pickMode === 'muscle' ? (
          <MuscleFocus onStart={(ids, targets) => start(ids, [], targets)} />
        ) : (
        <>
        <div className="item-header">
          <h2>
            {t('部位')}
            {!picked && sessions.length > 0 && <span className="badge">{t('おすすめを選択中')}</span>}
          </h2>
          <div className="item-tools">
            <button className={`ghost ${showMap ? 'on' : ''}`} onClick={toggleMap}>
              {showMap ? t('回復マップを隠す') : t('回復マップを表示')}
            </button>
            <button className="ghost" onClick={() => onOpenCustomize('parts')}>
              {t('編集')}
            </button>
          </div>
        </div>
        {showMap && !premium && <LockCard feature="recovery" />}
        {showMap && premium && (
          <RecoveryMap
            bodyParts={bodyParts}
            lastByPart={lastByPart}
            today={today}
            selected={chosen}
            onToggle={togglePart}
          />
        )}
        {GROUPS.map((g) => {
          const parts = bodyParts.filter((p) => p.group === g.key)
          if (parts.length === 0) return null
          return (
            <div key={g.key} className="part-group">
              <span className="group-label">{t(g.label)}</span>
              <div className="chips">
                {parts.map((p) => (
                  <button
                    key={p.id}
                    className={`chip ${chosen.includes(p.id) ? 'on' : ''}`}
                    onClick={() => togglePart(p.id)}
                  >
                    {nm(p)}
                    <small>{daysAgoLabel(lastByPart[p.id], today)}</small>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="menu-preview">
          {candidates.length > 0 ? (
            <>
              <span className="muted">
                {t('今日のメニュー（{n}種目）・タップでオン／オフ', { n: menu.length })}
              </span>
              <div className="chips">
                {candidates.map((id) => (
                  <button
                    key={id}
                    className={`chip small ${isOn(id) ? 'on' : ''}`}
                    onClick={() => setToggled((t) => ({ ...t, [id]: !isOn(id) }))}
                  >
                    {isOn(id) ? '✓ ' : ''}
                    {exName(id)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <span className="muted">
              {chosen.length === 0
                ? t('部位を選んでください')
                : t('はじめての部位です。次の画面で種目を選びます。')}
            </span>
          )}
        </div>

        <button
          className="primary wide big"
          disabled={chosen.length === 0}
          onClick={() => start(menu, chosen)}
        >
          {chosen.length > 0
            ? t('{parts}で始める', { parts: chosen.map(partName).join(t('＋')) })
            : t('始める')}
        </button>
        <button className="link" onClick={() => start([], chosen)} disabled={chosen.length === 0}>
          {t('種目を自分で選んで始める')}
        </button>
        </>
        )}
      </section>
        </>
      )}

      {(focus !== 'cardio' || showStrength) && pickMode === 'part' && (
        <section className="card">
          <button className="generator-toggle" onClick={() => setGenOpen(!genOpen)} aria-expanded={genOpen}>
            <span className="with-icon">
              <Icon name="bolt" size={18} /> {t('メニューを自動で作る')}
            </span>
            <Icon name="chevron" size={18} className={genOpen ? 'turn' : ''} />
          </button>
          {genOpen && (
        <div className="generator">
          <div className="segmented">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                className={level === l.key ? 'on' : ''}
                onClick={() => {
                  if (l.key !== 'light' && !gate('menu')) return
                  setLevel(l.key)
                  if (generated) generate(l.key)
                }}
              >
                {t(l.label)}
                {l.key !== 'light' && !premium && <Icon name="lock" size={13} className="inline-lock" />}
              </button>
            ))}
          </div>
          <p className="muted">{t(LEVELS.find((l) => l.key === level).desc)}</p>
          {!generated ? (
            <button className="secondary wide" disabled={chosen.length === 0} onClick={() => generate()}>
              {t('作成する')}
            </button>
          ) : (
            <>
              <MenuEditor value={generated} onChange={setGenerated} preferPartIds={chosen} />
              <div className="row">
                <button className="secondary" onClick={() => generate()}>
                  {t('作り直す')}
                </button>
                <button className="secondary" onClick={saveGenerated} disabled={!generated.exerciseIds.length}>
                  {t('マイセットに保存')}
                </button>
              </div>
              <button
                className="primary wide"
                disabled={!generated.exerciseIds.length}
                onClick={() => start(generated.exerciseIds, chosen, generated.targets)}
              >
                {t('このメニューで始める')}
              </button>
            </>
          )}
          <AiBridge
            buildPrompt={() =>
              menuPrompt({
                mode: 'day',
                partNames: chosen.map(partName),
                levelLabel: t(LEVELS.find((l) => l.key === level).label),
                gymName: gym?.name,
                gymEquipment: gym?.equipment,
                exercises,
                bodyParts,
                nameOf: nm,
              })
            }
            onImport={(text) => {
              const r = importMenu(text)
              if (r.ok) setGenerated({ exerciseIds: r.days[0].exerciseIds, targets: r.days[0].targets })
              return r
            }}
            importLabel={t('答えをメニューに取り込む')}
          />
        </div>

          )}
        </section>
      )}

      <button className="link" onClick={() => start([], [])}>
        {t('空のトレーニングを始める')}
      </button>
      <button className="link" onClick={() => onOpenCustomize('routines')}>
        {t('＋ マイセットを作る')}
      </button>
    </div>
  )
}
