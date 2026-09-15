import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Home({ onStart }) {
  const { bodyParts, sessions } = useData()

  const upperParts = bodyParts.filter((p) => p.group === 'upper')
  const lowerParts = bodyParts.filter((p) => p.group === 'lower')
  const coreParts = bodyParts.filter((p) => p.group === 'core')

  const [upperId, setUpperId] = useState(upperParts[0]?.id ?? '')
  const [doLower, setDoLower] = useState(false)
  const [lowerId, setLowerId] = useState(lowerParts[0]?.id ?? '')
  const [doCore, setDoCore] = useState(false)
  const [coreId, setCoreId] = useState(coreParts[0]?.id ?? '')

  const lastSession = useMemo(() => {
    if (sessions.length === 0) return null
    return [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  }, [sessions])

  function handleStart() {
    const ids = [upperId]
    if (doLower && lowerId) ids.push(lowerId)
    if (doCore && coreId) ids.push(coreId)
    onStart(ids.filter(Boolean))
  }

  return (
    <div className="screen">
      <h1>今日のトレーニング</h1>
      <p className="muted">{todayStr()}</p>

      {lastSession && (
        <p className="muted">
          前回：{lastSession.date}（
          {lastSession.bodyPartIds
            .map((id) => bodyParts.find((p) => p.id === id)?.name)
            .filter(Boolean)
            .join('＋')}
          ）
        </p>
      )}

      <section className="card">
        <h2>上半身（1部位）</h2>
        <div className="option-list">
          {upperParts.map((p) => (
            <label key={p.id} className="option">
              <input
                type="radio"
                name="upper"
                checked={upperId === p.id}
                onChange={() => setUpperId(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <label className="option">
          <input
            type="checkbox"
            checked={doLower}
            onChange={(e) => setDoLower(e.target.checked)}
          />
          <h2 style={{ display: 'inline', marginLeft: 8 }}>下半身もやる</h2>
        </label>
        {doLower && (
          <div className="option-list">
            {lowerParts.map((p) => (
              <label key={p.id} className="option">
                <input
                  type="radio"
                  name="lower"
                  checked={lowerId === p.id}
                  onChange={() => setLowerId(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <label className="option">
          <input
            type="checkbox"
            checked={doCore}
            onChange={(e) => setDoCore(e.target.checked)}
          />
          <h2 style={{ display: 'inline', marginLeft: 8 }}>腹筋もやる</h2>
        </label>
        {doCore && (
          <div className="option-list">
            {coreParts.map((p) => (
              <label key={p.id} className="option">
                <input
                  type="radio"
                  name="core"
                  checked={coreId === p.id}
                  onChange={() => setCoreId(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </section>

      <button className="primary" onClick={handleStart} disabled={!upperId}>
        種目を提案してもらう
      </button>
    </div>
  )
}
