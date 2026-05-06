import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { T } from './tokens'

type EventType = 'login' | 'logout' | 'general' | 'alert'

export default function Attendance() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [note, setNote] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [time, setTime] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<EventType>('login')
  const [userPan, setUserPan] = useState<string | null>(null)

  useEffect(() => {
    startCamera(facingMode)

    const watchId = navigator.geolocation.watchPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )

    const tick = setInterval(() => setTime(new Date()), 1000)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('people').select('pan').eq('auth_id', user.id).single()
        .then(({ data }) => { if (data) setUserPan(data.pan) })
    })

    return () => {
      clearInterval(tick)
      navigator.geolocation.clearWatch(watchId)
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  function startCamera(facing: 'environment' | 'user') {
    setCamReady(false)
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCamReady(true)
        }
      })
      .catch(() => setMessage('Camera access denied'))
  }

  function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera(next)
  }

  function compress(canvas: HTMLCanvasElement, targetBytes: number): Promise<{ blob: Blob }> {
    return new Promise(resolve => {
      function attempt(q: number) {
        canvas.toBlob(blob => {
          if (!blob) return
          if (blob.size <= targetBytes || q <= 0.05) resolve({ blob })
          else attempt(Math.max(0.05, q - 0.08))
        }, 'image/jpeg', q)
      }
      attempt(0.9)
    })
  }

  async function handleLog() {
    if (!coords) { setMessage('Waiting for GPS') ; return }
    if (!userPan) { setMessage('User not loaded') ; return }
    if (!userPan) { setMessage('User not loaded') ; return }

    if (selectedEvent === 'login' || selectedEvent === 'logout') {
      const { data: last } = await supabase
        .from('attendance_log')
        .select('event_type')
        .eq('pan', userPan)
        .in('event_type', ['login', 'logout'])
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (selectedEvent === 'login' && last?.event_type === 'login') {
        setStatus('error')
        setMessage('Already logged in . please logout first .')
        setTimeout(() => { setStatus('idle') ; setMessage('') }, 3000)
        return
      }

      if (selectedEvent === 'logout' && last?.event_type !== 'login') {
        setStatus('error')
        setMessage('No active login found . please login first .')
        setTimeout(() => { setStatus('idle') ; setMessage('') }, 3000)
        return
      }
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setStatus('loading') ; setMessage('')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    const { blob } = await compress(canvas, 20480)
    const fileName = `${userPan}_${Date.now()}.jpg`
    const capturedAt = new Date().toISOString()

    const { error: uploadError } = await supabase.storage
      .from('photos').upload(fileName, blob, { contentType: 'image/jpeg' })
    if (uploadError) { setStatus('error') ; setMessage('Upload failed: ' + uploadError.message) ; return }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)

    let sessionId: string | null = null

    if (selectedEvent === 'login') {
      sessionId = crypto.randomUUID()
    }

    if (selectedEvent === 'logout') {
      const { data: lastLogin } = await supabase
        .from('attendance_log')
        .select('session_id')
        .eq('pan', userPan)
        .eq('event_type', 'login')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      sessionId = lastLogin?.session_id ?? null
    }

    const { error: insertError } = await supabase.from('attendance_log').insert({
      pan: userPan ,
      image_url: urlData.publicUrl ,
      lat: coords.lat ,
      lng: coords.lng ,
      captured_at: capturedAt ,
      note: note.trim() || null ,
      event_type: selectedEvent ,
      session_id: sessionId
    })

    if (insertError) {
      setStatus('error')
      setMessage('Save failed: ' + insertError.message)
      return
    }

    setStatus('success')
    setMessage(`${selectedEvent.toUpperCase()} logged`)
    setNote('')
    setTimeout(() => { setStatus('idle') ; setMessage('') }, 3000)
  }

  const events: { type: EventType, label: string }[] = [
    { type: 'login',   label: 'LOGIN' },
    { type: 'logout',  label: 'LOGOUT' },
    { type: 'general', label: 'GENERAL' },
    { type: 'alert',   label: 'ALERT' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!camReady && (
          <div style={{ position: 'absolute', inset: 0, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.textMuted }}>INITIALISING CAMERA</p>
          </div>
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(13,13,13,0.85)', borderBottom: `1px solid ${T.border}`, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.textMuted, margin: '0 0 2px' }}>LOCATION</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 11, letterSpacing: '-0.02em', color: coords ? T.text : T.textMuted, margin: 0 }}>
              {coords ? `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}` : 'ACQUIRING'}
            </p>
          </div>
          <button onClick={flipCamera} style={{ background: 'transparent', border: `1px solid ${T.border}`, padding: '5px 10px', color: T.text3, fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
            FLIP
          </button>
        </div>

        {message && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: status === 'success' ? T.positive : T.negative, color: T.invertText, fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const }}>
            {message}
          </div>
        )}
      </div>

      <div style={{ background: T.bg, borderTop: `1px solid ${T.border}` }}>

        <div style={{ display: 'flex', gap: 24, padding: '12px 16px', borderBottom: `1px solid ${T.divider}`, justifyContent: 'center' }}>
          <div>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 2px' }}>GPS</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: coords ? T.positive : T.negative, margin: 0 }}>{coords ? 'READY' : 'WAIT'}</p>
          </div>
          <div>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 2px' }}>CAMERA</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: camReady ? T.positive : T.negative, margin: 0 }}>{camReady ? 'READY' : 'WAIT'}</p>
          </div>
          <div>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 2px' }}>TIME</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 500, letterSpacing: '-0.02em', color: T.text, margin: 0 }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: `1px solid ${T.divider}`, justifyContent: 'center' }}>
          {events.map(e => (
            <button key={e.type} onClick={() => setSelectedEvent(e.type)} style={{ padding: '6px 10px', background: selectedEvent === e.type ? T.invertBg : 'transparent', color: selectedEvent === e.type ? T.invertText : T.text2, border: `1px solid ${selectedEvent === e.type ? T.invertBg : T.border}`, fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
              {e.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.divider}`, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.textMuted, margin: '0 0 8px' }}>NOTE</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" rows={2} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${T.border}`, color: T.text2, fontSize: 13, letterSpacing: '-0.02em', resize: 'none', padding: '0 0 8px', fontFamily: T.fontSans, outline: 'none' }} />
          </div>
        </div>

        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={handleLog} disabled={status === 'loading' || !userPan} style={{ padding: '10px 32px', background: status === 'loading' ? T.surface : T.invertBg, color: status === 'loading' ? T.textMuted : T.invertText, border: `1px solid ${status === 'loading' ? T.border : T.invertBg}`, fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}>
            {status === 'loading' ? 'LOGGING' : selectedEvent.toUpperCase()}
          </button>
        </div>

      </div>
    </div>
  )
}