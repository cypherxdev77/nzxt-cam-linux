interface Props {
  value: number
  max?: number
  size?: number
  stroke?: number
  color?: string
}

export function CircularGauge({ value = 0, max = 100, size = 120, stroke = 10, color = '#9d4edd' }: Props) {
  const c = size / 2
  const r = c - stroke - 3

  const p2c = (deg: number) => {
    const rad = (deg - 90) * Math.PI / 180
    return { x: +(c + r * Math.cos(rad)).toFixed(3), y: +(c + r * Math.sin(rad)).toFixed(3) }
  }

  const arcD = (a1: number, a2: number) => {
    const s = p2c(a1), e = p2c(a2)
    const large = (a2 - a1) > 180 ? 1 : 0
    return `M${s.x},${s.y} A${r},${r} 0 ${large},1 ${e.x},${e.y}`
  }

  const S = 225, R = 270
  const pct = Math.min(Math.max(value / max, 0), 1)
  const endAngle = S + pct * R
  const gid = `cgg${color.replace('#', '').slice(0, 4)}${size}`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <filter id={gid}>
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d={arcD(S, S + R)} fill="none" stroke="#1d1d1d" strokeWidth={stroke} strokeLinecap="round"/>
      {pct > 0.003 && (
        <path
          d={arcD(S, endAngle)}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color}99)`, transition: 'all 550ms cubic-bezier(.4,0,.2,1)' }}
        />
      )}
    </svg>
  )
}
