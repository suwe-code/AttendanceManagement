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
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <div style={{ background: '#080808', height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>

      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #161616', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 18, margin: 0, fontWeight: 700 }}>Attendance Log</h2>
          <p style={{ color: '#444', fontSize: 11, margin: '2px 0 0' }}>
            {loading ? 'Loading...' : `${records.length} record${records.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={handleLogout} style={{
          padding: '7px 16px', borderRadius: 20,
          background: 'transparent', border: '1px solid #222',
          color: '#555', fontSize: 12, cursor: 'pointer'
        }}>
          Logout
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {!loading && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: '#333', fontSize: 14 }}>No records yet</p>
          </div>
        )}

        {records.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid #111',
            width: '100%', boxSizing: 'border-box'
          }}>
            <img
              src={r.image_url}
              onClick={() => setPreview(r.image_url)}
              style={{
                width: 52, height: 52, borderRadius: 10,
                objectFit: 'cover', cursor: 'pointer', flexShrink: 0,
                border: '1px solid #1e1e1e'
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{r.user_id}</p>
                <span style={{ color: '#4ade80', fontSize: 10, fontWeight: 500 }}>● Logged</span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', fontSize: 11, fontFamily: 'monospace', textDecoration: 'none' }}
              >
                {r.lat.toFixed(4)} , {r.lng.toFixed(4)} ↗
              </a>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: '#383838', fontSize: 11 }}>{formatDate(r.captured_at)}</span>
                <span style={{ color: '#383838', fontSize: 11 }}>{formatTime(r.captured_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 99, padding: 20
          }}
        >
          <img src={preview} style={{ maxWidth: '100%', maxHeight: '85dvh', borderRadius: 12 }} />
          <p style={{ color: '#333', fontSize: 12, marginTop: 16 }}>tap to close</p>
        </div>
      )}
    </div>
  )
}