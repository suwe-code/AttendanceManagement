import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { T } from './tokens'

const LANGUAGES = ['English','Hindi','Tamil','Telugu','Kannada','Malayalam','Marathi','Bengali','Gujarati','Punjabi']

type Person = {
  pan: string , name: string , email: string
  wa_num: string | null , discord: string | null , dob: string | null
  benef_name: string | null , acc_num: string | null , ifsc: string | null
  upi_id: string | null , languages: string[] , permanent_address: string | null
  residing_city: string | null , role: string , intro_video_url: string | null
}

type LogRecord = {
  id: string , captured_at: string , event_type: string
  lat: number , lng: number , note: string | null , image_url: string
}

type View = 'menu' | 'edit' | 'logs'
type LogRange = 'week' | 'month'

const inputStyle = (hasError = false): React.CSSProperties => ({
  width: '100%', background: 'transparent',
  border: `1px solid ${hasError ? T.negative : T.border}`,
  color: T.text, padding: '8px 10px', fontSize: 13,
  fontFamily: T.fontSans, letterSpacing: '-0.02em',
  outline: 'none', boxSizing: 'border-box' as const
})

const lbl = (): React.CSSProperties => ({
  fontFamily: T.fontSans, fontSize: 10, fontWeight: 500,
  letterSpacing: '-0.04em', textTransform: 'uppercase' as const,
  color: T.text2, margin: '0 0 4px', display: 'block'
})

const eventColors: Record<string, string> = {
  login: T.positive , logout: '#9a9a9a' ,
  general: '#6b6b6b' , alert: T.negative
}

