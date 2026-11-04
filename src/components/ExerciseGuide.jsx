import { EXERCISE_GUIDE } from '../lib/exerciseGuide'
import { MUSCLES, musclesOf } from '../lib/muscles'
import { getLanguage, nm, t } from '../i18n'
import Icon from './Icon'

// 種目の解説（効く筋肉・やり方・よくある間違い・フォーム動画）を下から出す
export default function ExerciseGuide({ exercise, onClose }) {
  const guide = EXERCISE_GUIDE[exercise.id]
  const m = musclesOf(exercise)
  const name = (id) => t(MUSCLES.find((x) => x.id === id)?.name ?? id)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet guide-sheet" role="dialog" aria-label={nm(exercise)} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{nm(exercise)}</h2>
          <button className="ghost" onClick={onClose} aria-label={t('閉じる')}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="guide-body">
          {(m.p.length > 0 || m.s.length > 0) && (
            <div className="muscle-chips guide-muscles">
              {m.p.map((id) => (
                <span key={id} className="main">
                  {name(id)}
                </span>
              ))}
              {m.s.map((id) => (
                <span key={id}>{name(id)}</span>
              ))}
            </div>
          )}
          {guide ? (
            <>
              <h3>{t('やり方')}</h3>
              <ol className="guide-steps">
                {guide.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <h3>{t('よくある間違い')}</h3>
              <ul className="guide-mistakes">
                {guide.mistakes.map((s) => (
                  <li key={s}>
                    <Icon name="alert" size={15} /> {s}
                  </li>
                ))}
              </ul>
              {getLanguage() === 'en' && <p className="muted">{t('解説は今のところ日本語だけです。')}</p>}
            </>
          ) : (
            <p className="muted">{t('自分で追加した種目です。やり方は、種目のメモやフォーム動画に残せます。')}</p>
          )}
          {/^https?:\/\//.test(exercise.videoUrl ?? '') && (
            <a className="secondary-link" href={exercise.videoUrl} target="_blank" rel="noreferrer">
              ▶ {t('フォーム動画を見る')}
            </a>
          )}
          <p className="muted guide-note">{t('一般的なフォームの目安です。痛みが出たら中止して、専門家に相談してください。')}</p>
        </div>
      </div>
    </div>
  )
}
