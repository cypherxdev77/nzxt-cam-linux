interface Props {
  accent?: string
  size?: number
}

export function LogoMark({ accent = '#9d4edd', size = 36 }: Props) {
  const S = size, C = S / 2

  const hex = (r: number, offset = 0) =>
    [...Array(6)].map((_, i) => {
      const a = (Math.PI / 3) * i + offset
      return `${(C + r * Math.cos(a)).toFixed(2)},${(C + r * Math.sin(a)).toFixed(2)}`
    }).join(' ')

  const outerR = C - 2
  const innerR = C * 0.52
  const dotR = C * 0.18

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  ;[0, 60, 120].forEach(deg => {
    const rad = deg * Math.PI / 180
    const x1 = C + innerR * Math.cos(rad), y1 = C + innerR * Math.sin(rad)
    const x2 = C - innerR * Math.cos(rad), y2 = C - innerR * Math.sin(rad)
    const bLen = innerR * 0.32
    const bRad = rad + Math.PI / 2
    ;[{ px: x1, py: y1 }, { px: x2, py: y2 }].forEach(({ px, py }) => {
      const frac = 0.35
      const mx = px + (C - px) * frac, my = py + (C - py) * frac
      lines.push(
        { x1: mx + bLen * 0.55 * Math.cos(bRad), y1: my + bLen * 0.55 * Math.sin(bRad), x2: mx - bLen * 0.55 * Math.cos(bRad), y2: my - bLen * 0.55 * Math.sin(bRad) }
      )
    })
  })

  const mainLines = [0, 60, 120].map(deg => {
    const rad = deg * Math.PI / 180
    return {
      x1: C + innerR * Math.cos(rad), y1: C + innerR * Math.sin(rad),
      x2: C - innerR * Math.cos(rad), y2: C - innerR * Math.sin(rad),
    }
  })

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <radialGradient id="lgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0.06"/>
        </radialGradient>
        <filter id="lgGlow">
          <feGaussianBlur stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <polygon points={hex(outerR, Math.PI / 6)} fill="url(#lgGrad)" stroke={accent} strokeWidth="1.2" opacity="0.9"
        style={{ filter: `drop-shadow(0 0 4px ${accent}66)` }}/>
      <g style={{ transformOrigin: `${C}px ${C}px`, animation: 'logoSpin 10s linear infinite' }}>
        {mainLines.map((l, i) => (
          <line key={i} x1={l.x1.toFixed(2)} y1={l.y1.toFixed(2)} x2={l.x2.toFixed(2)} y2={l.y2.toFixed(2)}
            stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.85" filter="url(#lgGlow)"/>
        ))}
        {lines.map((l, i) => (
          <line key={`t${i}`} x1={l.x1.toFixed(2)} y1={l.y1.toFixed(2)} x2={l.x2.toFixed(2)} y2={l.y2.toFixed(2)}
            stroke={accent} strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
        ))}
      </g>
      <circle cx={C} cy={C} r={dotR} fill={accent}
        style={{ filter: `drop-shadow(0 0 5px ${accent})`, animation: 'logoPulse 2.4s ease-in-out infinite' }}/>
      {hex(outerR, Math.PI / 6).split(' ').map((pt, i) => {
        const [x, y] = pt.split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r="1.2" fill={accent} opacity="0.6"/>
      })}
    </svg>
  )
}
