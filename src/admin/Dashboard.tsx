import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { A } from './AdminTokens'

type Evt = {
  id: string ; pan: string ; image_url: string
  lat: number ; lng: number ; captured_at: string
  event_type: string ; note: string | null
  session_id: string | null ; amount: number | null
}
type Person = { pan: string ; name: string ; role: string | null }

const EVENT_TYPES = ['all', 'clocking', 'handover', 'pay', 'incident']
const TIME_RANGES = [
  { key: '1h', label: 'LAST HOUR' },
  { key: 'today', label: 'TODAY' },
  { key: '7d', label: '7 DAYS' },
  { key: 'all', label: 'ALL TIME' },
]

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
const fmtCoord = (lat: number, lng: number) => `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'GOOD MORNING , SER !'
  if (h < 17) return 'GOOD AFTERNOON , SER !'
  return 'GOOD EVENING , SER !'
}

function evtLabel(e: Evt) {
  if (e.event_type === 'clocking') return e.amount === 1 ? 'LOGIN' : 'LOGOUT'
  if (e.event_type === 'incident') return e.amount === 1 ? 'CRITICAL INCIDENT' : 'INCIDENT'
  if (e.event_type === 'handover') return 'HANDOVER'
  if (e.event_type === 'pay') return 'PAY'
  return e.event_type?.toUpperCase() ?? 'EVENT'
}

function evtColor(e: Evt) {
  if (e.event_type === 'clocking') return e.amount === 1 ? A.positive : A.text2
  if (e.event_type === 'incident') return e.amount === 1 ? A.negative : '#f59e0b'
  if (e.event_type === 'pay') return A.positive
  if (e.event_type === 'handover') return '#f59e0b'
  return A.text2
}

function evtDetail(e: Evt) {
  if (e.event_type === 'clocking') return e.amount === 1 ? 'On Duty Login' : 'Off Duty Logout'
  if (e.event_type === 'handover') return `Handover · Count : ${e.amount ?? 0}`
  if (e.event_type === 'pay') return `Payment · ₹${(e.amount ?? 0).toLocaleString()}`
  if (e.event_type === 'incident') return e.amount === 1 ? 'Critical Incident' : 'General Incident'
  return e.event_type
}

export default function Dashboard({ onMenuClick }: { onMenuClick: () => void }) {
  const [clock, setClock] = useState(new Date())
  const [events, setEvents] = useState<Evt[]>([])
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [loading, setLoading] = useState(true)
  const [focusIdx, setFocusIdx] = useState(0)

  // filter state - keep separate committed values to avoid flicker
  const [filterType, setFilterType] = useState('all')
  const [filterTime, setFilterTime] = useState('today')
  const [filterOperator, setFilterOperator] = useState('all')

  const stackRef = useRef<HTMLDivElement>(null)
  const cooldown = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    supabase.from('people').select('pan, name, role').then(({ data }) => {
      const m: Record<string, Person> = {}
      ;(data ?? []).forEach(p => { m[p.pan] = p })
      setPeople(m)
    })
  }, [])

  // fetch whenever filters commit
  useEffect(() => {
    fetch()
  }, [filterType, filterTime, filterOperator])

  async function fetch() {
    setLoading(true)
    let q = supabase.from('attendance_log').select('*').order('captured_at', { ascending: false }).limit(500)
    const now = new Date()
    if (filterTime === 'today') {
      const s = new Date(now) ; s.setHours(0, 0, 0, 0)
      q = q.gte('captured_at', s.toISOString())
    } else if (filterTime === '1h') {
      q = q.gte('captured_at', new Date(now.getTime() - 3600000).toISOString())
    } else if (filterTime === '7d') {
      const s = new Date(now) ; s.setDate(s.getDate() - 7)
      q = q.gte('captured_at', s.toISOString())
    }
    if (filterType !== 'all') q = q.eq('event_type', filterType)
    if (filterOperator !== 'all') q = q.eq('pan', filterOperator)
    const { data } = await q
    setEvents(data ?? [])
    setFocusIdx(0)
    setLoading(false)
  }

  // poll
  useEffect(() => {
    const iv = setInterval(async () => {
      if (!events[0]) return
      const { data } = await supabase.from('attendance_log').select('*').gt('captured_at', events[0].captured_at).order('captured_at', { ascending: false }).limit(50)
      if (data?.length) setEvents(prev => [...data, ...prev].slice(0, 500))
    }, 6000)
    return () => clearInterval(iv)
  }, [events])

  // wheel nav
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      if (cooldown.current || Math.abs(e.deltaY) < 15) return
      cooldown.current = true
      setFocusIdx(i => e.deltaY > 0 ? Math.min(i + 1, events.length - 1) : Math.max(i - 1, 0))
      setTimeout(() => { cooldown.current = false }, 280)
    }
    const el = stackRef.current
    el?.addEventListener('wheel', onWheel, { passive: true })
    return () => el?.removeEventListener('wheel', onWheel)
  }, [events.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault() ; setFocusIdx(i => Math.min(i + 1, events.length - 1)) }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault() ; setFocusIdx(i => Math.max(i - 1, 0)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [events.length])

  const clockStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const operatorList = Object.values(people)

  return (
    <div style={{ width: '100%', height: '100vh', background: A.bg, color: A.text, fontFamily: A.fontSans, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 28px', flexShrink: 0 }}>
        <button onClick={onMenuClick} style={{ background: 'transparent', border: `1px solid ${A.border}`, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.text2, fontSize: 16, fontFamily: A.fontMono }}>≡</button>
        <div style={{ border: `1px solid ${A.border}`, padding: '8px 16px', textAlign: 'right' }}>
          <p style={{ fontFamily: A.fontMono, fontSize: 18, fontWeight: 500, letterSpacing: '0.08em', color: A.text, margin: 0 }}>{clockStr}</p>
          <p style={{ fontFamily: A.fontMono, fontSize: 10, letterSpacing: '0.06em', color: A.text3, margin: 0 }}>{dateStr}</p>
        </div>
      </div>

      {/* GREETING */}
      <div style={{ textAlign: 'center', flexShrink: 0, padding: '4px 0 16px' }}>
        <p style={{ fontFamily: A.fontMono, fontSize: 20, fontWeight: 500, letterSpacing: '0.12em', color: A.text, margin: '0 0 6px' }}>{getGreeting()}</p>
        <p style={{ fontFamily: A.fontMono, fontSize: 10, letterSpacing: '0.16em', color: A.text3, margin: 0 }}>OVERVIEW OF LIVE EVENTS</p>
      </div>

      {/* CARD CAROUSEL */}
      <div
        ref={stackRef}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        {loading ? (
          <p style={{ fontFamily: A.fontMono, fontSize: 11, letterSpacing: '0.08em', color: A.textMuted, margin: '0 auto' }}>LOADING EVENTS</p>
        ) : events.length === 0 ? (
          <p style={{ fontFamily: A.fontMono, fontSize: 11, letterSpacing: '0.08em', color: A.textMuted, margin: '0 auto' }}>NO EVENTS FOR THIS FILTER</p>
        ) : (
          <HoverCarousel events={events} people={people} focusIdx={focusIdx} setFocusIdx={setFocusIdx} />
        )}
      </div>

      {/* FILTER BAR */}
      <div style={{ flexShrink: 0, padding: '14px 28px', borderTop: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <FDD
          label="EVENT TYPE"
          value={filterType === 'all' ? 'ALL TYPES' : filterType.toUpperCase()}
          options={EVENT_TYPES.map(t => ({ key: t, label: t === 'all' ? 'ALL TYPES' : t.toUpperCase() }))}
          onChange={v => { setFilterType(v) }}
        />
        <FDD
          label="OPERATOR"
          value={filterOperator === 'all' ? 'ALL OPERATORS' : (people[filterOperator]?.name ?? filterOperator)}
          options={[{ key: 'all', label: 'ALL OPERATORS' }, ...operatorList.map(p => ({ key: p.pan, label: p.name }))]}
          onChange={v => { setFilterOperator(v) }}
        />
        <FDD
          label="TIME RANGE"
          value={TIME_RANGES.find(t => t.key === filterTime)?.label ?? 'TODAY'}
          options={TIME_RANGES.map(t => ({ key: t.key, label: t.label }))}
          onChange={v => { setFilterTime(v) }}
        />
        <button
          onClick={() => { setFilterType('all') ; setFilterTime('today') ; setFilterOperator('all') }}
          style={{ background: 'transparent', border: `1px solid ${A.border}`, color: A.text3, padding: '8px 16px', fontFamily: A.fontMono, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', cursor: 'pointer', height: 58 }}
        >
          ✕  CLEAR
        </button>
      </div>
    </div>
  )
}

function HoverCarousel({ events, people, focusIdx, setFocusIdx }: {
  events: Evt[]
  people: Record<string, Person>
  focusIdx: number
  setFocusIdx: (i: number | ((prev: number) => number)) => void
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const PAGE_SIZE = 60
  const pageStart = Math.floor(focusIdx / PAGE_SIZE) * PAGE_SIZE
  const visible = events.slice(pageStart, pageStart + PAGE_SIZE)
  const activeInPage = hoveredIdx !== null ? hoveredIdx : (focusIdx - pageStart)

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, padding: '0 32px' }}>

      {/* counter + page nav */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        {pageStart > 0 && (
          <button onClick={() => setFocusIdx(pageStart - 1)} style={{ background: 'transparent', border: `1px solid ${A.border}`, color: A.text3, padding: '2px 10px', fontFamily: A.fontMono, fontSize: 10, cursor: 'pointer' }}>← PREV</button>
        )}
        <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3, letterSpacing: '0.06em' }}>
          {focusIdx + 1} / {events.length}
        </span>
        {pageStart + PAGE_SIZE < events.length && (
          <button onClick={() => setFocusIdx(pageStart + PAGE_SIZE)} style={{ background: 'transparent', border: `1px solid ${A.border}`, color: A.text3, padding: '2px 10px', fontFamily: A.fontMono, fontSize: 10, cursor: 'pointer' }}>NEXT →</button>
        )}
      </div>

      {/* card row - 3D perspective, all same height, active left, rest fan right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', height: 300, gap: 3, perspective: '1000px', perspectiveOrigin: '0% 50%', paddingLeft: '7.5%', paddingRight: '7.5%', boxSizing: 'border-box' }}>
        {visible.map((evt, j) => {
          const globalIdx = pageStart + j
          const isActive = j === activeInPage
          const dist = j - activeInPage
          const person = people[evt.pan]
          const col = evtColor(evt)
          const lbl = evtLabel(evt)

          // cards to the right of active fan away
          const rotateY = isActive ? 0 : Math.min(dist * 5, 55)
          const op = isActive ? 1 : Math.max(0.2, 1 - Math.abs(dist) * 0.035)

          return (
            <div
              key={evt.id}
              onMouseEnter={() => setHoveredIdx(j)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => { setFocusIdx(globalIdx) ; setHoveredIdx(j) }}
              style={{
                flexBasis: isActive ? 300 : 18,
                flexGrow: 0,
                flexShrink: 0,
                height: 300,
                position: 'relative',
                background: A.surface,
                border: `1px solid ${isActive ? A.accent : A.divider}`,
                cursor: isActive ? 'default' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
                opacity: op,
                transform: `rotateY(${rotateY}deg)`,
                transformOrigin: 'left center',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: col, zIndex: 2 }} />

              {/* collapsed */}
              {!isActive && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, gap: 6 }}>
                  <span style={{ fontFamily: A.fontMono, fontSize: 8, color: col, letterSpacing: '0.06em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{lbl}</span>
                  {person?.name && <span style={{ fontFamily: A.fontSans, fontSize: 8, color: A.text3, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{person.name}</span>}
                </div>
              )}

              {/* expanded */}
              {isActive && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${A.divider}`, flexShrink: 0 }}>
                    <span style={{ fontFamily: A.fontMono, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: col }}>EVENT · {lbl}</span>
                    <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{fmtTime(evt.captured_at)}</span>
                  </div>
                  {evt.image_url && (
                    <div style={{ width: '100%', height: 120, flexShrink: 0, overflow: 'hidden', borderBottom: `1px solid ${A.divider}` }}>
                      <img src={evt.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}
                  <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${A.divider}`, flexShrink: 0 }}>
                    <div style={{ width: 24, height: 24, background: A.elevated, border: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3 }}>{(person?.name?.[0] ?? '?').toUpperCase()}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: A.fontSans, fontSize: 12, fontWeight: 500, color: A.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person?.name ?? evt.pan}</p>
                      <p style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3, margin: 0 }}>{person?.role ?? 'Operator'}</p>
                    </div>
                  </div>
                  <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                    <DR icon="◷" text={fmtTime(evt.captured_at)} />
                    <DR icon="▪" text={fmtDate(evt.captured_at)} />
                    <DR icon="◎" text={fmtCoord(evt.lat, evt.lng)} />
                    <DR icon="▤" text={evtDetail(evt)} />
                    {evt.note && <DR icon="✎" text={evt.note} />}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DR({ icon, text }: { icon: string, text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontFamily: A.fontMono, fontSize: 12, color: A.text3, flexShrink: 0, width: 14, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontFamily: A.fontMono, fontSize: 12, color: A.text2 }}>{text}</span>
    </div>
  )
}

function FDD({ label, value, options, onChange }: { label: string ; value: string ; options: { key: string, label: string }[] ; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: A.surface, border: `1px solid ${A.border}`, padding: '8px 16px', minWidth: 180, display: 'flex', flexDirection: 'column', gap: 3, cursor: 'pointer', textAlign: 'left', height: 58 }}
      >
        <span style={{ fontFamily: A.fontMono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: A.text3 }}>{label}</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontFamily: A.fontMono, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: A.text }}>{value}</span>
          <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3, marginLeft: 12 }}>∨</span>
        </div>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, background: A.elevated, border: `1px solid ${A.border}`, minWidth: 180, maxHeight: 240, overflowY: 'auto', zIndex: 51 }}>
            {options.map(o => (
              <button
                key={o.key}
                onClick={() => { onChange(o.key) ; setOpen(false) }}
                style={{ display: 'block', width: '100%', padding: '9px 16px', background: o.key === value ? A.surface : 'transparent', border: 'none', borderBottom: `1px solid ${A.divider}`, color: A.text2, fontFamily: A.fontMono, fontSize: 11, cursor: 'pointer', textAlign: 'left' }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}