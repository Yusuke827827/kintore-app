import { useRef, useState } from 'react'
import { useData } from '../state/DataContext'
import { todayStr } from '../lib/date'
import HowTo from '../components/HowTo'
import { LANGUAGES, getLanguage, t } from '../i18n'
import {
  ACCENTS,
  DEFAULT_THEME,
  FONT_SIZES,
  WALLPAPERS,
  loadCustomWallpaper,
  resizeImage,
  saveCustomWallpaper,
} from '../lib/theme'

const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=kintore-app%20sync'

function LanguageSection() {
  const { settings, updateSettings } = useData()
  return (
    <section className="card">
      <h2>{getLanguage() === 'en' ? 'Language / 言語' : '言語 / Language'}</h2>
      <div className="segmented">
        {LANGUAGES.map((l) => (
          <button
            key={l.key}
            className={settings.lang === l.key ? 'on' : ''}
            onClick={() => updateSettings({ lang: l.key })}
          >
            {l.label}
          </button>
        ))}
      </div>
      {settings.lang === 'en' && (
        <p className="muted">
          {t('最初から入っている部位・種目は英語で表示されます。自分で名前を変えたものはそのままです。')}
        </p>
      )}
    </section>
  )
}

const MODES = [
  { key: 'dark', label: 'ダーク' },
  { key: 'black', label: 'ブラック' },
  { key: 'light', label: 'ライト' },
  { key: 'auto', label: '端末に合わせる' },
]

