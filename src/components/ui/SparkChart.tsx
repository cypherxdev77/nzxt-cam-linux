interface Props {
  data: number[]
  color?: string
  height?: number
  uid: string
}

export function SparkChart({ data = [], color = '#9d4edd', height = 44, uid = 'a' }: Props) {
  if (data.length < 2) return null
  const W = 200, H = height
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - (Math.max(0, Math.min(v, 100)) / 100) * H,
  ])
  const line = pts.map(([x, y], i) => `${i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`}`).join('')
  const area = `${line} L${W},${H} L0,${H} Z`
  const gid = `sg_${uid}`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
