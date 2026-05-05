import { useState } from 'react'
import { supabase } from './supabase'

const T = {
  bg: '#0d0d0d', surface: '#1a1a1a', elevated: '#222222',
  border: '#2a2a2a', divider: '#1f1f1f',
  text: '#ffffff', text2: '#9a9a9a', text3: '#6b6b6b', textMuted: '#4a4a4a',
  positive: '#22c55e', negative: '#ef4444',
  invertBg: '#ffffff', invertText: '#0a0a0a'
}

const caps: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500,
  letterSpacing: '-0.04em', textTransform: 'uppercase', color: T.text2
}

export default function Login() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true) ; setError('') ; setSuccess('')
    const { error } = await supabase.auth.signInWithPassword({
      email: `${userId.trim()}@app.com`, password
    })
    if (error) setError('Invalid user ID or password')
    setLoading(false)
  }

  async function handleSignUp() {
    if (!userId.trim() || !password) { setError('Enter user ID and password') ; return }
    setLoading(true) ; setError('') ; setSuccess('')
    const { error } = await supabase.auth.signUp({
      email: `${userId.trim()}@app.com`, password
    })
    if (error) setError(error.message)
    else setSuccess('Account created. Sign in to continue.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>

      <div style={{ width: '100%', maxWidth: 360 }}>

        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
          <img src="/logo.png" alt="SPEC-OPS" style={{ height: 28, display: 'block', marginBottom: 12 }} />
          <p style={{ ...caps, color: T.text3 }}>Attendance System · v1.0</p>
        </div>

        <div style={{ marginBottom: 1 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderBottom: 'none', padding: '0 16px' }}>
            <p style={{ ...caps, color: T.textMuted, paddingTop: 10, paddingBottom: 4 }}>USER ID</p>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', color: T.text, fontSize: 13, letterSpacing: '-0.02em', paddingBottom: 10, display: 'block' }}
            />
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '0 16px' }}>
            <p style={{ ...caps, color: T.textMuted, paddingTop: 10, paddingBottom: 4 }}>PASSWORD</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', background: 'transparent', border: 'none', color: T.text, fontSize: 13, letterSpacing: '-0.02em', paddingBottom: 10, display: 'block' }}
            />
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 11, letterSpacing: '-0.02em', color: T.negative, margin: '8px 0 0' }}>{error}</p>
        )}
        {success && (
          <p style={{ fontSize: 11, letterSpacing: '-0.02em', color: T.positive, margin: '8px 0 0' }}>{success}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginTop: 1 }}>
        <button
            onClick={handleLogin}
            disabled={loading}
            style={{ padding: '13px 16px', background: T.invertBg, color: T.invertText, border: 'none', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'WAIT' : 'SIGN IN'}
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            style={{ padding: '13px 16px', background: 'transparent', color: T.text3, border: `1px solid ${T.border}`, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            CREATE
          </button>
        </div>

      </div>
    </div>
  )
}