import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { TOUR_KEY } from '../lib/tour'

// はじめてガイド：最初のトレーニングを、画面の上に吹き出しを出しながら一緒にやる
// sel：光らせる場所、waitFor：これが画面に出たら自動で次へ（ボタンを押してもらう手順）
const STEPS = [
  {
    sel: '.quick-card, .pick-mode + .item-header, .card .primary.big',
    text: 'ここからトレーニングを始めます。マイセットのカードか、部位を選んで「〜で始める」を押してみましょう。',
    waitFor: '.workout-header',
  },
  {
    sel: '.set-row input',
    text: '薄い数字は前回の記録です。初めての種目は、重さと回数を入れてください。',
  },
  {
    sel: '.stepper-row',
    text: '「−／＋」で、キーボードを出さずに重さと回数を変えられます。',
  },
  {
    sel: '.set-row .check',
    text: 'できたら ✓ を押します。前回と同じなら ✓ だけでOK。休憩タイマーが自動で始まります。',
    waitFor: '.set-row.done',
  },
  {
    sel: '.mic',
    text: 'マイクを押して「60キロ10回」と話すだけでも記録できます。',
    optional: true,
  },
  {
    sel: '.workout-header .primary',
    text: '全部終わったら「終了」。入力するたびに自動で保存されているので、途中でアプリを閉じても大丈夫です。',
  },
]

const KEY = TOUR_KEY

function readStep() {
  try {
    const v = localStorage.getItem(KEY)
    return v == null ? null : Number(v)
  } catch {
    return null
  }
}

export default function Tour() {
  const [step, setStep] = useState(readStep)
  const [rect, setRect] = useState(null)

  function go(n) {
    const next = n >= STEPS.length ? null : n
    try {
      if (next == null) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, String(next))
    } catch {
      // 保存できなくても進められる
    }
    setStep(next)
  }

  useEffect(() => {
    const onStart = () => setStep(readStep())
    window.addEventListener('kintore-tour', onStart)
    return () => window.removeEventListener('kintore-tour', onStart)
  }, [])

  // 光らせる場所を探し続ける（画面が切り替わる・スクロールするので）
  useEffect(() => {
    if (step == null) return
    const s = STEPS[step]
    let shown = 0
    const timer = setInterval(() => {
      if (s.waitFor && document.querySelector(s.waitFor)) {
        go(step + 1)
        return
      }
      const el = document.querySelector(s.sel)
      if (!el) {
        // 任意の手順（マイクがない端末など）は飛ばす
        if (s.optional && ++shown > 3) go(step + 1)
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      if (r.top < 60 || r.bottom > window.innerHeight - 160) el.scrollIntoView({ block: 'center' })
      setRect((cur) =>
        cur && cur.top === r.top && cur.left === r.left && cur.width === r.width && cur.height === r.height
          ? cur
          : { top: r.top, left: r.left, width: r.width, height: r.height }
      )
    }, 250)
    return () => clearInterval(timer)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step == null || !rect) return null
  const s = STEPS[step]
  const pad = 6
  const below = rect.top + rect.height + 180 < window.innerHeight
  return (
    <div className="tour" role="dialog" aria-live="polite" aria-label={t('はじめてガイド')}>
      <div
        className="tour-spot"
        style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
      />
      <div className="tour-bubble" style={below ? { top: rect.top + rect.height + 14 } : { bottom: window.innerHeight - rect.top + 14 }}>
        <span className="tour-count">
          {step + 1} / {STEPS.length}
        </span>
        <p>{t(s.text)}</p>
        <div className="row">
          <button className="secondary small" onClick={() => go(null)}>
            {t('ガイドを終わる')}
          </button>
          {!s.waitFor && (
            <button className="primary small" onClick={() => go(step + 1)}>
              {step + 1 === STEPS.length ? t('はじめる') : t('次へ')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
