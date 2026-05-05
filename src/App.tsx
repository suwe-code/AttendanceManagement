import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Attendance from './Attendance'
import Records from './Records'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [tab, setTab] = useState<'attendance' | 'records'>('attendance')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    supabase.auth.onAuthStateChange((_e, s) => setSession(s))
  }, [])

  if (!session) return <Login />

  return (
    <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0d0d0d' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'attendance' ? <Attendance /> : <Records />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #2a2a2a', background: '#0d0d0d' }}>
        <button
          onClick={() => setTab('attendance')}
          style={{
            padding: '14px 0',
            background: tab === 'attendance' ? '#1a1a1a' : 'transparent',
            color: tab === 'attendance' ? '#ffffff' : '#4a4a4a',
            border: 'none', borderRight: '1px solid #2a2a2a',
            borderTop: tab === 'attendance' ? '1px solid #ffffff' : '1px solid transparent',
            fontSize: 11, fontFamily: 'Inter, sans-serif',
            fontWeight: 500, letterSpacing: '-0.04em',
            textTransform: 'uppercase' as const,
            cursor: 'pointer'
          }}
        >
          CAMERA
        </button>
        <button
          onClick={() => setTab('records')}
          style={{
            padding: '14px 0',
            background: tab === 'records' ? '#1a1a1a' : 'transparent',
            color: tab === 'records' ? '#ffffff' : '#4a4a4a',
            border: 'none',
            borderTop: tab === 'records' ? '1px solid #ffffff' : '1px solid transparent',
            fontSize: 11, fontFamily: 'Inter, sans-serif',
            fontWeight: 500, letterSpacing: '-0.04em',
            textTransform: 'uppercase' as const,
            cursor: 'pointer'
          }}
        >
          RECORDS
        </button>
      </div>
    </div>
  )
}