interface Props {
  value: number
  max?: number
  color?: string
  height?: number
}

export function ProgressBar({ value, max = 100, color = '#9d4edd', height = 4 }: Props) {
  const pct = Math.min(100, (value / max) * 100)
  const c = pct > 90 ? '#ff4757' : pct > 74 ? '#ffb347' : color
  return (
    <div style={{ height, background: '#1e1e1e', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: height, boxShadow: `0 0 6px ${c}55`, transition: 'width 550ms cubic-bezier(.4,0,.2,1)' }}/>
    </div>
  )
}
