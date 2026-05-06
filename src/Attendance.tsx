import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

import { T, caps, mono, bodyText } from './tokens'

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

  useEffect(() => {
    startCamera(facingMode)
    navigator.geolocation.watchPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
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
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setStatus('loading') ; setMessage('')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    const { blob } = await compress(canvas, 20480)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.email?.replace('@app.com', '') ?? 'unknown'
    const fileName = `${userId}_${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('photos').upload(fileName, blob, { contentType: 'image/jpeg' })
    if (uploadError) { setStatus('error') ; setMessage('Upload failed') ; return }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)

    const { error: insertError } = await supabase.from('attendance_log').insert({
      user_id: userId, image_url: urlData.publicUrl,
      lat: coords.lat, lng: coords.lng,
      captured_at: new Date().toISOString(),
      note: note.trim() || null
    })
    if (insertError) { setStatus('error') ; setMessage('Save failed') ; return }

    setStatus('success') ; setMessage('Attendance logged') ; setNote('')
    setTimeout(() => { setStatus('idle') ; setMessage('') }, 3000)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!camReady && (
          <div style={{ position: 'absolute', inset: 0, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ ...caps, color: T.textMuted }}>INITIALISING CAMERA</p>
          </div>
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(13,13,13,0.85)', borderBottom: `1px solid ${T.border}`, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ ...caps, color: T.textMuted, marginBottom: 3 }}>LOCATION</p>
            <p style={{ ...mono, fontSize: 11, color: coords ? T.text : T.textMuted }}>
              {coords ? `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}` : 'ACQUIRING'}
            </p>
          </div>
          <button onClick={flipCamera} style={{ background: 'transparent', border: `1px solid ${T.border}`, padding: '5px 10px', color: T.text3, ...caps, cursor: 'pointer' }}>
            FLIP
          </button>
        </div>

        {message && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: status === 'success' ? T.positive : T.negative, color: T.invertText, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const }}>
            {message.toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ background: T.bg, borderTop: `1px solid ${T.border}` }}>

      <div style={{ display: 'flex', gap: 24, padding: '12px 16px', borderBottom: `1px solid ${T.divider}`, justifyContent: 'center' }}>
      <div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 2px' }}>GPS</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: coords ? '#22c55e' : '#ef4444', margin: 0 }}>{coords ? 'READY' : 'WAIT'}</p>
          </div>
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 2px' }}>CAMERA</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: camReady ? '#22c55e' : '#ef4444', margin: 0 }}>{camReady ? 'READY' : 'WAIT'}</p>
          </div>
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 2px' }}>TIME</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, letterSpacing: '-0.02em', color: T.text, margin: 0 }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.divider}`, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <p style={{ ...caps, color: T.textMuted, marginBottom: 8, fontSize: 10 }}>NOTE</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional"
              rows={2}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${T.border}`, color: T.text2, fontSize: 13, letterSpacing: '-0.02em', resize: 'none', padding: '0 0 8px', fontFamily: T.fontSans }}
            />
          </div>
        </div>

        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleLog}
            disabled={status === 'loading'}
            style={{ padding: '12px 32px', background: status === 'loading' ? T.surface : T.invertBg, color: status === 'loading' ? T.textMuted : T.invertText, border: `1px solid ${status === 'loading' ? T.border : T.invertBg}`, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}
          >
            {status === 'loading' ? 'LOGGING' : 'LOG ATTENDANCE'}
          </button>
        </div>
      </div>
    </div>
  )
}