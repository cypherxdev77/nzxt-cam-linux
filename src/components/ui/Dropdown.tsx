import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  options: string[]
  onChange: (v: string) => void
  width?: number | string
  small?: boolean
  accent?: string
}

export function Dropdown({ value, options, onChange, width = 160, small, accent = '#9d4edd' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  const h = small ? '28px' : '34px'
  const fs = small ? 12 : 13
  return (
    <div ref={ref} style={{ position: 'relative', width, flexShrink: 0 }}>
      <div onClick={() => setOpen(o => !o)} style={{
        background: '#1c1c1c', border: `1px solid ${open ? accent : '#2c2c2c'}`,
        borderRadius: 6, height: h, padding: `0 28px 0 10px`,
        cursor: 'pointer', fontSize: fs, color: '#ddd',
        display: 'flex', alignItems: 'center',
        position: 'relative', userSelect: 'none', transition: 'border-color 140ms',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <span style={{
          position: 'absolute', right: 9, top: '50%',
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          transition: 'transform 140ms', color: '#555', fontSize: 9, lineHeight: 1,
        }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#1c1c1c', border: '1px solid #2c2c2c', borderRadius: 8, padding: 4,
          zIndex: 400, boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
          animation: 'ddFadeIn 130ms ease',
        }}>
          {options.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false) }} style={{
              padding: '8px 10px', borderRadius: 5, cursor: 'pointer', fontSize: fs,
              color: opt === value ? accent : '#b8b8b8',
              background: opt === value ? `${accent}1a` : 'transparent',
              transition: 'background 80ms',
            }}
              onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  )
}
