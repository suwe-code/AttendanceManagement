import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export default function Attendance() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCamReady(true)
        }
      })
      .catch(() => setMessage('Camera access denied'))

    navigator.geolocation.watchPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

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
    if (!coords) { setMessage('Waiting for GPS...') ; return }
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setStatus('loading')
    setMessage('')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    const { blob } = await compress(canvas, 20480)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.email?.replace('@app.com', '') ?? 'unknown'
    const fileName = `${userId}_${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, blob, { contentType: 'image/jpeg' })

    if (uploadError) {
      setStatus('error')
      setMessage('Upload failed : ' + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)

    const { error: insertError } = await supabase.from('attendance_log').insert({
      user_id: userId,
      image_url: urlData.publicUrl,
      lat: coords.lat,
      lng: coords.lng,
      captured_at: new Date().toISOString(),
      note: note.trim() || null
    })

    if (insertError) { setStatus('error') ; setMessage('Save failed') ; return }

    setStatus('success')
    setMessage('Attendance logged successfully')
    setNote('')
    setTimeout(() => { setStatus('idle') ; setMessage('') }, 3000)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!camReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
            <p style={{ color: '#555', fontSize: 14 }}>{message || 'Starting camera...'}</p>
          </div>
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
          <p style={{ color: '#fff', fontSize: 11, margin: 0, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Location</p>
          <p style={{ color: '#fff', fontSize: 13, margin: '2px 0 0', fontWeight: 500 }}>
            {coords ? `${coords.lat.toFixed(5)} , ${coords.lng.toFixed(5)}` : 'Acquiring GPS...'}
          </p>
        </div>

        {message && (
          <div style={{
            position: 'absolute', top: 70, left: 16, right: 16,
            background: status === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
            padding: '12px 16px', borderRadius: 10, color: '#fff', fontSize: 13, textAlign: 'center'
          }}>
            {message}
          </div>
        )}
      </div>

      <div style={{ padding: '16px', background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: '#555', fontSize: 10, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>GPS</p>
            <p style={{ color: coords ? '#4ade80' : '#ef4444', fontSize: 12, margin: 0, fontWeight: 500 }}>
              {coords ? 'Ready' : 'Waiting'}
            </p>
          </div>
          <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: '#555', fontSize: 10, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Camera</p>
            <p style={{ color: camReady ? '#4ade80' : '#ef4444', fontSize: 12, margin: 0, fontWeight: 500 }}>
              {camReady ? 'Ready' : 'Starting'}
            </p>
          </div>
          <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: '#555', fontSize: 10, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Time</p>
            <p style={{ color: '#fff', fontSize: 12, margin: 0, fontWeight: 500 }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note ( optional )"
          rows={2}
          style={{
            width: '100%', marginBottom: 10, padding: '10px 14px',
            background: '#111', border: '1px solid #1e1e1e',
            borderRadius: 10, color: '#fff', fontSize: 13,
            resize: 'none', outline: 'none', boxSizing: 'border-box',
            fontFamily: 'system-ui, sans-serif'
          }}
        />

        <button
          onClick={handleLog}
          disabled={status === 'loading'}
          style={{
            width: '100%', padding: '15px', borderRadius: 12,
            background: status === 'loading' ? '#222' : '#fff',
            color: status === 'loading' ? '#555' : '#000',
            border: 'none', fontSize: 15, fontWeight: 600,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            letterSpacing: 0.3
          }}
        >
          {status === 'loading' ? 'Logging attendance...' : 'Log Attendance'}
        </button>
      </div>
    </div>
  )
}