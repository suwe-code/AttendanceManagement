import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { A } from './AdminTokens'

type Person = { pan: string ; name: string ; role: string | null ; email: string ; residing_city: string | null ; wa_num: string | null }
type LogEntry = { id: string ; event_type: string ; captured_at: string ; amount: number | null ; note: string | null ; lat: number ; lng: number ; image_url: string ; settled_at?: string | null }
type OverallRow = { date: string ; hours: number ; sessions: number ; payTotal: number ; handoverTotal: number ; incidents: number ; criticalIncidents: number }

export default function OperatorsPage({ onMenuClick }: { onMenuClick: () => void }) {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Person | null>(null)
  const [tab, setTab] = useState<'journal' | 'ledger' | 'overall'>('journal')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d')

  useEffect(() => {
    supabase.from('people').select('pan, name, role, email, residing_city, wa_num').order('name').then(({ data }) => {
      setPeople(data ?? []) ; setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    loadData(selected.pan)
  }, [selected, range])

  async function loadData(pan: string) {
    setLoadingDetail(true)
    let q = supabase.from('attendance_log').select('*').eq('pan', pan).order('captured_at', { ascending: false }).limit(1000)
    const now = new Date()
    if (range === '7d') { const s = new Date(now) ; s.setDate(s.getDate() - 7) ; q = q.gte('captured_at', s.toISOString()) }
    else if (range === '30d') { const s = new Date(now) ; s.setDate(s.getDate() - 30) ; q = q.gte('captured_at', s.toISOString()) }
    const { data } = await q
    setLogs(data ?? [])
    setLoadingDetail(false)
  }

  async function settle(id: string) {
    const now = new Date().toISOString()
    await supabase.from('attendance_log').update({ settled_at: now }).eq('id', id)
    setLogs(prev => prev.map(l => l.id === id ? { ...l, settled_at: now } : l))
  }

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  function evtColor(e: LogEntry) {
    if (e.event_type === 'clocking') return e.amount === 1 ? A.positive : A.text2
    if (e.event_type === 'incident') return e.amount === 1 ? A.negative : '#f59e0b'
    return A.text2
  }

  function evtLabel(e: LogEntry) {
    if (e.event_type === 'clocking') return e.amount === 1 ? 'LOGIN' : 'LOGOUT'
    if (e.event_type === 'incident') return e.amount === 1 ? 'CRITICAL INCIDENT' : 'INCIDENT'
    return e.event_type?.toUpperCase()
  }

  // derived views
  const journalEntries = logs.filter(l => l.event_type === 'clocking' || l.event_type === 'incident')
  const ledgerEntries = logs.filter(l => l.event_type === 'pay')

  const byDate: Record<string, LogEntry[]> = {}
  for (const r of [...logs].reverse()) {
    const date = new Date(r.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(r)
  }

  const overall: OverallRow[] = Object.entries(byDate).map(([date, rows]) => {
    let totalMs = 0 ; let loginTime: number | null = null ; let sessions = 0
    let payTotal = 0 ; let handoverTotal = 0 ; let incidents = 0 ; let criticalIncidents = 0
    for (const r of rows) {
      if (r.event_type === 'clocking' && r.amount === 1) { loginTime = new Date(r.captured_at).getTime() }
      else if (r.event_type === 'clocking' && r.amount === 0 && loginTime !== null) { totalMs += new Date(r.captured_at).getTime() - loginTime ; loginTime = null ; sessions++ }
      else if (r.event_type === 'pay') payTotal += r.amount ?? 0
      else if (r.event_type === 'handover') handoverTotal += r.amount ?? 0
      else if (r.event_type === 'incident') { incidents++ ; if (r.amount === 1) criticalIncidents++ }
    }
    return { date, hours: totalMs / 3600000, sessions, payTotal, handoverTotal, incidents, criticalIncidents }
  }).reverse()

  const totalHours = overall.reduce((s, r) => s + r.hours, 0)
  const totalPay = ledgerEntries.reduce((s, l) => s + (l.amount ?? 0), 0)
  const pendingPay = ledgerEntries.filter(l => !l.settled_at).reduce((s, l) => s + (l.amount ?? 0), 0)

  return (
    <div style={{ width: '100%', height: '100vh', background: A.bg, color: A.text, fontFamily: A.fontSans, display: 'flex', overflow: 'hidden' }}>

      {/* LEFT */}
      <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${A.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onMenuClick} style={{ background: 'transparent', border: `1px solid ${A.border}`, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.text2, fontSize: 14, fontFamily: A.fontMono, flexShrink: 0 }}>≡</button>
          <p style={{ fontFamily: A.fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: A.text, margin: 0 }}>OPERATORS</p>
          <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3, marginLeft: 'auto' }}>{people.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 16 }}>LOADING</p>
            : people.map(p => (
              <button key={p.pan} onClick={() => { setSelected(p) ; setTab('journal') }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: selected?.pan === p.pan ? A.elevated : 'transparent', border: 'none', borderBottom: `1px solid ${A.divider}`, cursor: 'pointer', textAlign: 'left' }}>
                <p style={{ fontFamily: A.fontSans, fontSize: 12, fontWeight: 500, color: A.text, margin: '0 0 2px' }}>{p.name}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3 }}>{p.pan}</span>
                  <span style={{ fontFamily: A.fontMono, fontSize: 9, color: (p.role === 'admin' || p.role === 'super_admin') ? A.accent : A.text3, letterSpacing: '0.04em' }}>{(p.role ?? 'operator').toUpperCase()}</span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: A.fontMono, fontSize: 11, color: A.textMuted, letterSpacing: '0.08em' }}>SELECT AN OPERATOR</p>
          </div>
        ) : (
          <>
            {/* header */}
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${A.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <p style={{ fontFamily: A.fontSans, fontSize: 15, fontWeight: 500, color: A.text, margin: '0 0 3px' }}>{selected.name}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{selected.pan}</span>
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{selected.email}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['7d', '30d', 'all'] as const).map(r => (
                  <button key={r} onClick={() => setRange(r)} style={{ padding: '4px 10px', fontFamily: A.fontMono, fontSize: 10, background: range === r ? A.invertBg : 'transparent', color: range === r ? A.invertText : A.text3, border: `1px solid ${range === r ? A.invertBg : A.border}`, cursor: 'pointer' }}>{r.toUpperCase()}</button>
                ))}
              </div>
            </div>

            {/* tabs */}
            <div style={{ display: 'flex', gap: 24, padding: '0 24px', borderBottom: `1px solid ${A.divider}`, flexShrink: 0 }}>
              {(['journal', 'ledger', 'overall'] as const).map(t => (
                <a key={t} onClick={() => setTab(t)} style={{ fontFamily: A.fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', cursor: 'pointer', paddingTop: 12, paddingBottom: 10, color: tab === t ? A.text : A.text3, borderBottom: tab === t ? `1px solid ${A.text}` : '1px solid transparent', marginBottom: -1 }}>{t}</a>
              ))}
            </div>

            {/* content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingDetail ? (
                <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>LOADING</p>
              ) : tab === 'journal' ? (
                <JournalView entries={journalEntries} evtColor={evtColor} evtLabel={evtLabel} fmtTime={fmtTime} />
              ) : tab === 'ledger' ? (
                <LedgerView entries={ledgerEntries} totalPay={totalPay} pendingPay={pendingPay} onSettle={settle} fmtTime={fmtTime} />
              ) : (
                <OverallView rows={overall} totalHours={totalHours} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function JournalView({ entries, evtColor, evtLabel, fmtTime }: { entries: LogEntry[], evtColor: (e: LogEntry) => string, evtLabel: (e: LogEntry) => string, fmtTime: (s: string) => string }) {
  if (entries.length === 0) return <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>NO JOURNAL EVENTS</p>
  let lastDate = ''
  return (
    <div style={{ padding: '0 24px' }}>
      {entries.map(e => {
        const date = new Date(e.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
        const showDate = date !== lastDate ; lastDate = date
        return (
          <div key={e.id}>
            {showDate && <p style={{ fontFamily: A.fontMono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: A.text3, padding: '14px 0 6px', margin: 0, borderBottom: `1px solid ${A.border}` }}>{date}</p>}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: `1px solid ${A.divider}` }}>
              {e.image_url ? <img src={e.image_url} alt="" style={{ width: 38, height: 38, objectFit: 'cover', flexShrink: 0, border: `1px solid ${A.divider}` }} /> : <div style={{ width: 38, height: 38, background: A.elevated, flexShrink: 0, border: `1px solid ${A.divider}` }} />}
              <div style={{ width: 6, height: 6, background: evtColor(e), flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, fontWeight: 500, color: evtColor(e), letterSpacing: '0.04em' }}>{evtLabel(e)}</span>
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{fmtTime(e.captured_at)}</span>
                </div>
                {e.note && <p style={{ fontFamily: A.fontSans, fontSize: 11, color: A.text2, margin: '3px 0 0' }}>{e.note}</p>}
                <p style={{ fontFamily: A.fontMono, fontSize: 9, color: A.textMuted, margin: '2px 0 0' }}>{e.lat.toFixed(4)}, {e.lng.toFixed(4)}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LedgerView({ entries, totalPay, pendingPay, onSettle, fmtTime }: { entries: LogEntry[], totalPay: number, pendingPay: number, onSettle: (id: string) => void, fmtTime: (s: string) => string }) {
  return (
    <div style={{ padding: '0 24px' }}>
      {/* summary */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 0', borderBottom: `1px solid ${A.border}`, flexWrap: 'wrap' }}>
        <MKpi label="TOTAL PAY" value={`₹${totalPay.toLocaleString()}`} color={A.text} />
        <MKpi label="PENDING" value={`₹${pendingPay.toLocaleString()}`} color={pendingPay > 0 ? '#f59e0b' : A.text3} />
        <MKpi label="SETTLED" value={`₹${(totalPay - pendingPay).toLocaleString()}`} color={A.positive} />
        <MKpi label="EVENTS" value={entries.length.toString()} />
      </div>

      {entries.length === 0 && <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>NO PAY EVENTS</p>}

      {entries.map(e => (
        <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${A.divider}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 6, height: 6, background: e.settled_at ? A.positive : '#f59e0b', flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: A.fontMono, fontSize: 18, fontWeight: 500, color: A.text, margin: 0 }}>₹{(e.amount ?? 0).toLocaleString()}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{fmtTime(e.captured_at)}</span>
                <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{new Date(e.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                {e.note && <span style={{ fontFamily: A.fontSans, fontSize: 10, color: A.text2 }}>{e.note}</span>}
              </div>
              {e.settled_at && <p style={{ fontFamily: A.fontMono, fontSize: 9, color: A.positive, margin: '2px 0 0' }}>SETTLED · {new Date(e.settled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</p>}
            </div>
          </div>
          {!e.settled_at && (
            <button
              onClick={() => onSettle(e.id)}
              style={{ background: 'transparent', border: `1px solid ${A.positive}`, color: A.positive, padding: '5px 12px', fontFamily: A.fontMono, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer' }}
            >
              SETTLE
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function OverallView({ rows, totalHours }: { rows: OverallRow[], totalHours: number }) {
  const th = Math.floor(totalHours) ; const tm = Math.round((totalHours - th) * 60)
  const totalPay = rows.reduce((s, r) => s + r.payTotal, 0)
  const totalHandover = rows.reduce((s, r) => s + r.handoverTotal, 0)
  const totalIncidents = rows.reduce((s, r) => s + r.incidents, 0)

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', gap: 8, padding: '14px 0', borderBottom: `1px solid ${A.border}`, flexWrap: 'wrap' }}>
        <MKpi label="TOTAL HOURS" value={`${th}h ${tm}m`} />
        <MKpi label="TOTAL PAY" value={`₹${totalPay.toLocaleString()}`} color={totalPay > 0 ? A.positive : A.text3} />
        <MKpi label="HANDOVERS" value={totalHandover.toLocaleString()} />
        <MKpi label="INCIDENTS" value={totalIncidents.toString()} color={totalIncidents > 0 ? '#f59e0b' : A.text3} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <thead>
          <tr>
            <th style={TH}>DATE</th>
            <th style={{ ...TH, textAlign: 'right' }}>HOURS</th>
            <th style={{ ...TH, textAlign: 'right' }}>SESSIONS</th>
            <th style={{ ...TH, textAlign: 'right' }}>PAY</th>
            <th style={{ ...TH, textAlign: 'right' }}>HANDOVER</th>
            <th style={{ ...TH, textAlign: 'right' }}>INCIDENTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const rh = Math.floor(r.hours) ; const rm = Math.round((r.hours - rh) * 60)
            return (
              <tr key={r.date}>
                <td style={TD}>{r.date}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: A.fontMono, fontSize: 11 }}>{r.hours > 0 ? `${rh}h ${rm}m` : '-'}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: A.fontMono, fontSize: 11 }}>{r.sessions || '-'}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: A.fontMono, fontSize: 11, color: r.payTotal > 0 ? A.positive : A.text3 }}>{r.payTotal > 0 ? `₹${r.payTotal.toLocaleString()}` : '-'}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: A.fontMono, fontSize: 11 }}>{r.handoverTotal || '-'}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: A.fontMono, fontSize: 11, color: r.criticalIncidents > 0 ? A.negative : r.incidents > 0 ? '#f59e0b' : A.text3 }}>{r.incidents || '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24, textAlign: 'center' }}>NO DATA</p>}
    </div>
  )
}

function MKpi({ label, value, color = A.text }: { label: string, value: string, color?: string }) {
  return (
    <div style={{ border: `1px solid ${A.border}`, background: A.surface, padding: '10px 14px', minWidth: 100 }}>
      <p style={{ fontFamily: A.fontMono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: A.text3, margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontFamily: A.fontMono, fontSize: 18, fontWeight: 500, color, margin: 0 }}>{value}</p>
    </div>
  )
}

const TH: React.CSSProperties = { fontFamily: A.fontMono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: A.text3, padding: '10px 8px', borderBottom: `1px solid ${A.border}`, textAlign: 'left' }
const TD: React.CSSProperties = { padding: '9px 8px', borderBottom: `1px solid ${A.divider}`, fontSize: 12, letterSpacing: '-0.02em', fontFamily: A.fontSans, color: A.text2 }
