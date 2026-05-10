import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { T } from './tokens'
import Login from './Login'
import Attendance from './Attendance'
import Records from './Records'
import Profile from './Profile'
import AdminApp from './admin/AdminApp'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [tab, setTab] = useState<'attendance' | 'records'>('attendance')
  const [showProfile, setShowProfile] = useState(false)
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function onHash() { setRoute(window.location.hash) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (sessionLoading) return null

  if (!session) return <Login />

  const isAdminSite = import.meta.env.VITE_APP_MODE === 'office'

  if (isAdminSite) {
    return <AdminApp />
  }

  if (route === '#/admin' || route.startsWith('#/admin/')) {
    return <AdminApp />
  }

  return (
    <div style={{ width: '100%', height: '100dvh', background: T.bg, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, height: '100%', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'attendance'
            ? <Attendance />
            : <Records onOpenProfile={() => setShowProfile(true)} />}
        </div>
        <nav style={{ display: 'flex', gap: 24, padding: '0 16px', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0, justifyContent: 'center' }}>
          {(['attendance', 'records'] as const).map(t => (
            <a key={t} onClick={() => setTab(t)} style={{ fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, textDecoration: 'none', paddingTop: 12, paddingBottom: 11, cursor: 'pointer', display: 'block', color: tab === t ? T.text : T.textMuted, borderBottom: tab === t ? `1px solid ${T.text}` : '1px solid transparent', fontFamily: T.fontSans }}>
              {t === 'attendance' ? 'CAMERA' : 'RECORDS'}
            </a>
          ))}
        </nav>
      </div>
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  )
}