function AppearanceSection() {
  const { settings, updateSettings, refreshWallpaper } = useData()
  const theme = { ...DEFAULT_THEME, ...settings.theme }
  const fileRef = useRef(null)
  const [message, setMessage] = useState('')
  const customWallpaper = loadCustomWallpaper()

  function setTheme(patch) {
    updateSettings({ theme: { ...theme, ...patch } })
  }

  async function handlePhoto(file) {
    setMessage('')
    try {
      const dataUrl = await resizeImage(file)
      if (!saveCustomWallpaper(dataUrl)) throw new Error()
      setTheme({ wallpaper: 'custom' })
      refreshWallpaper()
    } catch {
      setMessage(t('この画像は使えませんでした。別の写真を選んでください。'))
    }
  }

  return (
    <section className="card">
      <h2>{t('見た目')}</h2>

      <h3>{t('モード')}</h3>
      <div className="segmented">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={theme.mode === m.key ? 'on' : ''}
            onClick={() => setTheme({ mode: m.key })}
          >
            {t(m.label)}
          </button>
        ))}
      </div>

      <h3>{t('テーマカラー')}</h3>
      <div className="swatches">
        {Object.entries(ACCENTS).map(([key, a]) => (
          <button
            key={key}
            className={`swatch ${theme.accent === key ? 'on' : ''}`}
            style={{ background: a.c[0] }}
            onClick={() => setTheme({ accent: key })}
            aria-label={t(a.label)}
            title={t(a.label)}
          />
        ))}
      </div>

      <h3>{t('壁紙')}</h3>
      <div className="wallpapers">
        {WALLPAPERS.map((w) => (
          <button
            key={w.key}
            className={`wallpaper ${theme.wallpaper === w.key ? 'on' : ''}`}
            style={{ background: w.css === 'none' ? 'var(--sunken)' : w.css }}
            onClick={() => setTheme({ wallpaper: w.key })}
          >
            <span>{t(w.label)}</span>
          </button>
        ))}
        {customWallpaper && (
          <button
            className={`wallpaper ${theme.wallpaper === 'custom' ? 'on' : ''}`}
            style={{ backgroundImage: `url("${customWallpaper}")` }}
            onClick={() => setTheme({ wallpaper: 'custom' })}
          >
            <span>{t('写真')}</span>
          </button>
        )}
        <button className="wallpaper add" onClick={() => fileRef.current?.click()}>
          <span>{t('＋ 写真')}</span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handlePhoto(file)
          e.target.value = ''
        }}
      />
      {message && <p className="error">{message}</p>}
      {theme.wallpaper === 'custom' && (
        <p className="muted">{t('写真の壁紙はこの端末にだけ保存されます（同期されません）。')}</p>
      )}
      {theme.wallpaper !== 'none' && (
        <label className="field">
          {t('壁紙の濃さ')}
          <input
            type="range"
            min="0"
            max="0.85"
            step="0.05"
            value={0.85 - theme.dim}
            onChange={(e) => setTheme({ dim: Math.round((0.85 - Number(e.target.value)) * 100) / 100 })}
          />
        </label>
      )}

      <h3>{t('文字の大きさ')}</h3>
      <div className="segmented">
        {FONT_SIZES.map((f) => (
          <button
            key={f.key}
            className={theme.fontSize === f.key ? 'on' : ''}
            onClick={() => setTheme({ fontSize: f.key })}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      <button className="link" onClick={() => updateSettings({ theme: DEFAULT_THEME })}>
        {t('見た目を最初の状態に戻す')}
      </button>
    </section>
  )
}

function SyncSection() {
  const { syncStatus, connectSync, disconnectSync, runSync } = useData()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect() {
    if (!token.trim()) return
    setBusy(true)
    setError('')
    try {
      await connectSync(token)
      setToken('')
    } catch (e) {
      setError(e.message || t('接続できませんでした'))
    } finally {
      setBusy(false)
    }
  }

  if (syncStatus.configured) {
    const time =
      syncStatus.at &&
      new Date(syncStatus.at).toLocaleTimeString(getLanguage() === 'en' ? 'en-US' : 'ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })
    return (
      <section className="card">
        <h2>
          {t('クラウド同期')} <span className="badge ok">{t('オン')}</span>
        </h2>
        <p className="muted">
          {syncStatus.state === 'syncing' && t('同期中…')}
          {syncStatus.state === 'ok' && t('最終同期 {time}', { time })}
          {syncStatus.state === 'error' && <span className="error">⚠ {syncStatus.message}</span>}
          {syncStatus.state === 'idle' && t('待機中')}
        </p>
        <p className="muted">
          {t(
            '入力するたびに自動でGitHubの非公開Gistへ保存されます。別のブラウザ・スマホ・PCでも、同じトークンを貼れば同じ記録が見られます。'
          )}
        </p>
        <div className="row">
          <button className="secondary" onClick={runSync}>
            {t('今すぐ同期')}
          </button>
          <button
            className="secondary danger"
            onClick={() =>
              confirm(t('この端末の同期を解除しますか？（記録はこの端末にも残ります）')) &&
              disconnectSync()
            }
          >
            {t('同期を解除')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>{t('クラウド同期（他のブラウザ・端末と共有）')}</h2>
      <p className="muted">
        {t(
          '今は記録がこのブラウザの中だけに保存されています。Safariとホーム画面のアプリ、スマホとPCなどで記録を共有するには同期をオンにしてください（無料・1回だけの設定）。'
        )}
      </p>
      <ol className="steps">
        <li>
          <a href={TOKEN_URL} target="_blank" rel="noreferrer">
            {t('GitHubのトークン作成ページ')}
          </a>
          {t(
            'を開き、Expiration を「No expiration」にして一番下の「Generate token」を押す（権限は gist だけでOK）'
          )}
        </li>
        <li>{t('表示された ghp_ で始まる文字列をコピーして、下に貼り付ける')}</li>
        <li>{t('他の端末でも同じトークンを貼れば、自動で同じデータにつながります')}</li>
      </ol>
      <div className="row">
        <input
          className="grow"
          type="password"
          placeholder="ghp_xxxxxxxx"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="primary small" onClick={handleConnect} disabled={busy || !token.trim()}>
          {busy ? t('接続中…') : t('同期をオン')}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  )
}

function BackupSection() {
  const data = useData()
  const fileRef = useRef(null)
  const [message, setMessage] = useState('')

  // 画面用に絞り込む前の、削除済みも含めた全データを書き出す
  function snapshot() {
    return {
      version: data.version,
      bodyParts: data.allBodyParts,
      exercises: data.allExercises,
      sessions: data.sessions,
      deletedSessionIds: data.deletedSessionIds,
      endedWorkoutIds: data.endedWorkoutIds,
      routines: data.routines,
      settings: data.settings,
      masterUpdatedAt: data.masterUpdatedAt,
      activeWorkout: data.activeWorkout,
    }
  }

  function handleDownload() {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kintore-backup-${todayStr()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot()))
      setMessage(t('コピーしました。別のブラウザで「貼り付けて読み込む」をしてください。'))
    } catch {
      setMessage(t('コピーできませんでした。ファイルで書き出してください。'))
    }
  }

  function importText(text) {
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed.sessions)) throw new Error()
      data.importData(parsed)
      setMessage(
        t('読み込みました（{n}件の記録。今ある記録はそのまま残ります）', {
          n: parsed.sessions.length,
        })
      )
    } catch {
      setMessage(t('読み込めませんでした。このアプリのバックアップか確認してください。'))
    }
  }

  async function handlePaste() {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      text = prompt(t('バックアップの文字列を貼り付けてください')) ?? ''
    }
    if (text) importText(text)
  }

  return (
    <section className="card">
      <h2>{t('バックアップ')}</h2>
      <p className="muted">
        {t('記録 {n}件。手動で別のブラウザへ移すときや、念のための保存に。', {
          n: data.sessions.length,
        })}
      </p>
      <div className="row">
        <button className="secondary" onClick={handleDownload}>
          {t('ファイルに書き出す')}
        </button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          {t('ファイルから読み込む')}
        </button>
      </div>
      <div className="row">
        <button className="secondary" onClick={handleCopy}>
          {t('コピー')}
        </button>
        <button className="secondary" onClick={handlePaste}>
          {t('貼り付けて読み込む')}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) importText(await file.text())
          e.target.value = ''
        }}
      />
      {message && <p className="muted">{message}</p>}
    </section>
  )
}

