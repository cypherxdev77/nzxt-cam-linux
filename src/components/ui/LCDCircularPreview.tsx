interface Props {
  temp: number
  source: string
  showLogo?: boolean
  color?: string
}

export function LCDCircularPreview({ temp, source, showLogo = true, color }: Props) {
  const SZ = 200, cx = 100, cy = 100, outerR = 90, gaugeR = 72, gW = 14
  const pct = Math.min(temp / 100, 1)
  const arcColor = color ?? (temp > 70 ? '#ff4757' : temp > 50 ? '#ffb347' : temp < 35 ? '#00e87a' : '#9d4edd')

  const p2c = (deg: number, r: number) => {
    const rad = (deg - 90) * Math.PI / 180
    return { x: +(cx + r * Math.cos(rad)).toFixed(2), y: +(cy + r * Math.sin(rad)).toFixed(2) }
  }
  const arc = (a1: number, a2: number, r: number) => {
    const s = p2c(a1, r), e = p2c(a2, r)
    return `M${s.x},${s.y} A${r},${r} 0 ${(a2 - a1) > 180 ? 1 : 0},1 ${e.x},${e.y}`
  }
  const S = 225, R = 270
  const progressEnd = S + pct * R

  return (
    <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`}>
      <circle cx={cx} cy={cy} r={outerR} fill="#060606"/>
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#111" strokeWidth="2"/>
      <path d={arc(S, S + R, gaugeR)} fill="none" stroke="#181818" strokeWidth={gW} strokeLinecap="round"/>
      {pct > 0.005 && (
        <path d={arc(S, progressEnd, gaugeR)} fill="none" stroke={arcColor} strokeWidth={gW} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${arcColor}88)`, transition: 'all 600ms ease' }}/>
      )}
      {pct > 0.01 && pct < 0.99 && (() => {
        const ep = p2c(progressEnd, gaugeR)
        return <circle cx={ep.x} cy={ep.y} r="4" fill="#fff" style={{ filter: `drop-shadow(0 0 4px ${arcColor})` }}/>
      })()}
      {showLogo && <text x={cx} y={cy - 22} textAnchor="middle" fill="#fff" fontSize="11" fontFamily="Manrope, sans-serif" fontWeight="800" letterSpacing="2">NZXT</text>}
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#fff" fontSize="34" fontFamily="JetBrains Mono, monospace" fontWeight="700">{Math.round(temp)}°</text>
      <text x={cx} y={cy + 34} textAnchor="middle" fill="#555" fontSize="11" fontFamily="Manrope, sans-serif">{source}</text>
    </svg>
  )
}
