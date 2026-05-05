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
    else setSuccess('Account created . you can now sign in .')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', padding: 24 }}>
      <h1 style={{ color: '#fff', fontSize: 22, marginBottom: 8 }}>Attendance</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 32 }}>Sign in to continue</p>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff', fontSize: 15 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff', fontSize: 15 }}
        />
        {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
        {success && <p style={{ color: '#4ade80', fontSize: 13, margin: 0 }}>{success}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ padding: '13px 16px', borderRadius: 8, background: '#fff', color: '#000', border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Please wait...' : 'Sign in'}
        </button>
        <button
          onClick={handleSignUp}
          disabled={loading}
          style={{ padding: '13px 16px', borderRadius: 8, background: 'transparent', color: '#aaa', border: '1px solid #333', fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          Create account
        </button>
      </div>
    </div>
  )
}