function formatRest(sec) {
  if (sec % 60 === 0) return t('{m}分', { m: sec / 60 })
  return t('{m}分{s}秒', { m: Math.floor(sec / 60), s: sec % 60 })
}

export default function Settings({ onOpenCustomize }) {
  const { settings, updateSettings } = useData()

  return (
    <div className="screen">
      <h1>{t('設定')}</h1>

      <HowTo />

      <section className="card">
        <h2>{t('カスタマイズ')}</h2>
        <p className="muted">{t('部位・種目・マイセットを、追加・名前変更・並べ替え・削除できます。')}</p>
        <div className="custom-links">
          <button className="secondary" onClick={() => onOpenCustomize('parts')}>
            {t('部位')}
          </button>
          <button className="secondary" onClick={() => onOpenCustomize('exercises')}>
            {t('種目')}
          </button>
          <button className="secondary" onClick={() => onOpenCustomize('routines')}>
            {t('マイセット')}
          </button>
        </div>
      </section>

      <LanguageSection />
      <AppearanceSection />

      <section className="card">
        <h2>{t('休憩タイマー')}</h2>
        <p className="muted">{t('セットの ✓ を押すと自動で始まります。')}</p>
        <div className="chips">
          {[60, 90, 120, 150, 180, 240].map((sec) => (
            <button
              key={sec}
              className={`chip ${settings.restSeconds === sec ? 'on' : ''}`}
              onClick={() => updateSettings({ restSeconds: sec })}
            >
              {formatRest(sec)}
            </button>
          ))}
        </div>
        <label className="option toggle-row">
          <input
            type="checkbox"
            checked={settings.sound !== false}
            onChange={(e) => updateSettings({ sound: e.target.checked })}
          />
          {t('終わったら音で知らせる')}
        </label>
      </section>

      <SyncSection />
      <BackupSection />
    </div>
  )
}
