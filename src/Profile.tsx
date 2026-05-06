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

type View = 'menu' | 'edit' | 'logs'
type LogRange = 'week' | 'month'

const inputStyle = (): React.CSSProperties => ({
  width: '100%', background: 'transparent',
  border: `1px solid ${T.border}`,
  color: T.text, padding: '8px 10px', fontSize: 13,
  fontFamily: T.fontSans, letterSpacing: '-0.02em',
  outline: 'none', boxSizing: 'border-box' as const
})

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
              <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 2px' }}>{person?.role?.toUpperCase() ?? ''}</p>
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
  const [waNum, setWaNum] = useState(person.wa_num ?? '')
  const [discord, setDiscord] = useState(person.discord ?? '')
  const [dob, setDob] = useState(person.dob ?? '')
  const [benefName, setBenefName] = useState(person.benef_name ?? '')
  const [accNum, setAccNum] = useState(person.acc_num ?? '')
  const [ifsc, setIfsc] = useState(person.ifsc ?? '')
  const [upiId, setUpiId] = useState(person.upi_id ?? '')
  const [introVideoUrl, setIntroVideoUrl] = useState(person.intro_video_url ?? '')
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
      intro_video_url: introVideoUrl || null ,
      permanent_address: address || null , residing_city: city || null ,
      updated_at: new Date().toISOString()
    }
    await supabase.from('people').update(updates).eq('pan', person.pan)
    setLoading(false) ; setSuccess(true)
    setTimeout(() => onSaved({ ...person, ...updates }), 1000)
  }

  const lbl = (text: string) => (
    <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 4px' }}>{text}</p>
  )

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
          {lbl(f.label)}
          <input value={f.val} onChange={e => f.set(e.target.value)} style={inputStyle()} />
        </div>
      ))}

      <div>
        {lbl('Date of Birth')}
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ ...inputStyle(), colorScheme: 'dark' }} />
      </div>

      <div>
        {lbl('Languages Known')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {LANGUAGES.map(lang => (
            <button key={lang} onClick={() => toggleLang(lang)} style={{ padding: '4px 10px', background: languages.includes(lang) ? T.invertBg : 'transparent', color: languages.includes(lang) ? T.invertText : T.text2, border: `1px solid ${languages.includes(lang) ? T.invertBg : T.border}`, fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', cursor: 'pointer' }}>
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div>
        {lbl('Intro Video URL')}
        <input value={introVideoUrl} onChange={e => setIntroVideoUrl(e.target.value)} placeholder="https://..." style={inputStyle()} />
        {person.intro_video_url && !introVideoUrl && (
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.text3, margin: '4px 0 0' }}>
            Current: <a href={person.intro_video_url} target="_blank" rel="noopener noreferrer" style={{ color: T.text3 }}>view ↗</a>
          </p>
        )}
      </div>

      <div>
        {lbl('Permanent Address')}
        <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'none' as const }} />
      </div>

      <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '12px', background: success ? T.positive : loading ? T.surface : T.invertBg, color: success ? T.invertText : loading ? T.textMuted : T.invertText, border: 'none', fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {success ? 'Saved' : loading ? 'Saving' : 'Save Changes'}
      </button>
    </div>
  )
}

function Logs() {
  const [range, setRange] = useState<LogRange>('week')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{ date: string, hours: number, sessions: number }[]>([])

  useEffect(() => {
    const days = range === 'week' ? 7 : 30
    const from = new Date()
    from.setDate(from.getDate() - days)
    setLoading(true)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('people').select('pan').eq('auth_id', user.id).single()
        .then(({ data: person }) => {
          if (!person) return
          supabase.from('attendance_log')
            .select('event_type, captured_at, session_id')
            .eq('pan', person.pan)
            .gte('captured_at', from.toISOString())
            .order('captured_at', { ascending: true })
            .then(({ data }) => {
              if (!data) { setLoading(false) ; return }

              const byDate: Record<string, typeof data> = {}
              for (const r of data) {
                const date = new Date(r.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                if (!byDate[date]) byDate[date] = []
                byDate[date].push(r)
              }

              const result = Object.entries(byDate).map(([date, rows]) => {
                let total = 0
                let loginTime: number | null = null
                let sessions = 0
                for (const r of rows) {
                  if (r.event_type === 'login') loginTime = new Date(r.captured_at).getTime()
                  else if (r.event_type === 'logout' && loginTime !== null) {
                    total += new Date(r.captured_at).getTime() - loginTime
                    loginTime = null
                    sessions++
                  }
                }
                return { date, hours: total / (1000 * 60 * 60), sessions }
              }).reverse()

              setSummary(result)
              setLoading(false)
            })
        })
    })
  }, [range])

  return (
    <div>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.divider}`, display: 'flex', gap: 6 }}>
        {(['week', 'month'] as LogRange[]).map(r => (
          <button key={r} onClick={() => setRange(r)} style={{ padding: '4px 10px', background: range === r ? T.invertBg : 'transparent', color: range === r ? T.invertText : T.text2, border: `1px solid ${range === r ? T.invertBg : T.border}`, fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
            {r === 'week' ? '7 Days' : '30 Days'}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textMuted, textTransform: 'uppercase' as const, letterSpacing: '-0.04em' }}>Loading</p>
        </div>
      )}

      {!loading && summary.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textMuted, textTransform: 'uppercase' as const, letterSpacing: '-0.04em' }}>No data</p>
        </div>
      )}

      {summary.map(s => {
        const h = Math.floor(s.hours)
        const m = Math.round((s.hours - h) * 60)
        const pct = Math.min(s.hours / 9, 1)
        return (
          <div key={s.date} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.divider}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.text2, margin: 0, letterSpacing: '-0.02em' }}>{s.date}</p>
              <p style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 500, color: s.hours > 0 ? T.text : T.textMuted, margin: 0, letterSpacing: '-0.02em' }}>
                {s.hours > 0 ? `${h}h ${m}m` : '—'}
              </p>
            </div>
            <div style={{ height: 1, background: T.border, width: '100%' }}>
              <div style={{ height: 1, background: s.hours > 0 ? T.text : T.border, width: `${pct * 100}%` }} />
            </div>
            {s.sessions > 0 && (
              <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.textMuted, margin: '4px 0 0' }}>
                {s.sessions} session{s.sessions > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}