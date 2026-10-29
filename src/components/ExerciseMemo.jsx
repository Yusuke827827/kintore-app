import { useState } from 'react'
import { useData } from '../state/DataContext'
import { t } from '../i18n'

const URL_RE = /(https?:\/\/[^\s　、。）)」]+)/g

// 文章の中のURLをタップで開けるリンクにする
export function Linkified({ text }) {
  const parts = text.split(URL_RE)
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        {part.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
        {part.replace(/^https?:\/\/(www\.)?/, '').length > 40 ? '…' : ''}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// 種目ごとのメモ。毎回そのまま引き継がれる（種目に保存）。普段は2行だけ、編集で大きく書ける。
export default function ExerciseMemo({ exercise, fallback }) {
  const { updateExercise } = useData()
  const memo = exercise?.memo ?? ''
  const shown = memo || fallback || ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)

  if (!exercise) return null

  if (editing) {
    return (
      <div className="memo editing">
        <textarea
          className="memo-area"
          rows={8}
          autoFocus
          placeholder={t('シートの位置、フォームの注意、参考動画のURLなど。次回以降もずっと表示されます。')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="row">
          <button className="secondary" onClick={() => setEditing(false)}>
            {t('キャンセル')}
          </button>
          <button
            className="primary"
            onClick={() => {
              updateExercise(exercise.id, { memo: draft.trim() })
              setEditing(false)
            }}
          >
            {t('保存')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="memo">
      {shown ? (
        <p className={`memo-text ${expanded ? 'open' : ''}`} onClick={() => setExpanded(!expanded)}>
          📝 <Linkified text={shown} />
        </p>
      ) : (
        <p className="muted memo-empty">{t('📝 メモなし')}</p>
      )}
      <button
        className="ghost memo-edit"
        onClick={() => {
          setDraft(shown)
          setEditing(true)
        }}
      >
        {shown ? t('編集') : t('＋ メモ')}
      </button>
    </div>
  )
}