export default function Profile({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('menu')
  const [person, setPerson] = useState<Person | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('people').select('*').eq('auth_id', user.id).single()
        .then(({ data }) => setPerson(data))
    })
  }, [])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderBottom: 'none', width: '100%', maxWidth: 480, margin: '0 auto', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {view !== 'menu' ? (
            <button onClick={() => setView('menu')} style={{ background: 'transparent', border: 'none', color: T.text3, fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer', padding: 0 }}>← Back</button>
          ) : (
            <div>
              <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 2px' }}>{person?.role?.toUpperCase() ?? 'OPERATOR'}</p>
              <p style={{ fontFamily: T.fontMono, fontSize: 13, color: T.text, margin: 0, letterSpacing: '-0.02em' }}>{person?.name ?? '—'}</p>
            </div>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {view === 'menu' && <Menu person={person} onEdit={() => setView('edit')} onLogs={() => setView('logs')} />}
          {view === 'edit' && person && <EditProfile person={person} onSaved={p => { setPerson(p) ; setView('menu') }} />}
          {view === 'logs' && <Logs />}
        </div>

      </div>
    </div>
  )
}

function Menu({ person, onEdit, onLogs }: { person: Person | null, onEdit: () => void, onLogs: () => void }) {
  const items = [
    { label: 'Update my data', sub: 'Edit optional profile fields', action: onEdit },
    { label: 'View my logs', sub: 'Weekly or monthly event history', action: onLogs },
  ]

  return (
    <div>
      {items.map((item, i) => (
        <button key={i} onClick={item.action} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${T.divider}`, cursor: 'pointer', textAlign: 'left' as const }}>
          <div>
            <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.text, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{item.label}</p>
            <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.text3, margin: 0, letterSpacing: '-0.02em' }}>{item.sub}</p>
          </div>
          <span style={{ color: T.text3, fontSize: 13 }}>→</span>
        </button>
      ))}
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${T.divider}`, color: T.negative, fontFamily: T.fontSans, fontSize: 13, letterSpacing: '-0.02em', cursor: 'pointer', textAlign: 'left' as const }}
      >
        Logout
      </button>
      {person && (
        <div style={{ padding: '10px 16px' }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.textMuted, margin: 0, letterSpacing: '-0.02em' }}>PAN · {person.pan}</p>
        </div>
      )}
    </div>
  )
}

function EditProfile({ person, onSaved }: { person: Person, onSaved: (p: Person) => void }) {
  const [introVideo, setIntroVideo] = useState<File | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [waNum, setWaNum] = useState(person.wa_num ?? '')
  const [discord, setDiscord] = useState(person.discord ?? '')
  const [dob, setDob] = useState(person.dob ?? '')
  const [benefName, setBenefName] = useState(person.benef_name ?? '')
  const [accNum, setAccNum] = useState(person.acc_num ?? '')
  const [ifsc, setIfsc] = useState(person.ifsc ?? '')
  const [upiId, setUpiId] = useState(person.upi_id ?? '')
  const [languages, setLanguages] = useState<string[]>(person.languages ?? [])
  const [address, setAddress] = useState(person.permanent_address ?? '')
  const [city, setCity] = useState(person.residing_city ?? '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function toggleLang(lang: string) {
    setLanguages(l => l.includes(lang) ? l.filter(x => x !== lang) : [...l, lang])
  }

  async function handleSave() {
    setLoading(true)
    const updates = {
      wa_num: waNum || null , discord: discord || null ,
      dob: dob || null , benef_name: benefName || null ,
      acc_num: accNum || null , ifsc: ifsc || null ,
      upi_id: upiId || null , languages ,
      permanent_address: address || null , residing_city: city || null ,
      intro_video_url : null,
      updated_at: new Date().toISOString()
    }
    let _intro_video_url: string | null = person.intro_video_url ?? null

    if (introVideo) {
      if (introVideo.size > 50 * 1024 * 1024) {
        alert('Video is too large . please record a shorter clip ( under 50MB )')
        setLoading(false) ; return
      }
      setVideoUploading(true)
      const ext = introVideo.name.split('.').pop()
      const fileName = `${person.pan}_${Date.now()}.${ext}`
      const { error: vidError } = await supabase.storage
        .from('intro-videos').upload(fileName, introVideo, { contentType: introVideo.type })
      if (!vidError) {
        const { data: vidUrl } = supabase.storage.from('intro-videos').getPublicUrl(fileName)
        _intro_video_url = vidUrl.publicUrl
      }
      setVideoUploading(false)
    }

    await supabase.from('people').update(updates).eq('pan', person.pan)
    setLoading(false) ; setSuccess(true)
    setTimeout(() => onSaved({ ...person, ...updates }), 1000)
  }

  return (
    <div style={{ padding: '16px 16px 48px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[
        { label: 'WhatsApp Number', val: waNum, set: setWaNum },
        { label: 'Discord Handle', val: discord, set: setDiscord },
        { label: 'Beneficiary Name', val: benefName, set: setBenefName },
        { label: 'Account Number', val: accNum, set: setAccNum },
        { label: 'IFSC Code', val: ifsc, set: setIfsc },
        { label: 'UPI ID', val: upiId, set: setUpiId },
        { label: 'Residing City', val: city, set: setCity },
      ].map(f => (
        <div key={f.label}>
          <label style={lbl()}>{f.label}</label>
          <input value={f.val} onChange={e => f.set(e.target.value)} style={inputStyle()} />
        </div>
      ))}

      <div>
        <label style={lbl()}>Date of Birth</label>
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ ...inputStyle(), colorScheme: 'dark' }} />
      </div>

      <div>
        <label style={lbl()}>Languages Known</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {LANGUAGES.map(lang => (
            <button key={lang} onClick={() => toggleLang(lang)} style={{ padding: '4px 10px', background: languages.includes(lang) ? T.invertBg : 'transparent', color: languages.includes(lang) ? T.invertText : T.text2, border: `1px solid ${languages.includes(lang) ? T.invertBg : T.border}`, fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', cursor: 'pointer' }}>
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div>
      <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 4px' }}>Intro Video</p>
        {person.intro_video_url && (
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.positive, margin: '0 0 8px' }}>
            ✓ Video uploaded · <a href={person.intro_video_url} target="_blank" rel="noopener noreferrer" style={{ color: T.text3 }}>view ↗</a>
          </p>
        )}
        <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.text3, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {person.intro_video_url ? 'Upload new to replace' : 'Short intro clip , max 50MB'}
        </p>
        <input
          type="file"
          accept="video/*"
          onChange={e => setIntroVideo(e.target.files?.[0] ?? null)}
          style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.text, padding: '8px 10px', fontSize: 12, fontFamily: T.fontSans, letterSpacing: '-0.02em', cursor: 'pointer', boxSizing: 'border-box' as const }}
        />
        {introVideo && (
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: introVideo.size > 50 * 1024 * 1024 ? T.negative : T.positive, margin: '4px 0 0' }}>
            {introVideo.name} · {(introVideo.size / (1024 * 1024)).toFixed(1)}MB
            {introVideo.size > 50 * 1024 * 1024 ? ' · TOO LARGE' : ' · OK'}
          </p>
        )}
      </div>

      <div>
        <label style={lbl()}>Permanent Address</label>
        <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'none' as const }} />
      </div>

      <button onClick={handleSave} disabled={loading || videoUploading} style={{ width: '100%', padding: '12px', background: success ? T.positive : (loading || videoUploading) ? T.surface : T.invertBg, color: success ? T.invertText : (loading || videoUploading) ? T.textMuted : T.invertText, border: 'none', fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: (loading || videoUploading) ? 'not-allowed' : 'pointer' }}>
        {success ? 'Saved' : videoUploading ? 'Uploading Video' : loading ? 'Saving' : 'Save Changes'}
      </button>
    </div>
  )
}

