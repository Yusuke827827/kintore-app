import { useData } from '../state/DataContext'
import { extractJson, matchExercise, matchPart } from '../lib/aiBridge'
import { isCardio } from '../lib/stats'
import { nm, t } from '../i18n'

// AIの答え（JSON）→ [{ name, weekday, exerciseIds, targets }]。知らない種目は新しく作る。
export default function useAiMenuImport() {
  const { allExercises, bodyParts, addExercise } = useData()

  return function importMenu(text) {
    const data = extractJson(text)
    const sets = data?.mysets
    if (!Array.isArray(sets) || sets.length === 0) {
      return { ok: false, message: t('答えの中にメニューのJSONが見つかりませんでした。AIの答えを全部そのまま貼ってください。'), days: [] }
    }
    const known = [...allExercises]
    let created = 0
    const days = sets.map((s) => {
      const exerciseIds = []
      const targets = {}
      for (const ex of s.exercises ?? []) {
        let e = matchExercise(ex.name, known, nm)
        if (!e) {
          const part = matchPart(ex.part, bodyParts, nm) ?? bodyParts[0]
          const id = addExercise({ name: String(ex.name).slice(0, 40), bodyPartId: part.id, equipment: 'その他', type: 'compound' })
          e = { id, name: ex.name, bodyPartId: part.id, type: 'compound', active: true }
          known.push(e)
          created++
        }
        if (exerciseIds.includes(e.id)) continue
        exerciseIds.push(e.id)
        if (!isCardio(e) && ex.sets) targets[e.id] = { sets: Number(ex.sets) || 3, reps: Number(ex.reps) || 10 }
      }
      return {
        name: String(s.name ?? t('AIのメニュー')).slice(0, 40),
        weekday: Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6 ? s.weekday : null,
        exerciseIds,
        targets,
      }
    }).filter((d) => d.exerciseIds.length > 0)
    const message =
      t('{n}件のメニューを取り込みました。', { n: days.length }) +
      (created ? t('（新しい種目を{n}個追加）', { n: created }) : '') +
      (data.advice ? `\n💬 ${data.advice}` : '')
    return { ok: days.length > 0, message, days }
  }
}
