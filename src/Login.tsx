import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true) ; setError('') ; setSuccess('')
    const email = `${userId.trim()}@app.com`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Invalid user ID or password')
    setLoading(false)
  }

  async function handleSignUp() {
    if (!userId.trim() || !password) { setError('Enter user ID and password first') ; return }
    setLoading(true) ; setError('') ; setSuccess('')
    const email = `${userId.trim()}@app.com`
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setSuccess('Account created . sign in to continue .')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 0,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter, sans-serif',
    letterSpacing: '-0.02em',
    outline: 'none',
    boxSizing: 'border-box' as const
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d', padding: 16 }}>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#4a4a4a', margin: '0 0 8px' }}>SPEC-OPS</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6b6b6b', letterSpacing: '-0.02em', margin: 0 }}>Attendance system</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <input
            placeholder="USER ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            style={{ ...inputStyle, borderBottom: 'none' }}
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={inputStyle}
          />
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: 11, letterSpacing: '-0.02em', margin: '8px 0 0', fontFamily: 'Inter, sans-serif' }}>{error}</p>
        )}
        {success && (
          <p style={{ color: '#22c55e', fontSize: 11, letterSpacing: '-0.02em', margin: '8px 0 0', fontFamily: 'Inter, sans-serif' }}>{success}</p>
        )}

        <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              flex: 1, padding: '12px 16px',
              background: '#ffffff', color: '#0d0d0d',
              border: '1px solid #ffffff', borderRadius: 0,
              fontSize: 11, fontFamily: 'Inter, sans-serif',
              fontWeight: 500, letterSpacing: '-0.04em',
              textTransform: 'uppercase' as const,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'WAIT' : 'SIGN IN'}
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            style={{
              flex: 1, padding: '12px 16px',
              background: 'transparent', color: '#6b6b6b',
              border: '1px solid #2a2a2a', borderRadius: 0,
              fontSize: 11, fontFamily: 'Inter, sans-serif',
              fontWeight: 500, letterSpacing: '-0.04em',
              textTransform: 'uppercase' as const,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            CREATE
          </button>
        </div>
      </div>
    </div>
  )
}