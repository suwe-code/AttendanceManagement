export const T = {
  bg: '#0d0d0d',
  surface: '#1a1a1a',
  elevated: '#222222',
  border: '#2a2a2a',
  divider: '#1f1f1f',
  text: '#ffffff',
  text2: '#9a9a9a',
  text3: '#6b6b6b',
  textMuted: '#4a4a4a',
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#e8e8e8',
  invertBg: '#ffffff',
  invertText: '#0a0a0a',
  fontSans: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontMono: "'JetBrains Mono', 'Menlo', 'Monaco', monospace",
}

export const caps = (color = T.text2): React.CSSProperties => ({
  fontFamily: T.fontSans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '-0.04em',
  textTransform: 'uppercase',
  color,
  margin: 0
})

export const mono = (size = 13, color = T.text): React.CSSProperties => ({
  fontFamily: T.fontMono,
  fontSize: size,
  fontWeight: 500,
  letterSpacing: '-0.02em',
  color,
  margin: 0
})

export const bodyText = (color = T.text): React.CSSProperties => ({
  fontFamily: T.fontSans,
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: '-0.02em',
  color,
  margin: 0
})
