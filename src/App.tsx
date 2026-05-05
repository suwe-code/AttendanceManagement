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
    <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'attendance' ? <Attendance /> : <Records />}
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #333' }}>
        <button onClick={() => setTab('attendance')} style={{ flex: 1, padding: 16, background: tab === 'attendance' ? '#1a1a1a' : 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          Camera
        </button>
        <button onClick={() => setTab('records')} style={{ flex: 1, padding: 16, background: tab === 'records' ? '#1a1a1a' : 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          Records
        </button>
      </div>
    </div>
  )
}