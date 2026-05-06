import { useState } from 'react'
import { supabase } from './supabase'
import { T } from './tokens'

type Screen = 'signin' | 'signup'

const LANGUAGES = ['English','Hindi','Tamil','Telugu','Kannada','Malayalam','Marathi','Bengali','Gujarati','Punjabi']
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

export default function Login() {
  const [screen, setScreen] = useState<Screen>('signin')
  if (screen === 'signin') return <SignIn onSwitch={() => setScreen('signup')} />
  return <SignUp onSwitch={() => setScreen('signin')} />
}

function SignIn({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true) ; setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Invalid email or password')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <img src="/logo.png" alt="SPEC-OPS" style={{ height: 24, display: 'block', marginBottom: 40 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 4px' }}>Email</p>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.text, padding: '8px 10px', fontSize: 13, fontFamily: T.fontSans, letterSpacing: '-0.02em', outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
          <div>
            <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 4px' }}>Password</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.text, padding: '8px 10px', fontSize: 13, fontFamily: T.fontSans, letterSpacing: '-0.02em', outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
          {error && <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.negative, margin: 0, letterSpacing: '-0.02em' }}>{error}</p>}
          <button
            onClick={handleSignIn}
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? T.surface : T.invertBg, color: loading ? T.textMuted : T.invertText, border: 'none', fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in' : 'Sign In'}
          </button>
          <button
            onClick={onSwitch}
            style={{ background: 'transparent', border: 'none', color: T.text3, fontFamily: T.fontSans, fontSize: 11, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer', padding: '4px 0', textAlign: 'left' as const }}
          >
            Create account →
          </button>
        </div>
      </div>
    </div>
  )
}

