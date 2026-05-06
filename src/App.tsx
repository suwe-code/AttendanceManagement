import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Attendance from './Attendance'
import Records from './Records'
import { T, caps, mono, bodyText } from './tokens'

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
      <nav style={{ display: 'flex', gap: 24, padding: '0 16px', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0, justifyContent: 'center' }}>        {(['attendance', 'records'] as const).map(t => (
          <a
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 11, fontWeight: 500,
              letterSpacing: '-0.04em', textTransform: 'uppercase' as const,
              textDecoration: 'none', paddingTop: 12, paddingBottom: 11,
              cursor: 'pointer', display: 'block',
              color: tab === t ? T.text : T.textMuted,
              borderBottom: tab === t ? `1px solid ${T.text}` : '1px solid transparent',
            }}
          >
            {t === 'attendance' ? 'CAMERA' : 'RECORDS'}
          </a>
        ))}
      </nav>
    </div>
  )
}