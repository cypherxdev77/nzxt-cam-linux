import { useState } from 'react'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
  glow?: boolean
  noBorder?: boolean
  accent?: string
}

export function Card({ children, style = {}, glow = true, noBorder, accent = '#9d4edd' }: Props) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => glow && setHov(true)}
      onMouseLeave={() => glow && setHov(false)}
      style={{
        background: '#161616', borderRadius: 10,
        border: noBorder ? 'none' : `1px solid ${hov ? `${accent}55` : '#232323'}`,
        boxShadow: hov ? `0 0 30px ${accent}0a` : 'none',
        transition: 'border-color 200ms, box-shadow 200ms',
        ...style,
      }}
    >{children}</div>
  )
}
