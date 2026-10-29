import { useRef, useState } from 'react'
import { useData } from '../state/DataContext'
import { todayStr } from '../lib/date'
import HowTo from '../components/HowTo'
import { bodyCsv, downloadFile, workoutsCsv } from '../lib/csv'
import { DEFAULT_PROGRESSION } from '../lib/storage'
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
import { usePremium } from '../state/PremiumContext'
import { FREE_ACCENTS, FREE_WALLPAPERS } from '../lib/pricing'
import LockCard from '../components/LockCard'
import { PRIVACY_URL, TERMS_URL } from '../components/Paywall'

// プレミアムの状態と、プランの確認・復元
function PremiumSection() {
  const { premium, entitlement, kind, openPaywall, restore, resetTest } = usePremium()
  const [message, setMessage] = useState('')
  const until =
    entitlement?.expiresAt &&
    new Date(entitlement.expiresAt).toLocaleDateString(getLanguage() === 'en' ? 'en-US' : 'ja-JP')

  return (
    <section className="card">
      <h2>
        {t('💪 プレミアム')}{' '}
        {premium && kind !== 'beta' && <span className="badge ok">{t('利用中')}</span>}
      </h2>
      {kind === 'beta' ? (
        <p className="muted">{t('Web版はベータ期間中のため、すべての機能を無料で使えます。')}</p>
      ) : premium ? (
        <p className="muted">
          {entitlement?.plan === 'lifetime'
            ? t('買い切り：ずっと使えます')
            : entitlement?.trial
              ? t('無料お試し中（{d}まで）', { d: until })
              : until
                ? t('次の更新日 {d}', { d: until })
                : ''}
        </p>
      ) : (
        <p className="muted">{t('記録はずっと無料。メニュー自動作成・トレーナー・分析などはプレミアムで。')}</p>
      )}
      <div className="row">
        <button className={premium ? 'secondary' : 'primary'} onClick={() => openPaywall()}>
          {premium ? t('プランを見る') : t('プレミアムを見る')}
        </button>
        {kind === 'store' && (
          <button
            className="secondary"
            onClick={async () => {
              setMessage('')
              try {
                setMessage((await restore()) ? t('復元しました。') : t('復元できる購入が見つかりませんでした。'))
              } catch (e) {
                setMessage(e?.message || t('復元できませんでした。'))
              }
            }}
          >
            {t('購入を復元')}
          </button>
        )}
        {kind === 'test' && premium && (
          <button className="secondary" onClick={resetTest}>
            {t('無料版に戻す（テスト）')}
          </button>
        )}
      </div>
      {message && <p className="muted">{message}</p>}
      <div className="paywall-links">
        <a href={TERMS_URL} target="_blank" rel="noreferrer">
          {t('利用規約')}
        </a>
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
          {t('プライバシーポリシー')}
        </a>
      </div>
    </section>
  )
}

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
  const { premium, gate } = usePremium()
  const theme = { ...DEFAULT_THEME, ...settings.theme }
  const locked = (free, key) => !premium && !free.includes(key)
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
            className={`swatch ${theme.accent === key && !locked(FREE_ACCENTS, key) ? 'on' : ''} ${locked(FREE_ACCENTS, key) ? 'locked' : ''}`}
            style={{ background: a.c[0] }}
            onClick={() => (!locked(FREE_ACCENTS, key) || gate('theme')) && setTheme({ accent: key })}
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
            className={`wallpaper ${theme.wallpaper === w.key && !locked(FREE_WALLPAPERS, w.key) ? 'on' : ''}`}
            style={{ background: w.css === 'none' ? 'var(--sunken)' : w.css }}
            onClick={() => (!locked(FREE_WALLPAPERS, w.key) || gate('theme')) && setTheme({ wallpaper: w.key })}
          >
            <span>
              {locked(FREE_WALLPAPERS, w.key) && '🔒 '}
              {t(w.label)}
            </span>
          </button>
        ))}
        {customWallpaper && premium && (
          <button
            className={`wallpaper ${theme.wallpaper === 'custom' ? 'on' : ''}`}
            style={{ backgroundImage: `url("${customWallpaper}")` }}
            onClick={() => setTheme({ wallpaper: 'custom' })}
          >
            <span>{t('写真')}</span>
          </button>
        )}
        <button className="wallpaper add" onClick={() => gate('theme') && fileRef.current?.click()}>
          <span>
            {!premium && '🔒 '}
            {t('＋ 写真')}
          </span>
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
  const { premium } = usePremium()
  if (!premium) {
    return (
      <section className="card">
        <h2>{t('クラウド同期（他のブラウザ・端末と共有）')}</h2>
        <p className="muted">{t('記録はこの端末に自動で保存されています。別の端末へ移すときは、下の「バックアップ」を使えます（無料）。')}</p>
        <LockCard feature="sync" />
      </section>
    )
  }
  return <SyncSettings />
}

