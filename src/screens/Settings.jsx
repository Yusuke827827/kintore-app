import { useRef, useState } from 'react'
import { useData } from '../state/DataContext'
import { todayStr } from '../lib/date'

const GROUP_LABEL = { upper: '上半身', lower: '下半身', core: '体幹' }
const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=kintore-app%20sync'

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
      setError(e.message || '接続できませんでした')
    } finally {
      setBusy(false)
    }
  }

  if (syncStatus.configured) {
    return (
      <section className="card">
        <h2>クラウド同期 <span className="badge ok">オン</span></h2>
        <p className="muted">
          {syncStatus.state === 'syncing' && '同期中…'}
          {syncStatus.state === 'ok' &&
            `最終同期 ${new Date(syncStatus.at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
          {syncStatus.state === 'error' && <span className="error">⚠ {syncStatus.message}</span>}
          {syncStatus.state === 'idle' && '待機中'}
        </p>
        <p className="muted">
          入力するたびに自動でGitHubの非公開Gistへ保存されます。別のブラウザ・スマホ・PCでも、同じトークンを貼れば同じ記録が見られます。
        </p>
        <div className="row">
          <button className="secondary" onClick={runSync}>
            今すぐ同期
          </button>
          <button
            className="secondary danger"
            onClick={() =>
              confirm('この端末の同期を解除しますか？（記録はこの端末にも残ります）') && disconnectSync()
            }
          >
            同期を解除
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>クラウド同期（他のブラウザ・端末と共有）</h2>
      <p className="muted">
        今は記録がこのブラウザの中だけに保存されています。Safariとホーム画面のアプリ、スマホとPCなどで記録を共有するには同期をオンにしてください（無料・1回だけの設定）。
      </p>
      <ol className="steps">
        <li>
          <a href={TOKEN_URL} target="_blank" rel="noreferrer">
            GitHubのトークン作成ページ
          </a>
          を開き、Expiration を「No expiration」にして一番下の「Generate token」を押す（権限は gist だけでOK）
        </li>
        <li>表示された ghp_ で始まる文字列をコピーして、下に貼り付ける</li>
        <li>他の端末でも同じトークンを貼れば、自動で同じデータにつながります</li>
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
          {busy ? '接続中…' : '同期をオン'}
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

  function snapshot() {
    const keys = [
      'version',
      'bodyParts',
      'exercises',
      'sessions',
      'deletedSessionIds',
      'endedWorkoutIds',
      'routines',
      'settings',
      'masterUpdatedAt',
      'activeWorkout',
    ]
    return Object.fromEntries(keys.map((k) => [k, data[k]]))
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
      setMessage('コピーしました。別のブラウザで「貼り付けて読み込む」をしてください。')
    } catch {
      setMessage('コピーできませんでした。ファイルで書き出してください。')
    }
  }

  function importText(text) {
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed.sessions)) throw new Error()
      data.importData(parsed)
      setMessage(`読み込みました（${parsed.sessions.length}件の記録。今ある記録はそのまま残ります）`)
    } catch {
      setMessage('読み込めませんでした。このアプリのバックアップか確認してください。')
    }
  }

  async function handlePaste() {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      text = prompt('バックアップの文字列を貼り付けてください') ?? ''
    }
    if (text) importText(text)
  }

  return (
    <section className="card">
      <h2>バックアップ</h2>
      <p className="muted">
        記録 {data.sessions.length}件。手動で別のブラウザへ移すときや、念のための保存に。
      </p>
      <div className="row">
        <button className="secondary" onClick={handleDownload}>
          ファイルに書き出す
        </button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          ファイルから読み込む
        </button>
      </div>
      <div className="row">
        <button className="secondary" onClick={handleCopy}>
          コピー
        </button>
        <button className="secondary" onClick={handlePaste}>
          貼り付けて読み込む
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

function MasterSection() {
  const {
    bodyParts,
    exercises,
    addBodyPart,
    deleteBodyPart,
    addExercise,
    toggleExerciseActive,
    deleteExercise,
  } = useData()

  const [newPartName, setNewPartName] = useState('')
  const [newPartGroup, setNewPartGroup] = useState('upper')

  const [exFilter, setExFilter] = useState(bodyParts[0]?.id ?? 'all')
  const [newExName, setNewExName] = useState('')
  const [newExEquipment, setNewExEquipment] = useState('')
  const [newExType, setNewExType] = useState('compound')

  function handleAddPart() {
    if (!newPartName.trim()) return
    addBodyPart(newPartName.trim(), newPartGroup)
    setNewPartName('')
  }

  function handleAddExercise() {
    const part = exFilter === 'all' ? bodyParts[0]?.id : exFilter
    if (!newExName.trim() || !part) return
    addExercise({
      name: newExName.trim(),
      bodyPartId: part,
      equipment: newExEquipment.trim() || 'その他',
      type: newExType,
    })
    setNewExName('')
    setNewExEquipment('')
  }

  const visibleExercises = exercises.filter(
    (e) => exFilter === 'all' || e.bodyPartId === exFilter
  )

  return (
    <>
      <section className="card">
        <h2>種目</h2>
        <p className="muted">チェックを外した種目は、種目選びに出てこなくなります。</p>
        <div className="chips">
          {bodyParts.map((p) => (
            <button
              key={p.id}
              className={`chip ${exFilter === p.id ? 'on' : ''}`}
              onClick={() => setExFilter(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <ul className="plain-list">
          {visibleExercises.map((e) => (
            <li key={e.id} className="row-between">
              <label className="option">
                <input
                  type="checkbox"
                  checked={e.active}
                  onChange={() => toggleExerciseActive(e.id)}
                />
                {e.name}
                <span className="tag">{e.equipment}</span>
              </label>
              <button
                className="ghost danger"
                onClick={() => confirm(`「${e.name}」を削除しますか？`) && deleteExercise(e.id)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>

        <h3>この部位に種目を追加</h3>
        <div className="row">
          <input
            className="grow"
            placeholder="種目名"
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
          />
        </div>
        <div className="row">
          <input
            className="grow"
            placeholder="使用設備（例：ダンベル）"
            value={newExEquipment}
            onChange={(e) => setNewExEquipment(e.target.value)}
          />
          <select value={newExType} onChange={(e) => setNewExType(e.target.value)}>
            <option value="compound">コンパウンド</option>
            <option value="isolation">アイソレーション</option>
          </select>
          <button className="secondary" onClick={handleAddExercise}>
            追加
          </button>
        </div>
      </section>

      <section className="card">
        <h2>部位</h2>
        <ul className="plain-list">
          {bodyParts.map((p) => (
            <li key={p.id} className="row-between">
              <span>
                {p.name}
                <span className="tag">{GROUP_LABEL[p.group] ?? p.group}</span>
              </span>
              <button
                className="ghost danger"
                onClick={() =>
                  confirm(`「${p.name}」とその種目を削除しますか？（過去の記録は残ります）`) &&
                  deleteBodyPart(p.id)
                }
              >
                削除
              </button>
            </li>
          ))}
        </ul>
        <div className="row">
          <input
            className="grow"
            placeholder="新しい部位名"
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
          />
          <select value={newPartGroup} onChange={(e) => setNewPartGroup(e.target.value)}>
            <option value="upper">上半身</option>
            <option value="lower">下半身</option>
            <option value="core">体幹</option>
          </select>
          <button className="secondary" onClick={handleAddPart}>
            追加
          </button>
        </div>
      </section>
    </>
  )
}

export default function Settings() {
  const { settings, updateSettings } = useData()

  return (
    <div className="screen">
      <h1>設定</h1>

      <SyncSection />

      <section className="card">
        <h2>休憩タイマー</h2>
        <p className="muted">セットの ✓ を押すと自動で始まります。</p>
        <div className="chips">
          {[60, 90, 120, 150, 180, 240].map((sec) => (
            <button
              key={sec}
              className={`chip ${settings.restSeconds === sec ? 'on' : ''}`}
              onClick={() => updateSettings({ restSeconds: sec })}
            >
              {sec >= 60 && sec % 60 === 0 ? `${sec / 60}分` : `${Math.floor(sec / 60)}分${sec % 60}秒`}
            </button>
          ))}
        </div>
      </section>

      <BackupSection />
      <MasterSection />
    </div>
  )
}
