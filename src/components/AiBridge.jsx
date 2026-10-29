import { useState } from 'react'
import { AI_SERVICES, copyAndOpen } from '../lib/aiBridge'
import { t } from '../i18n'

// ChatGPT・Gemini・Claude に質問文をコピーして開き、答えを貼り付けて取り込む
// buildPrompt: () => 質問文、onImport: (答えの文字列) => { ok, message }（省略すると貼り付け欄なし）
export default function AiBridge({ buildPrompt, onImport, importLabel, hint }) {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(null)

  async function ask(service) {
    const ok = await copyAndOpen(service, buildPrompt())
    setCopied(ok ? service.label : 'fail')
  }

  if (!open) {
    return (
      <button className="link ai-open" onClick={() => setOpen(true)}>
        {t('🤖 ChatGPT・Gemini・Claudeに相談する（無料）')}
      </button>
    )
  }

  return (
    <div className="ai-bridge">
      <p className="muted">
        {hint ??
          t('質問文をコピーしてAIのサイトを開きます。貼り付けて送信し、返ってきた答えを下に貼ってください。')}
      </p>
      <div className="ai-services">
        {AI_SERVICES.map((s) => (
          <button key={s.key} className="secondary" onClick={() => ask(s)}>
            {s.label}
          </button>
        ))}
      </div>
      {copied && copied !== 'fail' && (
        <p className="target">{t('質問文をコピーしました。{ai}に貼り付けて送信してください。', { ai: copied })}</p>
      )}
      {copied === 'fail' && (
        <details>
          <summary className="muted">{t('コピーできなかったときは、ここから手でコピー')}</summary>
          <textarea className="memo-area" readOnly value={buildPrompt()} rows={6} />
        </details>
      )}
      {onImport && (
        <>
          <textarea
            className="memo-area"
            rows={5}
            placeholder={t('AIの答えをここに貼り付け')}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value)
              setMessage('')
            }}
          />
          <button
            className="primary wide"
            disabled={!answer.trim()}
            onClick={() => {
              const r = onImport(answer)
              setMessage(r.message)
              if (r.ok) setAnswer('')
            }}
          >
            {importLabel ?? t('取り込む')}
          </button>
          {message && <p className="muted">{message}</p>}
        </>
      )}
      <button className="link" onClick={() => setOpen(false)}>
        {t('閉じる')}
      </button>
    </div>
  )
}