function SignUp({ onSwitch }: { onSwitch: () => void }) {
  const [pan, setPan] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [waNum, setWaNum] = useState('')
  const [discord, setDiscord] = useState('')
  const [dob, setDob] = useState('')
  const [benefName, setBenefName] = useState('')
  const [accNum, setAccNum] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [upiId, setUpiId] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [introVideo, setIntroVideo] = useState<File | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleLang(lang: string) {
    setLanguages(l => l.includes(lang) ? l.filter(x => x !== lang) : [...l, lang])
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {}
    if (!PAN_REGEX.test(pan.toUpperCase())) errs.pan = 'Enter a valid PAN ( e.g. ABCDE1234F )'
    if (!name.trim()) errs.name = 'Full name is required'
    if (!email.trim()) errs.email = 'Email is required'
    if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (Object.keys(errs).length) { setErrors(errs) ; return }

    setLoading(true) ; setGlobalError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setGlobalError(authError.message.toLowerCase().includes('already') ? 'Email already in use' : authError.message)
      setLoading(false) ; return
    }

    const authId = authData.user?.id
    if (!authId) { setGlobalError('Signup failed. Try again.') ; setLoading(false) ; return }

    let intro_video_url: string | null = null
    if (introVideo && introVideo.size > 50 * 1024 * 1024) {
      setGlobalError('Video is too large . please record a shorter clip ( under 50MB )')
      setLoading(false) ; return
    }
    if (introVideo) {
      setVideoUploading(true)
      const ext = introVideo.name.split('.').pop()
      const fileName = `${pan.toUpperCase()}_${Date.now()}.${ext}`
      const { error: vidError } = await supabase.storage
        .from('intro-videos').upload(fileName, introVideo, { contentType: introVideo.type })
      if (!vidError) {
        const { data: vidUrl } = supabase.storage.from('intro-videos').getPublicUrl(fileName)
        intro_video_url = vidUrl.publicUrl
      }
      setVideoUploading(false)
    }

    const { error: insertError } = await supabase.from('people').insert({
      pan: pan.toUpperCase(), auth_id: authId, name, email,
      wa_num: waNum || null, discord: discord || null,
      dob: dob || null, benef_name: benefName || null,
      acc_num: accNum || null, ifsc: ifsc || null,
      upi_id: upiId || null, languages,
      permanent_address: address || null, residing_city: city || null,
      intro_video_url
    })

    if (insertError) {
      setGlobalError(insertError.message.toLowerCase().includes('duplicate') || insertError.message.toLowerCase().includes('unique') ? 'PAN already registered' : insertError.message)
      await supabase.auth.signOut()
      setLoading(false) ; return
    }

    await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', background: 'transparent',
    border: `1px solid ${hasError ? T.negative : T.border}`,
    color: T.text, padding: '8px 10px', fontSize: 13,
    fontFamily: T.fontSans, letterSpacing: '-0.02em',
    outline: 'none', boxSizing: 'border-box' as const
  })

  const lbl = (text: string, required = false) => (
    <p style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, color: T.text2, margin: '0 0 4px' }}>
      {text}{required && <span style={{ color: T.negative }}> *</span>}
    </p>
  )

  const err = (key: string) => errors[key]
    ? <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.negative, margin: '4px 0 0', letterSpacing: '-0.02em' }}>{errors[key]}</p>
    : null

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 64px' }}>
        <img src="/logo.png" alt="SPEC-OPS" style={{ height: 24, display: 'block', marginBottom: 32 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            {lbl('PAN Number', true)}
            <input value={pan} onChange={e => { setPan(e.target.value) ; setErrors(x => ({ ...x, pan: '' })) }} placeholder="ABCDE1234F" style={inputStyle(!!errors.pan)} />
            {err('pan')}
          </div>

          <div>
            {lbl('Full Name', true)}
            <input value={name} onChange={e => { setName(e.target.value) ; setErrors(x => ({ ...x, name: '' })) }} style={inputStyle(!!errors.name)} />
            {err('name')}
          </div>

          <div>
            {lbl('Email', true)}
            <input type="email" value={email} onChange={e => { setEmail(e.target.value) ; setErrors(x => ({ ...x, email: '' })) }} style={inputStyle(!!errors.email)} />
            {err('email')}
          </div>

          <div>
            {lbl('Password', true)}
            <input type="password" value={password} onChange={e => { setPassword(e.target.value) ; setErrors(x => ({ ...x, password: '' })) }} placeholder="Min 8 characters" style={inputStyle(!!errors.password)} />
            {err('password')}
          </div>

          <div style={{ height: 1, background: T.divider, margin: '4px 0' }} />

          <div>
            {lbl('WhatsApp Number')}
            <input value={waNum} onChange={e => setWaNum(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            {lbl('Discord Handle')}
            <input value={discord} onChange={e => setDiscord(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            {lbl('Date of Birth')}
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ ...inputStyle(), colorScheme: 'dark' }} />
          </div>

          <div>
            {lbl('Beneficiary Name')}
            <input value={benefName} onChange={e => setBenefName(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            {lbl('Account Number')}
            <input value={accNum} onChange={e => setAccNum(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            {lbl('IFSC Code')}
            <input value={ifsc} onChange={e => setIfsc(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            {lbl('UPI ID')}
            <input value={upiId} onChange={e => setUpiId(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            {lbl('Intro Video')}
            <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.text3, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Short video introducing yourself ( mp4 , max 50mb )</p>
            <input
              type="file"
              accept="video/*"
              onChange={e => setIntroVideo(e.target.files?.[0] ?? null)}
              style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.text, padding: '8px 10px', fontSize: 12, fontFamily: T.fontSans, letterSpacing: '-0.02em', cursor: 'pointer', boxSizing: 'border-box' as const }}
            />
            {introVideo && <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.positive, margin: '4px 0 0' }}>{introVideo.name}</p>}
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
            {lbl('Permanent Address')}
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'none' as const }} />
          </div>

          <div>
            {lbl('Residing City')}
            <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle()} />
          </div>

          {globalError && <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.negative, margin: 0, letterSpacing: '-0.02em' }}>{globalError}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? T.surface : T.invertBg, color: loading ? T.textMuted : T.invertText, border: 'none', fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8 }}>
            {loading ? 'Creating Account' : 'Create Account'}
          </button>

          <button onClick={onSwitch} style={{ background: 'transparent', border: 'none', color: T.text3, fontFamily: T.fontSans, fontSize: 11, letterSpacing: '-0.04em', textTransform: 'uppercase' as const, cursor: 'pointer', padding: '4px 0', textAlign: 'left' as const }}>
            Already have an account → Sign in
          </button>

        </div>
      </div>
    </div>
  )
}