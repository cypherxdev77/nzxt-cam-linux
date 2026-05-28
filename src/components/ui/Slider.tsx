interface Props {
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  color?: string
}

export function Slider({ value, min = 0, max = 100, onChange, color = '#9d4edd' }: Props) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{
          width: '100%',
          background: `linear-gradient(to right, ${color} ${pct}%, #252525 ${pct}%)`,
        }}
      />
    </div>
  )
}
