import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type AttendanceRecord = {
  id: string
  user_id: string
  image_url: string
  lat: number
  lng: number
  captured_at: string
}

export default function Records() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('attendance_log').select('*')
      .order('captured_at', { ascending: false })
      .then(({ data }) => { setRecords(data ?? []) ; setLoading(false) })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const capLabel: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '-0.04em',
    textTransform: 'uppercase',
    color: '#4a4a4a',
    margin: 0
  }

  return (
    <div style={{ background: '#0d0d0d', height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>

      <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ ...capLabel, marginBottom: 4 }}>ATTENDANCE LOG</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
            {loading ? '—' : records.length}
          </p>
        </div>
        <button onClick={handleLogout} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #2a2a2a', color: '#6b6b6b', fontSize: 11, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0 }}>
          LOGOUT
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ padding: 16, borderRight: '1px solid #1f1f1f' }}>
          <p style={{ ...capLabel, marginBottom: 4 }}>TODAY</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 500, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            {loading ? '—' : records.filter(r => new Date(r.captured_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ ...capLabel, marginBottom: 4 }}>STATUS</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500, color: '#22c55e', margin: 0, letterSpacing: '-0.02em' }}>LIVE</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!loading && records.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ ...capLabel, color: '#2a2a2a' }}>NO RECORDS</p>
          </div>
        )}

        {records.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #1f1f1f' }}>
            <img
              src={r.image_url}
              onClick={() => setPreview(r.image_url)}
              style={{ width: 64, height: 64, objectFit: 'cover', cursor: 'pointer', flexShrink: 0, display: 'block' }}
            />
            <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>{r.user_id}</p>
                <p style={{ ...capLabel, color: '#22c55e' }}>LOGGED</p>
              </div>
              <a
                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6b6b6b', textDecoration: 'none', letterSpacing: '-0.02em' }}
              >
                {r.lat.toFixed(4)},{r.lng.toFixed(4)}
              </a>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4a4a', margin: 0, letterSpacing: '-0.02em' }}>
                {formatDate(r.captured_at)} · {formatTime(r.captured_at)}
              </p>
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', borderLeft: '1px solid #1f1f1f' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4a4a', margin: 0 }}>#{records.length - i}</p>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,13,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 99, padding: 16 }}>
          <img src={preview} style={{ maxWidth: '100%', maxHeight: '85dvh', display: 'block' }} />
          <p style={{ ...capLabel, marginTop: 16, color: '#2a2a2a' }}>TAP TO CLOSE</p>
        </div>
      )}
    </div>
  )
}