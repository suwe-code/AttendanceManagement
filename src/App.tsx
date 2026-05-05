import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Attendance from './Attendance'
import Records from './Records'

const T = {
  bg: '#0d0d0d', border: '#2a2a2a', divider: '#1f1f1f',
  text: '#ffffff', textMuted: '#4a4a4a',
  invertBg: '#ffffff', invertText: '#0a0a0a', surface: '#1a1a1a'
}

const caps: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500,
  letterSpacing: '-0.04em', textTransform: 'uppercase'
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [tab, setTab] = useState<'attendance' | 'records'>('attendance')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    supabase.auth.onAuthStateChange((_e, s) => setSession(s))
  }, [])

  if (!session) return <Login />

  return (
    <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'attendance' ? <Attendance /> : <Records />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
        <button
          onClick={() => setTab('attendance')}
          style={{
            padding: '13px 0',
            background: tab === 'attendance' ? T.surface : 'transparent',
            color: tab === 'attendance' ? T.text : T.textMuted,
            border: 'none',
            borderRight: `1px solid ${T.border}`,
            borderTop: tab === 'attendance' ? `1px solid ${T.text}` : `1px solid transparent`,
            ...caps,
            color: tab === 'attendance' ? T.text : T.textMuted,
            cursor: 'pointer'
          }}
        >
          CAMERA
        </button>
        <button
          onClick={() => setTab('records')}
          style={{
            padding: '13px 0',
            background: tab === 'records' ? T.surface : 'transparent',
            color: tab === 'records' ? T.text : T.textMuted,
            border: 'none',
            borderTop: tab === 'records' ? `1px solid ${T.text}` : `1px solid transparent`,
            ...caps,
            color: tab === 'records' ? T.text : T.textMuted,
            cursor: 'pointer'
          }}
        >
          RECORDS
        </button>
      </div>
    </div>
  )
}