import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { A } from './AdminTokens'
import Dashboard from './Dashboard'
import OperatorsPage from './OperatorsPage'
import OperationsPage from './OperationsPage'

type Page = 'dashboard' | 'operators' | 'operations'

export default function AdminApp() {
  const [page, setPage] = useState<Page>('dashboard')
  const [navOpen, setNavOpen] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuthorized(false) ; return }
      supabase.from('people').select('role').eq('auth_id', user.id).single()
        .then(({ data }) => {
          const role = data?.role ?? ''
          setAuthorized(role === 'admin' || role === 'super_admin')
        })
    })
  }, [])

  if (authorized === null) {
    return (
      <div style={{ width: '100%', height: '100vh', background: A.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: A.fontMono, fontSize: 11, letterSpacing: '0.08em', color: A.textMuted }}>AUTHENTICATING</p>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div style={{ width: '100%', height: '100vh', background: A.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontFamily: A.fontMono, fontSize: 13, letterSpacing: '0.08em', color: A.negative }}>ACCESS DENIED</p>
        <p style={{ fontFamily: A.fontMono, fontSize: 10, letterSpacing: '0.06em', color: A.text3 }}>ADMIN OR SUPER_ADMIN ROLE REQUIRED</p>
        <button
          onClick={() => { window.location.hash = '' ; window.location.reload() }}
          style={{ marginTop: 16, background: 'transparent', border: `1px solid ${A.border}`, color: A.text2, padding: '8px 20px', fontFamily: A.fontMono, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer' }}
        >
          BACK TO APP
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: A.bg, overflow: 'hidden', position: 'relative' }}>
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,13,0.96)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 260 }}>
            <p style={{ fontFamily: A.fontMono, fontSize: 9, letterSpacing: '0.12em', color: A.text3, marginBottom: 8 }}>NAVIGATION</p>
            {(['dashboard', 'operations', 'operators'] as Page[]).map(p => (
              <button
                key={p}
                onClick={() => { setPage(p) ; setNavOpen(false) }}
                style={{
                  background: page === p ? A.surface : 'transparent',
                  border: `1px solid ${page === p ? A.text : A.border}`,
                  color: page === p ? A.text : A.text2,
                  padding: '14px 24px',
                  fontFamily: A.fontMono, fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => { window.location.hash = '' ; window.location.reload() }}
              style={{
                background: 'transparent', border: `1px solid ${A.divider}`,
                color: A.text3, padding: '14px 24px', fontFamily: A.fontMono,
                fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
                cursor: 'pointer', textAlign: 'left', marginTop: 12,
              }}
            >
              ← OPERATOR APP
            </button>
          </div>
        </div>
      )}

      {page === 'dashboard' && <Dashboard onMenuClick={() => setNavOpen(true)} />}
      {page === 'operators' && <OperatorsPage onMenuClick={() => setNavOpen(true)} />}
      {page === 'operations' && <OperationsPage onMenuClick={() => setNavOpen(true)} />}
    </div>
  )
}