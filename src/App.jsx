import { useState } from 'react'
import './App.css'
import { DataProvider } from './state/DataContext'
import Home from './screens/Home'
import Proposal from './screens/Proposal'
import Record from './screens/Record'
import History from './screens/History'
import Master from './screens/Master'

function AppInner() {
  const [screen, setScreen] = useState('home')
  const [flow, setFlow] = useState({ bodyPartIds: [], exerciseIds: [] })

  function goHome() {
    setFlow({ bodyPartIds: [], exerciseIds: [] })
    setScreen('home')
  }

  return (
    <div className="app">
      <nav className="tabbar">
        <button className={screen === 'home' ? 'active' : ''} onClick={goHome}>
          ホーム
        </button>
        <button
          className={screen === 'history' ? 'active' : ''}
          onClick={() => setScreen('history')}
        >
          履歴
        </button>
        <button
          className={screen === 'master' ? 'active' : ''}
          onClick={() => setScreen('master')}
        >
          マスタ管理
        </button>
      </nav>

      <main>
        {screen === 'home' && (
          <Home
            onStart={(bodyPartIds) => {
              setFlow((f) => ({ ...f, bodyPartIds }))
              setScreen('proposal')
            }}
          />
        )}

        {screen === 'proposal' && (
          <Proposal
            bodyPartIds={flow.bodyPartIds}
            onBack={goHome}
            onConfirm={(exerciseIds) => {
              setFlow((f) => ({ ...f, exerciseIds }))
              setScreen('record')
            }}
          />
        )}

        {screen === 'record' && (
          <Record
            bodyPartIds={flow.bodyPartIds}
            exerciseIds={flow.exerciseIds}
            onBack={() => setScreen('proposal')}
            onDone={goHome}
          />
        )}

        {screen === 'history' && <History />}
        {screen === 'master' && <Master />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppInner />
    </DataProvider>
  )
}
