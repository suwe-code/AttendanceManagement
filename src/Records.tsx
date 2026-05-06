import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { T } from './tokens'

type AttendanceRecord = {
  id: string
  user_id: string
  image_url: string
  lat: number
  lng: number
  captured_at: string
  event_type: string
  note: string | null
  session_id: string | null
}

function calcTodayHours(records: AttendanceRecord[]): number {
  const today = new Date().toDateString()
  const todayRecords = records
    .filter(r => new Date(r.captured_at).toDateString() === today)
    .sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime())

  let total = 0
  let loginTime: number | null = null

  for (const r of todayRecords) {
    if (r.event_type === 'login') {
      loginTime = new Date(r.captured_at).getTime()
    } else if (r.event_type === 'logout' && loginTime !== null) {
      total += new Date(r.captured_at).getTime() - loginTime
      loginTime = null
    }
  }

  if (loginTime !== null) {
    total += Date.now() - loginTime
  }

  return total / (1000 * 60 * 60)
}

function HoursBar({ hours, max = 9 }: { hours: number, max?: number }) {
  const pct = Math.min(hours / max, 1)
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)

  return (
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.divider}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: 0 }}>TODAY'S HOURS</p>
        <p style={{ fontFamily: T.fontMono, fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em', color: T.text, margin: 0 }}>
          {h}h {m}m
        </p>
      </div>
      <div style={{ height: 2, background: T.border, width: '100%' }}>
        <div style={{ height: 2, background: T.text, width: `${pct * 100}%`, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.textMuted, margin: 0 }}>0h</p>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.textMuted, margin: 0 }}>{max}h</p>
      </div>
    </div>
  )
}

const eventColors: Record<string, string> = {
  login: T.positive,
  logout: T.text2,
  general: T.text3,
  alert: T.negative,
}

export default function Records({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    const tick = setInterval(() => setRecords(r => [...r]), 60000)
  
    supabase.auth.getUser().then(({ data: { user } }) => {
      const userId = user?.email?.replace('@app.com', '') ?? ''
      supabase.from('attendance_log').select('*')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .then(({ data }) => { setRecords(data ?? []) ; setLoading(false) })
    })
  
    return () => clearInterval(tick)
  }, [])

  const todayHours = calcTodayHours(records)

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
            onClick={onOpenProfile}
            style={{ background: 'transparent', border: `1px solid ${T.border}`, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 4 }}
          >
            <img src="/user-icon.webp" alt="Profile" style={{ width: 18, height: 18, opacity: 0.6, filter: 'invert(1)' }} />
          </button>
        </div>

        <HoursBar hours={todayHours} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.textMuted }}>LOADING</p>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.border }}>NO RECORDS</p>
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
                <p style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>{r.user_id}</p>
                <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: eventColors[r.event_type] ?? T.text2, margin: 0 }}>
                  {r.event_type}
                </p>
              </div>
              <a
                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: T.fontMono, fontSize: 11, color: T.text3, textDecoration: 'none', letterSpacing: '-0.02em' }}
              >
                {r.lat.toFixed(4)},{r.lng.toFixed(4)} ↗
              </a>
              <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textMuted, margin: 0, letterSpacing: '-0.02em' }}>
                {formatDate(r.captured_at)} · {formatTime(r.captured_at)}
              </p>
              {r.note && (
                <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.text2, margin: 0, letterSpacing: '-0.02em' }}>{r.note}</p>
              )}
            </div>
            <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', borderLeft: `1px solid ${T.divider}`, flexShrink: 0, minWidth: 48, justifyContent: 'flex-end' }}>
              <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textMuted, margin: 0 }}>#{records.length - i}</p>
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
          <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.textMuted, marginTop: 16 }}>TAP TO CLOSE</p>
        </div>
      )}
    </div>
  )
}