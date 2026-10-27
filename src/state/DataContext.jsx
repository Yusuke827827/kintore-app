import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { initialBodyParts, initialExercises } from '../data/initialData'
import { loadData, mergeData, requestPersistentStorage, saveData } from '../lib/storage'
import * as sync from '../lib/sync'
import { todayStr } from '../lib/date'
import {
  emptySet,
  isCardio,
  isFilledSet,
  previousRecord,
  sessionPartIds,
  toDraftSet,
  toStoredSet,
} from '../lib/stats'
import { setLanguage, t } from '../i18n'
import { applyTheme } from '../lib/theme'
import { setSoundEnabled } from '../lib/restAlarm'

const DataContext = createContext(null)

// 条件に合う要素どうしの中で、id の要素を1つ上(-1)/下(+1)へ動かす
function moveAmong(list, id, dir, sameGroup) {
  const i = list.findIndex((x) => x.id === id)
  if (i < 0) return list
  let j = i + dir
  while (j >= 0 && j < list.length && (list[j].deleted || !sameGroup(list[j]))) j += dir
  if (j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// 前回の記録の行数ぶん、空のセットを用意する（入力欄には前回の値が薄く表示される）
function newItem(state, exerciseId, date, excludeId) {
  const prev = previousRecord(state.sessions, exerciseId, { onOrBefore: date, excludeId })
  const cardio = isCardio(state.exercises.find((e) => e.id === exerciseId))
  const prevSets = prev ? prev.sets : [null]
  return {
    exerciseId,
    note: '',
    sets: prevSets.map((p) => emptySet(cardio, p)),
  }
}

export function DataProvider({ children }) {
  const [state, setState] = useState(loadData)
  const [syncStatus, setSyncStatus] = useState(() => ({
    configured: !!sync.loadSyncConfig(),
    state: 'idle',
    at: null,
    message: '',
  }))

  // 言語は描画の前に切り替える（t() がこの値を見る）
  setLanguage(state.settings.lang)
  setSoundEnabled(state.settings.sound)

  // 見た目（モード・色・壁紙・文字サイズ）。「端末に合わせる」はOSの切り替えにも追従
  const themeJson = JSON.stringify(state.settings.theme)
  const [wallpaperVersion, setWallpaperVersion] = useState(0)
  useEffect(() => {
    const theme = JSON.parse(themeJson)
    applyTheme(theme)
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    const onChange = () => applyTheme(theme)
    mq?.addEventListener?.('change', onChange)
    return () => mq?.removeEventListener?.('change', onChange)
  }, [themeJson, wallpaperVersion])

  // 1項目入力するたびに、この端末へ即保存
  useEffect(() => {
    saveData(state)
  }, [state])

  useEffect(() => {
    requestPersistentStorage()
  }, [])

  // ---- クラウド同期 ----
  const stateRef = useRef(state)
  const syncingRef = useRef(false)
  const pendingRef = useRef(false)
  const lastSyncedJsonRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const runSync = useCallback(async () => {
    const config = sync.loadSyncConfig()
    if (!config) return
    if (syncingRef.current) {
      pendingRef.current = true
      return
    }
    syncingRef.current = true
    setSyncStatus((s) => ({ ...s, configured: true, state: 'syncing', message: '' }))
    try {
      const local = stateRef.current
      const remote = await sync.pull(config)
      const merged = remote ? mergeData(local, remote) : local
      const mergedJson = JSON.stringify(merged)
      if (!remote || mergedJson !== JSON.stringify(mergeData(remote, remote))) {
        await sync.push(config, merged)
      }
      lastSyncedJsonRef.current = mergedJson
      setState((cur) => {
        if (cur === local) return mergedJson === JSON.stringify(cur) ? cur : merged
        // 通信中に入力された分は消さずに合わせ、もう一度同期する
        pendingRef.current = true
        return mergeData(cur, merged)
      })
      setSyncStatus({ configured: true, state: 'ok', at: Date.now(), message: '' })
    } catch (e) {
      setSyncStatus((s) => ({ ...s, state: 'error', message: e.message || t('同期に失敗しました') }))
    } finally {
      syncingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        setTimeout(runSync, 500)
      }
    }
  }, [])

  // データが変わったら少し待ってクラウドへ
  useEffect(() => {
    if (!sync.loadSyncConfig()) return
    if (JSON.stringify(state) === lastSyncedJsonRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(runSync, 2000)
    return () => clearTimeout(timerRef.current)
  }, [state, runSync])

  // アプリを開いたとき・戻ってきたときに最新を取りにいく
  useEffect(() => {
    runSync()
    function onVisible() {
      if (document.visibilityState === 'visible') runSync()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', runSync)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', runSync)
    }
  }, [runSync])

  const connectSync = useCallback(
    async (token) => {
      const config = await sync.connect(token.trim(), stateRef.current)
      sync.saveSyncConfig(config)
      setSyncStatus((s) => ({ ...s, configured: true }))
      await runSync()
    },
    [runSync]
  )

  const disconnectSync = useCallback(() => {
    sync.saveSyncConfig(null)
    setSyncStatus({ configured: false, state: 'idle', at: null, message: '' })
  }, [])

  // ---- 更新系 ----
  const actions = useMemo(() => {
    // 部位・種目・ルーティン・設定の変更
    function updateMaster(fn) {
      setState((s) => ({ ...fn(s), masterUpdatedAt: Date.now() }))
    }

    return {
      addBodyPart(name, group) {
        updateMaster((s) => ({
          ...s,
          bodyParts: [...s.bodyParts, { id: makeId('part'), name, group }],
        }))
      },
      updateBodyPart(id, patch) {
        updateMaster((s) => ({
          ...s,
          bodyParts: s.bodyParts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }))
      },
      moveBodyPart(id, dir) {
        updateMaster((s) => ({ ...s, bodyParts: moveAmong(s.bodyParts, id, dir, () => true) }))
      },
      // 削除しても過去の記録に名前が残るよう、印をつけて隠すだけにする（あとで復元できる）
      deleteBodyPart(id) {
        updateMaster((s) => ({
          ...s,
          bodyParts: s.bodyParts.map((p) => (p.id === id ? { ...p, deleted: true } : p)),
        }))
      },
      restoreBodyPart(id) {
        updateMaster((s) => ({
          ...s,
          bodyParts: s.bodyParts.map((p) => (p.id === id ? { ...p, deleted: false } : p)),
        }))
      },
      addExercise(exercise) {
        const id = makeId('ex')
        updateMaster((s) => ({
          ...s,
          exercises: [...s.exercises, { id, active: true, ...exercise }],
        }))
        return id
      },
      updateExercise(id, patch) {
        updateMaster((s) => ({
          ...s,
          exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }))
      },
      // 同じ部位の中で並べ替える
      moveExercise(id, dir) {
        updateMaster((s) => {
          const partId = s.exercises.find((e) => e.id === id)?.bodyPartId
          return {
            ...s,
            exercises: moveAmong(s.exercises, id, dir, (e) => e.bodyPartId === partId),
          }
        })
      },
      toggleExerciseActive(id) {
        updateMaster((s) => ({
          ...s,
          exercises: s.exercises.map((e) => (e.id === id ? { ...e, active: !e.active } : e)),
        }))
      },
      deleteExercise(id) {
        updateMaster((s) => ({
          ...s,
          exercises: s.exercises.map((e) => (e.id === id ? { ...e, deleted: true } : e)),
        }))
      },
      restoreExercise(id) {
        updateMaster((s) => ({
          ...s,
          exercises: s.exercises.map((e) =>
            e.id === id ? { ...e, deleted: false, active: true } : e
          ),
        }))
      },
      // 最初から入っていた部位・種目のうち、消してしまったものを戻す
      restoreDefaults() {
        updateMaster((s) => {
          const partIds = new Set(s.bodyParts.map((p) => p.id))
          const exIds = new Set(s.exercises.map((e) => e.id))
          return {
            ...s,
            bodyParts: [
              ...s.bodyParts.map((p) =>
                initialBodyParts.some((d) => d.id === p.id) ? { ...p, deleted: false } : p
              ),
              ...initialBodyParts.filter((d) => !partIds.has(d.id)),
            ],
            exercises: [
              ...s.exercises.map((e) =>
                initialExercises.some((d) => d.id === e.id) ? { ...e, deleted: false } : e
              ),
              ...initialExercises.filter((d) => !exIds.has(d.id)),
            ],
          }
        })
      },
      addRoutine(name, exerciseIds) {
        updateMaster((s) => ({
          ...s,
          routines: [...s.routines, { id: makeId('routine'), name, exerciseIds }],
        }))
      },
      updateRoutine(id, patch) {
        updateMaster((s) => ({
          ...s,
          routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }))
      },
      moveRoutine(id, dir) {
        updateMaster((s) => ({ ...s, routines: moveAmong(s.routines, id, dir, () => true) }))
      },
      deleteRoutine(id) {
        updateMaster((s) => ({ ...s, routines: s.routines.filter((r) => r.id !== id) }))
      },
      updateSettings(patch) {
        updateMaster((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
      },

      deleteSession(id) {
        setState((s) => ({
          ...s,
          sessions: s.sessions.filter((sess) => sess.id !== id),
          deletedSessionIds: [...s.deletedSessionIds, id],
        }))
      },

      // ---- 記録中のトレーニング（1項目ごとに保存される） ----
      startWorkout(exerciseIds, bodyPartIds = []) {
        setState((s) => {
          const date = todayStr()
          return {
            ...s,
            activeWorkout: {
              id: makeId('w'),
              date,
              startedAt: Date.now(),
              updatedAt: Date.now(),
              bodyPartIds,
              restEndsAt: null,
              items: exerciseIds.map((exId) => newItem(s, exId, date)),
            },
          }
        })
      },
      // 過去の記録を開き直して修正する
      editSession(sessionId) {
        setState((s) => {
          const session = s.sessions.find((x) => x.id === sessionId)
          if (!session) return s
          return {
            ...s,
            activeWorkout: {
              id: makeId('w'),
              sourceSessionId: session.id,
              date: session.date,
              startedAt: session.startedAt ?? null,
              finishedAt: session.finishedAt ?? null,
              updatedAt: Date.now(),
              bodyPartIds: session.bodyPartIds ?? [],
              restEndsAt: null,
              items: session.entries.map((en) => ({
                exerciseId: en.exerciseId,
                note: en.note ?? '',
                sets: en.sets.map(toDraftSet),
              })),
            },
          }
        })
      },
      updateWorkout(fn) {
        setState((s) => {
          if (!s.activeWorkout) return s
          return { ...s, activeWorkout: { ...fn(s.activeWorkout), updatedAt: Date.now() } }
        })
      },
      addWorkoutExercise(exerciseId) {
        setState((s) => {
          const w = s.activeWorkout
          if (!w) return s
          const item = newItem(s, exerciseId, w.date, w.sourceSessionId)
          return { ...s, activeWorkout: { ...w, items: [...w.items, item], updatedAt: Date.now() } }
        })
      },
      finishWorkout() {
        setState((s) => {
          const w = s.activeWorkout
          if (!w) return s
          const entries = w.items
            .map((it) => ({
              exerciseId: it.exerciseId,
              ...(it.note ? { note: it.note } : {}),
              sets: it.sets.filter(isFilledSet).map(toStoredSet),
            }))
            .filter((en) => en.sets.length > 0)
          const ended = { ...s, activeWorkout: null, endedWorkoutIds: [...s.endedWorkoutIds, w.id] }
          const sessionId = w.sourceSessionId ?? w.id
          if (entries.length === 0) {
            if (!w.sourceSessionId) return ended
            // 修正で全部消した → 記録ごと削除
            return {
              ...ended,
              sessions: s.sessions.filter((x) => x.id !== sessionId),
              deletedSessionIds: [...s.deletedSessionIds, sessionId],
            }
          }
          const session = {
            id: sessionId,
            date: w.date,
            bodyPartIds: [],
            entries,
            startedAt: w.startedAt,
            finishedAt: w.finishedAt ?? Date.now(),
            updatedAt: Date.now(),
          }
          session.bodyPartIds = sessionPartIds(session, s.exercises)
          return {
            ...ended,
            sessions: [...s.sessions.filter((x) => x.id !== sessionId), session],
          }
        })
      },
      discardWorkout() {
        setState((s) => {
          if (!s.activeWorkout) return s
          return {
            ...s,
            activeWorkout: null,
            endedWorkoutIds: [...s.endedWorkoutIds, s.activeWorkout.id],
          }
        })
      },

      // ---- 体重・体脂肪（1日1件。同じ日に入れ直したら上書き） ----
      saveBodyLog(date, weight, fat) {
        setState((s) => {
          const existing = s.bodyLogs.find((l) => l.date === date)
          const log = {
            id: existing?.id ?? makeId('bw'),
            date,
            weight,
            ...(fat != null ? { fat } : {}),
            updatedAt: Date.now(),
          }
          return {
            ...s,
            bodyLogs: [...s.bodyLogs.filter((l) => l.id !== log.id), log].sort((a, b) =>
              a.date < b.date ? -1 : a.date > b.date ? 1 : 0
            ),
          }
        })
      },
      deleteBodyLog(id) {
        setState((s) => ({
          ...s,
          bodyLogs: s.bodyLogs.filter((l) => l.id !== id),
          deletedBodyLogIds: [...s.deletedBodyLogIds, id],
        }))
      },

      // バックアップの読み込み（今のデータと合わせる。今ある記録は消えない）
      importData(data) {
        setState((s) => mergeData(s, data))
      },
    }
  }, [])

  // 画面には削除していないものだけを渡す。名前を引くときは all〜 を使う（過去の記録用）
  const value = {
    ...state,
    allBodyParts: state.bodyParts,
    allExercises: state.exercises,
    bodyParts: useMemo(() => state.bodyParts.filter((p) => !p.deleted), [state.bodyParts]),
    exercises: useMemo(() => {
      const parts = new Set(state.bodyParts.filter((p) => !p.deleted).map((p) => p.id))
      return state.exercises.filter((e) => !e.deleted && parts.has(e.bodyPartId))
    }, [state.exercises, state.bodyParts]),
    ...actions,
    syncStatus,
    refreshWallpaper: () => setWallpaperVersion((v) => v + 1),
    runSync,
    connectSync,
    disconnectSync,
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
