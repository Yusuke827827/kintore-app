import { useRef, useState } from 'react'
import { useData } from '../state/DataContext'
import { SOURCE_LABEL, healthToImport, readCsvWorkouts, rowsToImport, summarize } from '../lib/importers'
import { readHealthExport } from '../lib/healthExport'
import { healthAvailable, readHealth } from '../lib/health'
import { addDays, formatDateJa, todayStr } from '../lib/date'
import { t } from '../i18n'
import Icon from './Icon'

// 取り込む前の確認（何件・いつからいつまで・新しく作る種目）
function Preview({ imp, label, onCancel, onConfirm, extra }) {
  const sum = summarize(imp)
  return (
    <div className="import-preview">
      <p>
        <strong>{label}</strong>
      </p>
      {sum.sessions > 0 ? (
        <p className="muted">
          {t('{n}回分・{s}セット（{from}〜{to}）', {
            n: sum.sessions,
            s: sum.sets,
            from: formatDateJa(sum.from),
            to: formatDateJa(sum.to),
          })}
        </p>
      ) : (
        <p className="muted">{t('取り込める記録が見つかりませんでした。')}</p>
      )}
      {sum.bodyLogs > 0 && <p className="muted">{t('体重 {n}日分', { n: sum.bodyLogs })}</p>}
      {sum.newExercises.length > 0 && (
        <p className="muted">
          {t('新しく作る種目：{list}', {
            list: sum.newExercises.slice(0, 8).join(t('・')) + (sum.newExercises.length > 8 ? ` ${t('ほか{n}種目', { n: sum.newExercises.length - 8 })}` : ''),
          })}
        </p>
      )}
      {extra}
      <div className="row">
        <button className="secondary" onClick={onCancel}>
          {t('キャンセル')}
        </button>
        <button className="primary" disabled={sum.sessions + sum.bodyLogs === 0} onClick={onConfirm}>
          {t('取り込む')}
        </button>
      </div>
    </div>
  )
}

export function ImportFromApps() {
  const { allExercises, addImported } = useData()
  const fileRef = useRef(null)
  const [text, setText] = useState(null)
  const [lb, setLb] = useState(false)
  const [message, setMessage] = useState('')

  const parsed = text != null ? readCsvWorkouts(text, { lb }) : null
  const imp = parsed?.source ? rowsToImport(parsed.rows, parsed.source, allExercises) : null

  return (
    <section className="card">
      <h2>{t('他のアプリから引っ越し')}</h2>
      <p className="muted">{t('Strong・Hevy・筋トレMEMOなどで書き出したCSVを読み込んで、今までの記録をそのまま引き継げます。同じファイルを2回読み込んでも重なりません。')}</p>
      {!imp && (
        <button className="secondary wide" onClick={() => fileRef.current?.click()}>
          {t('CSVファイルを選ぶ')}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setMessage('')
          setText(await file.text())
        }}
      />
      {parsed && !parsed.source && <p className="error">{t('このファイルは読み込めませんでした。')}</p>}
      {imp && (
        <Preview
          imp={imp}
          label={t('{src}の記録', { src: t(SOURCE_LABEL[parsed.source]) })}
          extra={
            parsed.source === 'strong' || parsed.source === 'generic' ? (
              <label className="option toggle-row">
                <input type="checkbox" checked={lb} onChange={(e) => setLb(e.target.checked)} />
                {t('重さがポンド（lb）で記録されている')}
              </label>
            ) : null
          }
          onCancel={() => setText(null)}
          onConfirm={() => {
            addImported(imp)
            setText(null)
            setMessage(t('取り込みました。「履歴」で確認できます。'))
          }}
        />
      )}
      {message && <p className="target">{message}</p>}
    </section>
  )
}

export function ImportFromHealth() {
  const { allExercises, addImported, settings, updateSettings } = useData()
  const fileRef = useRef(null)
  const [imp, setImp] = useState(null)
  const [progress, setProgress] = useState(null)
  const [message, setMessage] = useState('')
  const native = healthAvailable()

  function prepare(data) {
    const conv = healthToImport(data.workouts, allExercises)
    setImp({ ...conv, bodyLogs: data.bodyLogs })
  }

  return (
    <section className="card">
      <h2 className="with-icon">
        <Icon name="pulse" size={20} /> {t('Apple Watch・ヘルスケア')}
      </h2>
      <p className="muted">
        {t('Apple Watch のランニング・ウォーキング・バイクなどの記録（時間・距離・消費カロリー）と体重を取り込みます。筋トレのワークアウトは取り込みません。')}
      </p>
      {settings.healthImportedAt && (
        <p className="muted">{t('前回の取り込み：{d}', { d: formatDateJa(settings.healthImportedAt) })}</p>
      )}
      {!imp && progress == null && (
        <>
          {native && (
            <button
              className="primary wide"
              onClick={async () => {
                setMessage('')
                try {
                  prepare(await readHealth({ since: settings.healthImportedAt ? addDays(settings.healthImportedAt, -1) : addDays(todayStr(), -365) }))
                } catch (e) {
                  setMessage(e?.message || t('ヘルスケアを読めませんでした。'))
                }
              }}
            >
              {t('ヘルスケアから読み込む')}
            </button>
          )}
          <button className={`${native ? 'link' : 'secondary wide'}`} onClick={() => fileRef.current?.click()}>
            {t('書き出したファイル（export.zip）を選ぶ')}
          </button>
          {!native && (
            <ol className="steps">
              <li>{t('iPhoneの「ヘルスケア」アプリを開き、右上の自分のアイコン →「すべてのヘルスケアデータを書き出す」')}</li>
              <li>{t('「ファイルに保存」で export.zip を保存（数分かかることがあります）')}</li>
              <li>{t('上のボタンで export.zip（または中の export.xml）を選ぶ')}</li>
            </ol>
          )}
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".zip,.xml,application/zip,text/xml,application/xml"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setMessage('')
          setProgress(0)
          try {
            prepare(await readHealthExport(file, { onProgress: setProgress }))
          } catch (err) {
            setMessage(
              err?.message === 'no-export-xml'
                ? t('zip の中に export.xml が見つかりませんでした。')
                : t('読み込めませんでした。zip を「ファイル」アプリで開いて、中の export.xml を選んでみてください。')
            )
          } finally {
            setProgress(null)
          }
        }}
      />
      {progress != null && (
        <div className="import-progress">
          <span className="muted">{t('読み込み中… {p}%', { p: Math.round(progress * 100) })}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      {imp && (
        <Preview
          imp={imp}
          label={t('ヘルスケアの記録')}
          onCancel={() => setImp(null)}
          onConfirm={() => {
            addImported(imp)
            updateSettings({ healthImportedAt: todayStr() })
            setImp(null)
            setMessage(t('取り込みました。「履歴」で確認できます。'))
          }}
        />
      )}
      {message && <p className={message.includes('取り込みました') ? 'target' : 'error'}>{message}</p>}
    </section>
  )
}
