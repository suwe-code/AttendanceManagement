import { useEffect, useState } from 'react'
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
  letterSpacing: '-0.04em', textTransform: 'uppercase', margin: 0
}

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', margin: 0
}

type AttendanceRecord = {
  id: string, user_id: string, image_url: string,
  lat: number, lng: number, captured_at: string
}

export default function Records() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const userId = user?.email?.replace('@app.com', '') ?? ''
      supabase.from('attendance_log').select('*')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .then(({ data }) => { setRecords(data ?? []) ; setLoading(false) })
    })
  }, [])

  const todayCount = records.filter(r =>
    new Date(r.captured_at).toDateString() === new Date().toDateString()
  ).length

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div style={{ background: T.bg, height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>

      <div style={{ borderBottom: `1px solid ${T.border}` }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.divider}` }}>
          <img src="/logo.png" alt="SPEC-OPS" style={{ height: 20 }} />
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: 'transparent', border: `1px solid ${T.border}`, padding: '5px 12px', color: T.text3, ...caps, cursor: 'pointer' }}
          >
            LOGOUT
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `1px solid ${T.divider}` }}>
          <div style={{ padding: '12px 16px', borderRight: `1px solid ${T.divider}` }}>
            <p style={{ ...caps, color: T.textMuted, marginBottom: 6 }}>TOTAL</p>
            <p style={{ ...mono, fontSize: 20, fontWeight: 500, color: T.text }}>
              {loading ? '—' : records.length.toLocaleString()}
            </p>
          </div>
          <div style={{ padding: '12px 16px', borderRight: `1px solid ${T.divider}` }}>
            <p style={{ ...caps, color: T.textMuted, marginBottom: 6 }}>TODAY</p>
            <p style={{ ...mono, fontSize: 20, fontWeight: 500, color: T.text }}>
              {loading ? '—' : todayCount.toLocaleString()}
            </p>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <p style={{ ...caps, color: T.textMuted, marginBottom: 6 }}>STATUS</p>
            <p style={{ ...mono, fontSize: 13, fontWeight: 500, color: T.positive }}>LIVE</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ ...caps, color: T.textMuted }}>LOADING</p>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ ...caps, color: T.border }}>NO RECORDS</p>
          </div>
        )}

        {records.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${T.divider}` }}>
            <img
              src={r.image_url}
              onClick={() => setPreview(r.image_url)}
              style={{ width: 64, height: 64, objectFit: 'cover', cursor: 'pointer', flexShrink: 0, display: 'block', borderRight: `1px solid ${T.divider}` }}
            />
            <div style={{ flex: 1, padding: '9px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>{r.user_id}</p>
                <p style={{ ...caps, color: T.positive }}>LOGGED</p>
              </div>
              <a
                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...mono, fontSize: 11, color: T.text3, textDecoration: 'none' }}
              >
                {r.lat.toFixed(4)},{r.lng.toFixed(4)} ↗
              </a>
              <p style={{ ...mono, fontSize: 11, color: T.textMuted }}>
                {formatDate(r.captured_at)} · {formatTime(r.captured_at)}
              </p>
            </div>
            <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', borderLeft: `1px solid ${T.divider}`, flexShrink: 0, minWidth: 48, justifyContent: 'flex-end' }}>
              <p style={{ ...mono, fontSize: 11, color: T.textMuted }}>#{records.length - i}</p>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,13,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 99, padding: 16 }}
        >
          <img src={preview} style={{ maxWidth: '100%', maxHeight: '85dvh', display: 'block' }} />
          <p style={{ ...caps, color: T.textMuted, marginTop: 16 }}>TAP TO CLOSE</p>
        </div>
      )}
    </div>
  )
}