import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { A } from './AdminTokens'

type Operation = { id: string ; name: string ; type: string | null ; description: string | null ; status: string ; location: string | null ; created_at: string }
type Person = { pan: string ; name: string ; role: string | null }
type Member = { id: string ; pan: string ; role_in_operation: string ; person?: Person }
type LogEntry = { id: string ; event_type: string ; captured_at: string ; amount: number | null ; note: string | null ; lat: number ; lng: number ; image_url: string ; pan: string ; settled_at?: string | null }
type OverallRow = { date: string ; hours: number ; sessions: number ; payTotal: number ; handoverTotal: number ; incidents: number ; criticalIncidents: number }

export default function OperationsPage({ onMenuClick }: { onMenuClick: () => void }) {
  const [operations, setOperations] = useState<Operation[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', type: '', description: '', location: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Operation | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [opLogs, setOpLogs] = useState<LogEntry[]>([])
  const [tab, setTab] = useState<'members' | 'journal' | 'ledger' | 'overall'>('members')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addRole, setAddRole] = useState('operator')
  const [myRole, setMyRole] = useState<string>('operator')
  // members to add during create
  const [createMembers, setCreateMembers] = useState<{ pan: string ; name: string ; role: string }[]>([])
  const [createSearch, setCreateSearch] = useState('')

  useEffect(() => {
    loadOps()
    supabase.from('people').select('pan, name, role').order('name').then(({ data }) => setPeople(data ?? []))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('people').select('role').eq('auth_id', user.id).single().then(({ data }) => {
        setMyRole(data?.role ?? 'operator')
      })
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    loadMembers(selected.id)
    loadOpLogs(selected.id)
  }, [selected])

  async function loadOps() {
    setLoading(true)
    const { data, error } = await supabase.from('operations').select('*').order('created_at', { ascending: false })
    if (error) { setError(error.message) ; setLoading(false) ; return }
    setOperations(data ?? []) ; setLoading(false)
  }

  async function loadMembers(opId: string) {
    const { data } = await supabase.from('operation_members').select('*').eq('operation_id', opId)
    const enriched = (data ?? []).map(m => ({ ...m, person: people.find(p => p.pan === m.pan) }))
    setMembers(enriched)
  }

  async function loadOpLogs(opId: string) {
    setLoadingDetail(true)
    // get member pans
    const { data: mData } = await supabase.from('operation_members').select('pan').eq('operation_id', opId)
    const pans = (mData ?? []).map(m => m.pan)
    if (pans.length === 0) { setOpLogs([]) ; setLoadingDetail(false) ; return }
    const { data } = await supabase.from('attendance_log').select('*').in('pan', pans).order('captured_at', { ascending: false }).limit(2000)
    setOpLogs(data ?? [])
    setLoadingDetail(false)
  }

  async function closeOp(opId: string) {
    await supabase.from('operations').update({ status: 'closed' }).eq('id', opId)
    setOperations(prev => prev.map(op => op.id === opId ? { ...op, status: 'closed' } : op))
    if (selected?.id === opId) setSelected(prev => prev ? { ...prev, status: 'closed' } : prev)
  }

  async function createOp() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: opData, error } = await supabase.from('operations').insert({
      name: form.name.trim(), type: form.type.trim() || null,
      description: form.description.trim() || null, location: form.location.trim() || null,
      status: 'active', created_by: user?.id ?? null,
    }).select().single()
    if (error) { setError(error.message) ; setSaving(false) ; return }

    // add members
    if (createMembers.length > 0 && opData) {
      await supabase.from('operation_members').insert(createMembers.map(m => ({ operation_id: opData.id, pan: m.pan, role_in_operation: m.role })))
    }

    setForm({ name: '', type: '', description: '', location: '' })
    setCreateMembers([]) ; setCreateSearch('')
    setShowCreate(false) ; setSaving(false)
    loadOps()
  }

  async function addMember(opId: string, pan: string) {
    await supabase.from('operation_members').insert({ operation_id: opId, pan, role_in_operation: addRole })
    setAddSearch('')
    loadMembers(opId)
    loadOpLogs(opId)
  }

  async function removeMember(memberId: string) {
    await supabase.from('operation_members').delete().eq('id', memberId)
    if (selected) { loadMembers(selected.id) ; loadOpLogs(selected.id) }
  }

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  function evtColor(e: LogEntry) {
    if (e.event_type === 'clocking') return e.amount === 1 ? A.positive : A.text2
    if (e.event_type === 'incident') return e.amount === 1 ? A.negative : '#f59e0b'
    if (e.event_type === 'pay') return A.positive
    if (e.event_type === 'handover') return '#f59e0b'
    return A.text2
  }

  function evtLabel(e: LogEntry) {
    if (e.event_type === 'clocking') return e.amount === 1 ? 'LOGIN' : 'LOGOUT'
    if (e.event_type === 'incident') return e.amount === 1 ? 'CRITICAL' : 'INCIDENT'
    if (e.event_type === 'handover') return `HANDOVER · ${e.amount ?? 0}`
    if (e.event_type === 'pay') return `PAY · ₹${(e.amount ?? 0).toLocaleString()}`
    return e.event_type?.toUpperCase()
  }

  const personMap: Record<string, Person> = {}
  people.forEach(p => { personMap[p.pan] = p })

  // derived
  const journalEntries = opLogs.filter(l => l.event_type === 'clocking' || l.event_type === 'incident')
  const ledgerEntries = opLogs.filter(l => l.event_type === 'pay')
  const totalPay = ledgerEntries.reduce((s, l) => s + (l.amount ?? 0), 0)
  const pendingPay = ledgerEntries.filter(l => !l.settled_at).reduce((s, l) => s + (l.amount ?? 0), 0)

  const byDate: Record<string, LogEntry[]> = {}
  for (const r of [...opLogs].reverse()) {
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

  const searchResults = (q: string) => q.length >= 2 ? people.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.pan.toLowerCase().includes(q.toLowerCase())) : []
  const createSearchResults = searchResults(createSearch).filter(p => !createMembers.find(m => m.pan === p.pan))
  const addSearchResults = searchResults(addSearch).filter(p => !members.find(m => m.pan === p.pan))

  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: `1px solid ${A.border}`, color: A.text, padding: '8px 10px', fontSize: 12, fontFamily: A.fontMono, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ width: '100%', height: '100vh', background: A.bg, color: A.text, fontFamily: A.fontSans, display: 'flex', overflow: 'hidden' }}>

      {/* LEFT - operations list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${A.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onMenuClick} style={{ background: 'transparent', border: `1px solid ${A.border}`, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.text2, fontSize: 14, fontFamily: A.fontMono, flexShrink: 0 }}>≡</button>
          <p style={{ fontFamily: A.fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: A.text, margin: 0 }}>OPERATIONS</p>
          <button onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto', background: A.invertBg, border: 'none', color: A.invertText, padding: '4px 10px', fontFamily: A.fontMono, fontSize: 9, fontWeight: 500, cursor: 'pointer' }}>+ NEW</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 16 }}>LOADING</p>
            : operations.map(op => (
              <button key={op.id} onClick={() => { setSelected(op) ; setTab('members') }} style={{ display: 'block', width: '100%', padding: '12px 14px', background: selected?.id === op.id ? A.elevated : 'transparent', border: 'none', borderBottom: `1px solid ${A.divider}`, cursor: 'pointer', textAlign: 'left' }}>
                <p style={{ fontFamily: A.fontSans, fontSize: 12, fontWeight: 500, color: A.text, margin: '0 0 3px' }}>{op.name}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {op.type && <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3 }}>{op.type.toUpperCase()}</span>}
                  {op.location && <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3 }}>{op.location}</span>}
                  <span style={{ fontFamily: A.fontMono, fontSize: 9, color: op.status === 'active' ? A.positive : A.text3 }}>{op.status?.toUpperCase()}</span>
                </div>
              </button>
            ))}
          {!loading && operations.length === 0 && !error && <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 16 }}>NO OPERATIONS</p>}
          {error && <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.negative, padding: 16 }}>{error}</p>}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* CREATE MODAL */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,12,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: A.surface, border: `1px solid ${A.border}`, padding: 24, width: 500, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontFamily: A.fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: A.text, margin: 0 }}>CREATE OPERATION</p>

              {[['NAME *', 'name'], ['TYPE', 'type'], ['LOCATION', 'location']].map(([lbl, key]) => (
                <div key={key}>
                  <p style={{ fontFamily: A.fontMono, fontSize: 9, letterSpacing: '0.08em', color: A.text3, margin: '0 0 4px' }}>{lbl}</p>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div>
                <p style={{ fontFamily: A.fontMono, fontSize: 9, letterSpacing: '0.08em', color: A.text3, margin: '0 0 4px' }}>DESCRIPTION</p>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
              </div>

              {/* add members during create */}
              <div>
                <p style={{ fontFamily: A.fontMono, fontSize: 9, letterSpacing: '0.08em', color: A.text3, margin: '0 0 8px' }}>ADD MEMBERS</p>
                {createMembers.map(m => (
                  <div key={m.pan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${A.divider}` }}>
                    <span style={{ fontFamily: A.fontSans, fontSize: 12, color: A.text }}>{m.name} <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3 }}>{m.role.toUpperCase()}</span></span>
                    <button onClick={() => setCreateMembers(prev => prev.filter(x => x.pan !== m.pan))} style={{ background: 'transparent', border: 'none', color: A.negative, cursor: 'pointer', fontFamily: A.fontMono, fontSize: 10 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input value={createSearch} onChange={e => setCreateSearch(e.target.value)} placeholder="Search by name or PAN" style={{ ...inputStyle, fontSize: 11 }} />
                    {createSearchResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: A.elevated, border: `1px solid ${A.border}`, maxHeight: 140, overflowY: 'auto', zIndex: 10 }}>
                        {createSearchResults.slice(0, 6).map(p => (
                          <button key={p.pan} onClick={() => { setCreateMembers(prev => [...prev, { pan: p.pan, name: p.name, role: addRole }]) ; setCreateSearch('') }} style={{ display: 'block', width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderBottom: `1px solid ${A.divider}`, color: A.text, fontFamily: A.fontSans, fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                            {p.name} <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3 }}>{p.pan}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['operator', 'admin'].map(r => (
                      <button key={r} onClick={() => setAddRole(r)} style={{ padding: '4px 8px', fontFamily: A.fontMono, fontSize: 9, background: addRole === r ? A.invertBg : 'transparent', color: addRole === r ? A.invertText : A.text3, border: `1px solid ${addRole === r ? A.border : A.border}`, cursor: 'pointer' }}>{r.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={createOp} disabled={saving} style={{ background: A.invertBg, border: 'none', color: A.invertText, padding: '8px 20px', fontFamily: A.fontMono, fontSize: 10, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? 'CREATING' : 'CREATE'}</button>
                <button onClick={() => { setShowCreate(false) ; setCreateMembers([]) ; setCreateSearch('') }} style={{ background: 'transparent', border: `1px solid ${A.border}`, color: A.text3, padding: '8px 20px', fontFamily: A.fontMono, fontSize: 10, cursor: 'pointer' }}>CANCEL</button>
              </div>
            </div>
          </div>
        )}

        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: A.fontMono, fontSize: 11, color: A.textMuted, letterSpacing: '0.08em' }}>SELECT AN OPERATION</p>
          </div>
        ) : (
          <>
            {/* op header */}
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${A.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: A.fontSans, fontSize: 15, fontWeight: 500, color: A.text, margin: '0 0 3px' }}>{selected.name}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {selected.type && <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{selected.type.toUpperCase()}</span>}
                  {selected.location && <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{selected.location}</span>}
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, color: selected.status === 'active' ? A.positive : selected.status === 'closed' ? A.negative : A.text3 }}>{selected.status?.toUpperCase()}</span>
                </div>
              </div>
              {myRole === 'super_admin' && selected.status === 'active' && (
                <button
                  onClick={() => closeOp(selected.id)}
                  style={{ background: 'transparent', border: `1px solid ${A.negative}`, color: A.negative, padding: '5px 14px', fontFamily: A.fontMono, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer' }}
                >
                  CLOSE OPERATION
                </button>
              )}
            </div>

            {/* tabs */}
            <div style={{ display: 'flex', gap: 24, padding: '0 24px', borderBottom: `1px solid ${A.divider}`, flexShrink: 0 }}>
              {(['members', 'journal', 'ledger', 'overall'] as const).map(t => (
                <a key={t} onClick={() => setTab(t)} style={{ fontFamily: A.fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', cursor: 'pointer', paddingTop: 12, paddingBottom: 10, color: tab === t ? A.text : A.text3, borderBottom: tab === t ? `1px solid ${A.text}` : '1px solid transparent', marginBottom: -1 }}>{t}</a>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {tab === 'members' && (
                <div style={{ padding: '16px 24px' }}>
                  <p style={{ fontFamily: A.fontMono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: A.text3, margin: '0 0 10px' }}>MEMBERS · {members.length}</p>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${A.divider}` }}>
                      <div>
                        <span style={{ fontFamily: A.fontSans, fontSize: 13, color: A.text }}>{m.person?.name ?? m.pan}</span>
                        <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3, marginLeft: 12 }}>{m.role_in_operation.toUpperCase()}</span>
                      </div>
                      {myRole === 'super_admin' && (
                        <button onClick={() => removeMember(m.id)} style={{ background: 'transparent', border: 'none', color: A.negative, fontFamily: A.fontMono, fontSize: 10, cursor: 'pointer' }}>✕</button>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, marginBottom: 12 }}>No members</p>}

                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontFamily: A.fontMono, fontSize: 9, letterSpacing: '0.08em', color: A.text3, margin: '0 0 8px' }}>ADD OPERATOR</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search by name or PAN" style={{ ...inputStyle, fontSize: 11 }} />
                        {addSearchResults.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: A.elevated, border: `1px solid ${A.border}`, maxHeight: 150, overflowY: 'auto', zIndex: 10 }}>
                            {addSearchResults.slice(0, 8).map(p => (
                              <button key={p.pan} onClick={() => addMember(selected.id, p.pan)} style={{ display: 'block', width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderBottom: `1px solid ${A.divider}`, color: A.text, fontFamily: A.fontSans, fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                                {p.name} <span style={{ fontFamily: A.fontMono, fontSize: 9, color: A.text3 }}>{p.pan}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['operator', 'admin'].map(r => (
                          <button key={r} onClick={() => setAddRole(r)} style={{ padding: '4px 10px', fontFamily: A.fontMono, fontSize: 10, background: addRole === r ? A.invertBg : 'transparent', color: addRole === r ? A.invertText : A.text3, border: `1px solid ${addRole === r ? A.border : A.border}`, cursor: 'pointer' }}>{r.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'journal' && (
                loadingDetail ? <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>LOADING</p> : (
                  <OpJournal entries={journalEntries} evtColor={evtColor} evtLabel={evtLabel} fmtTime={fmtTime} personMap={personMap} />
                )
              )}

              {tab === 'ledger' && (
                loadingDetail ? <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>LOADING</p> : (
                  <OpLedger entries={ledgerEntries} totalPay={totalPay} pendingPay={pendingPay} fmtTime={fmtTime} personMap={personMap} />
                )
              )}

              {tab === 'overall' && (
                loadingDetail ? <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>LOADING</p> : (
                  <OpOverall rows={overall} totalHours={totalHours} />
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OpJournal({ entries, evtColor, evtLabel, fmtTime, personMap }: { entries: LogEntry[], evtColor: (e: LogEntry) => string, evtLabel: (e: LogEntry) => string, fmtTime: (s: string) => string, personMap: Record<string, Person> }) {
  if (entries.length === 0) return <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>NO EVENTS</p>
  let lastDate = ''
  return (
    <div style={{ padding: '0 24px' }}>
      {entries.map(e => {
        const date = new Date(e.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
        const showDate = date !== lastDate ; lastDate = date
        const person = personMap[e.pan]
        return (
          <div key={e.id}>
            {showDate && <p style={{ fontFamily: A.fontMono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: A.text3, padding: '14px 0 6px', margin: 0, borderBottom: `1px solid ${A.border}` }}>{date}</p>}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: `1px solid ${A.divider}` }}>
              {e.image_url ? <img src={e.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', flexShrink: 0, border: `1px solid ${A.divider}` }} /> : <div style={{ width: 36, height: 36, background: A.elevated, flexShrink: 0 }} />}
              <div style={{ width: 6, height: 6, background: evtColor(e), flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontFamily: A.fontMono, fontSize: 10, fontWeight: 500, color: evtColor(e), letterSpacing: '0.04em' }}>{evtLabel(e)}</span>
                    <span style={{ fontFamily: A.fontSans, fontSize: 10, color: A.text2, marginLeft: 10 }}>{person?.name ?? e.pan}</span>
                  </div>
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{fmtTime(e.captured_at)}</span>
                </div>
                {e.note && <p style={{ fontFamily: A.fontSans, fontSize: 11, color: A.text2, margin: '3px 0 0' }}>{e.note}</p>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OpLedger({ entries, totalPay, pendingPay, fmtTime, personMap }: { entries: LogEntry[], totalPay: number, pendingPay: number, fmtTime: (s: string) => string, personMap: Record<string, Person> }) {
  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', gap: 8, padding: '14px 0', borderBottom: `1px solid ${A.border}`, flexWrap: 'wrap' }}>
        <MKpi label="TOTAL PAY" value={`₹${totalPay.toLocaleString()}`} />
        <MKpi label="PENDING" value={`₹${pendingPay.toLocaleString()}`} color={pendingPay > 0 ? '#f59e0b' : A.text3} />
        <MKpi label="SETTLED" value={`₹${(totalPay - pendingPay).toLocaleString()}`} color={A.positive} />
      </div>
      {entries.length === 0 && <p style={{ fontFamily: A.fontMono, fontSize: 10, color: A.textMuted, padding: 24 }}>NO PAY EVENTS</p>}
      {entries.map(e => {
        const person = personMap[e.pan]
        return (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${A.divider}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 6, height: 6, background: e.settled_at ? A.positive : '#f59e0b', flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <p style={{ fontFamily: A.fontMono, fontSize: 16, fontWeight: 500, color: A.text, margin: 0 }}>₹{(e.amount ?? 0).toLocaleString()}</p>
                  <span style={{ fontFamily: A.fontSans, fontSize: 11, color: A.text2 }}>{person?.name ?? e.pan}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{fmtTime(e.captured_at)}</span>
                  <span style={{ fontFamily: A.fontMono, fontSize: 10, color: A.text3 }}>{new Date(e.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                  {e.note && <span style={{ fontFamily: A.fontSans, fontSize: 10, color: A.text2 }}>{e.note}</span>}
                </div>
                {e.settled_at && <p style={{ fontFamily: A.fontMono, fontSize: 9, color: A.positive, margin: '2px 0 0' }}>SETTLED</p>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OpOverall({ rows, totalHours }: { rows: OverallRow[], totalHours: number }) {
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