function SyncSettings() {
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
      bodyLogs: data.bodyLogs,
      deletedBodyLogIds: data.deletedBodyLogIds,
      plans: data.plans,
      profile: data.profile,
      gym: data.gym,
      meals: data.meals,
      deletedMealIds: data.deletedMealIds,
      seedVersion: data.seedVersion,
    }
  }

  function handleDownload() {
    downloadFile(
      `kintore-backup-${todayStr()}.json`,
      JSON.stringify(snapshot(), null, 2),
      'application/json'
    )
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

      <h3>{t('表計算ソフト用（CSV）')}</h3>
      <p className="muted">{t('Excel や Google スプレッドシートで開けます。')}</p>
      <div className="row">
        <button
          className="secondary"
          disabled={data.sessions.length === 0}
          onClick={() =>
            downloadFile(
              `kintore-workouts-${todayStr()}.csv`,
              workoutsCsv(data.sessions, data.allExercises, data.allBodyParts),
              'text/csv'
            )
          }
        >
          {t('トレーニング記録')}
        </button>
        <button
          className="secondary"
          disabled={data.bodyLogs.length === 0}
          onClick={() =>
            downloadFile(`kintore-body-${todayStr()}.csv`, bodyCsv(data.bodyLogs), 'text/csv')
          }
        >
          {t('体重の記録')}
        </button>
      </div>
    </section>
  )
}

const FOCUS = [
  { key: 'strength', label: '筋トレ中心' },
  { key: 'cardio', label: '有酸素中心' },
  { key: 'mixed', label: '両方' },
]

function GoalSection() {
  const { settings, updateSettings } = useData()
  const prog = { ...DEFAULT_PROGRESSION, ...settings.progression }
  const setProg = (patch) => updateSettings({ progression: { ...prog, ...patch } })
  const cg = settings.cardioGoal ?? { weeklyMin: 150, monthlyKm: 0 }

  return (
    <>
    <section className="card">
      <h2>{t('トレーニングのスタイル')}</h2>
      <p className="muted">{t('有酸素中心にすると、ホームが有酸素向け（今週の時間・距離、ワンタップで開始）になります。')}</p>
      <div className="segmented">
        {FOCUS.map((f) => (
          <button
            key={f.key}
            className={(settings.focus ?? 'strength') === f.key ? 'on' : ''}
            onClick={() => updateSettings({ focus: f.key })}
          >
            {t(f.label)}
          </button>
        ))}
      </div>
      {(settings.focus === 'cardio' || settings.focus === 'mixed') && (
        <>
          <h3>{t('有酸素の目標（週の時間）')}</h3>
          <div className="chips">
            {[60, 90, 120, 150, 200, 300].map((n) => (
              <button
                key={n}
                className={`chip small ${cg.weeklyMin === n ? 'on' : ''}`}
                onClick={() => updateSettings({ cardioGoal: { ...cg, weeklyMin: n } })}
              >
                {t('{m}分', { m: n })}
              </button>
            ))}
          </div>
          <p className="muted">{t('健康づくりの目安は週150分（WHO）です。')}</p>
          <h3>{t('有酸素の目標（月の距離）')}</h3>
          <div className="chips">
            {[0, 20, 50, 100, 150, 200].map((n) => (
              <button
                key={n}
                className={`chip small ${cg.monthlyKm === n ? 'on' : ''}`}
                onClick={() => updateSettings({ cardioGoal: { ...cg, monthlyKm: n } })}
              >
                {n === 0 ? t('なし') : `${n}km`}
              </button>
            ))}
          </div>
        </>
      )}
    </section>

    <section className="card">
      <h2>{t('週の目標')}</h2>
      <p className="muted">{t('1週間（月〜日）に何日トレーニングするか。ホームに達成状況と連続記録が出ます。')}</p>
      <div className="chips">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            className={`chip ${settings.weeklyGoal === n ? 'on' : ''}`}
            onClick={() => updateSettings({ weeklyGoal: n })}
          >
            {n === 0 ? t('なし') : t('週{n}回', { n })}
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 16 }}>{t('重量の自動アップ')}</h2>
      <label className="option toggle-row">
        <input type="checkbox" checked={prog.on} onChange={(e) => setProg({ on: e.target.checked })} />
        {t('前回すべてのセットで目標回数をこなせたら、次は重量を上げて表示する')}
      </label>
      {prog.on && (
        <>
          <h3>{t('目標回数')}</h3>
          <div className="chips">
            {[5, 6, 8, 10, 12, 15].map((n) => (
              <button
                key={n}
                className={`chip ${prog.reps === n ? 'on' : ''}`}
                onClick={() => setProg({ reps: n })}
              >
                {t('{n}回', { n })}
              </button>
            ))}
          </div>
          <h3>{t('上げる重さ')}</h3>
          <div className="chips">
            {[1, 1.25, 2, 2.5, 5].map((n) => (
              <button
                key={n}
                className={`chip ${prog.step === n ? 'on' : ''}`}
                onClick={() => setProg({ step: n })}
              >
                +{n}kg
              </button>
            ))}
          </div>
        </>
      )}
    </section>
    </>
  )
}