function Logs() {
  const [range, setRange] = useState<LogRange>('week')
  const [logs, setLogs] = useState<LogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    const days = range === 'week' ? 7 : 30
    const from = new Date()
    from.setDate(from.getDate() - days)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('people').select('pan').eq('auth_id', user.id).single()
        .then(({ data: person }) => {
          if (!person) return
          supabase.from('attendance_log').select('*')
            .eq('user_id', person.pan)
            .gte('captured_at', from.toISOString())
            .order('captured_at', { ascending: false })
            .then(({ data }) => { setLogs(data ?? []) ; setLoading(false) })
        })
    })
  }, [range])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.divider}`, display: 'flex', gap: 6 }}>
        {(['week', 'month'] as LogRange[]).map(r => (
          <button key={r} onClick={() => { setRange(r) ; setLoading(true) }} style={{ padding: '4px 10px', background: range === r ? T.invertBg : 'transparent', color: range === r ? T.invertText : T.text2, border: `1px solid ${range === r ? T.invertBg : T.border}`, fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
            {r === 'week' ? '7 Days' : '30 Days'}
          </button>
        ))}
        <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textMuted, marginLeft: 'auto', alignSelf: 'center' }}>{loading ? '—' : logs.length} events</span>
      </div>

      {loading && <div style={{ padding: 32, textAlign: 'center' }}><p style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textMuted, textTransform: 'uppercase' as const, letterSpacing: '-0.04em' }}>Loading</p></div>}

      {!loading && logs.length === 0 && <div style={{ padding: 32, textAlign: 'center' }}><p style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textMuted, textTransform: 'uppercase' as const, letterSpacing: '-0.04em' }}>No events</p></div>}

      {logs.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${T.divider}` }}>
          <img src={r.image_url} onClick={() => setPreview(r.image_url)} style={{ width: 56, height: 56, objectFit: 'cover', cursor: 'pointer', flexShrink: 0, borderRight: `1px solid ${T.divider}` }} />
          <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: eventColors[r.event_type] ?? T.text2, margin: 0 }}>{r.event_type}</p>
              <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.textMuted, margin: 0 }}>{formatDate(r.captured_at)} · {formatTime(r.captured_at)}</p>
            </div>
            <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: T.fontMono, fontSize: 10, color: T.text3, textDecoration: 'none' }}>
              {r.lat.toFixed(4)},{r.lng.toFixed(4)} ↗
            </a>
            {r.note && <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.text2, margin: 0 }}>{r.note}</p>}
          </div>
        </div>
      ))}

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 16 }}>
          <img src={preview} style={{ maxWidth: '100%', maxHeight: '85dvh' }} />
          <p style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textMuted, marginTop: 16, textTransform: 'uppercase' as const, letterSpacing: '-0.04em' }}>TAP TO CLOSE</p>
        </div>
      )}
    </div>
  )
}
