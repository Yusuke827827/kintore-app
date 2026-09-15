import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { initialBodyParts, initialExercises } from '../data/initialData'
import { loadData, saveData } from '../lib/storage'

const DataContext = createContext(null)

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function DataProvider({ children }) {
  const [state, setState] = useState(() => {
    const saved = loadData()
    if (saved) return saved
    return {
      bodyParts: initialBodyParts,
      exercises: initialExercises,
      sessions: [],
    }
  })

  useEffect(() => {
    saveData(state)
  }, [state])

  const actions = useMemo(
    () => ({
      addBodyPart(name, group) {
        setState((s) => ({
          ...s,
          bodyParts: [...s.bodyParts, { id: makeId('part'), name, group }],
        }))
      },
      deleteBodyPart(id) {
        setState((s) => ({
          ...s,
          bodyParts: s.bodyParts.filter((p) => p.id !== id),
          exercises: s.exercises.filter((e) => e.bodyPartId !== id),
        }))
      },
      addExercise(exercise) {
        setState((s) => ({
          ...s,
          exercises: [
            ...s.exercises,
            { id: makeId('ex'), active: true, ...exercise },
          ],
        }))
      },
      toggleExerciseActive(id) {
        setState((s) => ({
          ...s,
          exercises: s.exercises.map((e) =>
            e.id === id ? { ...e, active: !e.active } : e
          ),
        }))
      },
      deleteExercise(id) {
        setState((s) => ({
          ...s,
          exercises: s.exercises.filter((e) => e.id !== id),
        }))
      },
      addSession(session) {
        setState((s) => ({
          ...s,
          sessions: [...s.sessions, { id: makeId('session'), ...session }],
        }))
      },
      deleteSession(id) {
        setState((s) => ({
          ...s,
          sessions: s.sessions.filter((sess) => sess.id !== id),
        }))
      },
    }),
    []
  )

  // 指定した種目の、指定日より前で最新の記録を返す
  function getPreviousRecord(exerciseId, beforeDate) {
    const past = state.sessions
      .filter((s) => s.date < beforeDate)
      .filter((s) => s.entries.some((en) => en.exerciseId === exerciseId))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    if (past.length === 0) return null
    const entry = past[0].entries.find((en) => en.exerciseId === exerciseId)
    return { date: past[0].date, sets: entry.sets }
  }

  const value = { ...state, ...actions, getPreviousRecord }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
