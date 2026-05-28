interface Props {
  on: boolean
  onChange: (v: boolean) => void
  color?: string
  size?: 'sm' | 'md'
}

export function ToggleSwitch({ on, onChange, color = '#9d4edd', size = 'md' }: Props) {
  const W = size === 'sm' ? 30 : 38, H = size === 'sm' ? 18 : 22, B = size === 'sm' ? 12 : 16
  return (
    <div onClick={() => onChange(!on)} style={{
      width: W, height: H, borderRadius: H / 2, background: on ? color : '#252525',
      position: 'relative', cursor: 'pointer', flexShrink: 0,
      transition: 'background 160ms ease',
      boxShadow: on ? `0 0 10px ${color}55` : 'none',
    }}>
      <div style={{
        position: 'absolute', top: (H - B) / 2,
        left: on ? W - B - (H - B) / 2 : (H - B) / 2,
        width: B, height: B, borderRadius: '50%', background: '#fff',
        transition: 'left 160ms cubic-bezier(.4,0,.2,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
      }}/>
    </div>
  )
}