// 記録のリセット：消すものを選び、確認の文字を入れてから消す
function ResetSection() {
  const { sessions, bodyLogs, meals, resetData, syncStatus } = useData()
  const [scope, setScope] = useState({ workouts: false, body: false, meals: false, all: false })
  const [done, setDone] = useState('')
  const any = scope.workouts || scope.body || scope.meals || scope.all
  const options = [
    ['workouts', t('トレーニング記録（{n}件）', { n: sessions.length })],
    ['body', t('体重の記録（{n}件）', { n: bodyLogs.length })],
    ['meals', t('食事の記録（{n}件）', { n: meals.length })],
    ['all', t('すべて（部位・種目・マイセット・予定・トレーナーの設定も最初の状態に）')],
  ]

  function handleReset() {
    const word = t('リセット')
    const input = prompt(
      t('本当に消しますか？元に戻せません。\n消す場合は「{word}」と入力してください。', { word })
    )
    if (input?.trim() !== word) {
      setDone(t('入力が違うので、何も消していません。'))
      return
    }
    resetData(scope)
    setScope({ workouts: false, body: false, meals: false, all: false })
    setDone(t('リセットしました。'))
  }

  return (
    <section className="card danger-zone">
      <h2>{t('記録のリセット')}</h2>
      <p className="muted">
        {t('消す前に、上の「バックアップ」で「ファイルに書き出す」をしておくと、あとから戻せます。')}
      </p>
      {options.map(([key, label]) => (
        <label key={key} className="option toggle-row">
          <input
            type="checkbox"
            checked={scope[key] || (key !== 'all' && scope.all)}
            disabled={key !== 'all' && scope.all}
            onChange={(e) => {
              setScope({ ...scope, [key]: e.target.checked })
              setDone('')
            }}
          />
          {label}
        </label>
      ))}
      {syncStatus.configured && (
        <p className="muted">{t('クラウド同期がオンなので、同期している他の端末からも消えます。')}</p>
      )}
      <button className="secondary danger wide" disabled={!any} onClick={handleReset}>
        {t('選んだ記録を消す')}
      </button>
      {done && <p className="muted">{done}</p>}
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

      <PremiumSection />
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

      <GoalSection />

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
        <label className="option toggle-row">
          <input
            type="checkbox"
            checked={settings.keepAwake !== false}
            onChange={(e) => updateSettings({ keepAwake: e.target.checked })}
          />
          {t('記録中は画面を消さない')}
        </label>
        {typeof navigator !== 'undefined' && !('wakeLock' in navigator) && (
          <p className="muted">
            {t('この端末・ブラウザは画面を消さない機能に対応していません（iPhoneはiOS 16.4以降、ホーム画面に追加したアプリで使えます）。')}
          </p>
        )}
      </section>

      <SyncSection />
      <BackupSection />
      <ResetSection />
    </div>
  )
}
