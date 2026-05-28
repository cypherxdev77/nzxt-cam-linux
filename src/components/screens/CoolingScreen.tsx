import { useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { CircularGauge } from '../ui/CircularGauge'
import { Card } from '../ui/Card'
import { Dropdown } from '../ui/Dropdown'
function TempCard({ label, value, tempUnit, accent }: { label: string; value: number; tempUnit: string; accent: string }) {
  const pct = Math.min(value / 100, 1) * 100
  const color = value > 75 ? '#ff4757' : value > 55 ? '#ffb347' : value > 40 ? accent : '#00e87a'
  const disp = tempUnit === '°F' ? Math.round(value * 9 / 5 + 32) : Math.round(value)
  const unit = tempUnit === '°F' ? '°F' : '°C'
  return (
    <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 700 }}>{label}</div>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <CircularGauge value={pct} max={100} size={90} stroke={8} color={color}/>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#f0f0f0', lineHeight: 1 }}>{disp}</span>
          <span style={{ fontSize: 9, color: '#484848', marginTop: 3 }}>{unit}</span>
        </div>
      </div>
    </Card>
  )
}

interface FanPoint { t: number; s: number }

function FanCurveChart({ tempSource, currentTemp, accent }: { tempSource: string; currentTemp: number; accent: string }) {
  const W = 520, H = 210
  const PAD = { t: 14, r: 16, b: 38, l: 48 }
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b

  const tX = (t: number) => PAD.l + ((t - 10) / 90) * PW
  const sY = (s: number) => PAD.t + (1 - Math.max(0, Math.min(100, s)) / 100) * PH
  const xT = (x: number) => Math.max(10, Math.min(100, 10 + ((x - PAD.l) / PW) * 90))
  const yS = (y: number) => Math.max(0, Math.min(100, (1 - (y - PAD.t) / PH) * 100))

  const [pts, setPts] = useState<FanPoint[]>([
    { t: 20, s: 25 }, { t: 30, s: 26 }, { t: 40, s: 30 }, { t: 50, s: 47 },
    { t: 60, s: 65 }, { t: 70, s: 80 },
  ])
  const [drag, setDrag] = useState<number | null>(null)
  const [hov, setHov] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const svgPts = pts.map(p => ({ x: tX(p.t), y: sY(p.s) }))

  const curvePath = () => {
    if (svgPts.length < 2) return ''
    let d = `M${svgPts[0].x},${svgPts[0].y}`
    for (let i = 0; i < svgPts.length - 1; i++) {
      const p0 = svgPts[Math.max(0, i - 1)], p1 = svgPts[i], p2 = svgPts[i + 1], p3 = svgPts[Math.min(svgPts.length - 1, i + 2)]
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
    }
    return d
  }
  const areaPath = () => {
    const c = curvePath(); if (!c) return ''
    const last = svgPts[svgPts.length - 1], first = svgPts[0]
    return `${c} L${last.x},${sY(0)} L${first.x},${sY(0)} Z`
  }

  const getSVGPos = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const sx = W / rect.width, sy = H / rect.height
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (drag === null) return
    const { x, y } = getSVGPos(e)
    setPts(prev => {
      const next = [...prev]
      next[drag] = { t: Math.round(xT(x)), s: Math.round(yS(y)) }
      return next.sort((a, b) => a.t - b.t)
    })
  }

  const TICKS_T = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const TICKS_S = [0, 25, 50, 75, 100]
  const curX = tX(currentTemp)

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
        {tempSource}: <span style={{ color: '#00e87a' }}>{Math.round(currentTemp)}°</span>
        <span style={{ color: '#2a2a2a', marginLeft: 10, fontSize: 10 }}>(visualisation — pas de contrôle ventilateur disponible)</span>
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', cursor: drag !== null ? 'grabbing' : 'default' }}
        onMouseMove={onMouseMove} onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}>
        <defs>
          <linearGradient id="fccGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e87a" stopOpacity="0.14"/>
            <stop offset="100%" stopColor="#00e87a" stopOpacity="0.01"/>
          </linearGradient>
          <clipPath id="fccClip"><rect x={PAD.l} y={PAD.t} width={PW} height={PH}/></clipPath>
        </defs>
        {TICKS_S.map(s => (
          <g key={s}>
            <line x1={PAD.l} y1={sY(s)} x2={PAD.l + PW} y2={sY(s)} stroke="#1a1a1a" strokeWidth="1"/>
            <text x={PAD.l - 6} y={sY(s)} textAnchor="end" dominantBaseline="middle" fill="#404040" fontSize="9" fontFamily="JetBrains Mono, monospace">{s}%</text>
          </g>
        ))}
        {TICKS_T.map(t => (
          <g key={t}>
            <line x1={tX(t)} y1={PAD.t} x2={tX(t)} y2={PAD.t + PH} stroke="#181818" strokeWidth="1"/>
            <text x={tX(t)} y={PAD.t + PH + 18} textAnchor="middle" fill="#404040" fontSize="9" fontFamily="JetBrains Mono, monospace">{t}°</text>
          </g>
        ))}
        <path d={areaPath()} fill="url(#fccGrad)" clipPath="url(#fccClip)"/>
        <path d={curvePath()} fill="none" stroke="#00e87a" strokeWidth="2" strokeLinecap="round" clipPath="url(#fccClip)"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,232,122,0.5))' }}/>
        <line x1={curX} y1={PAD.t} x2={curX} y2={PAD.t + PH} stroke={accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.55"/>
        <text x={curX + 4} y={PAD.t + 4} fill={accent} fontSize="8" fontFamily="JetBrains Mono, monospace" opacity="0.7">{Math.round(currentTemp)}°</text>
        {pts.map((p, i) => {
          const sx = tX(p.t), sy = sY(p.s), active = hov === i || drag === i
          return (
            <circle key={i} cx={sx} cy={sy} r={active ? 7 : 5.5} fill="#00e87a" stroke={active ? '#fff' : '#00e87a'} strokeWidth={active ? 1.5 : 0}
              style={{ cursor: 'grab', filter: active ? 'drop-shadow(0 0 7px rgba(0,232,122,0.9))' : 'none', transition: 'r 100ms' }}
              onMouseDown={e => { e.preventDefault(); setDrag(i) }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => { if (drag === null) setHov(null) }}
            />
          )
        })}
      </svg>
    </div>
  )
}

export function CoolingScreen() {
  const { state } = useApp()
  const { temperatures, tempUnit, accent, deviceStatus } = state
  const [tempSource, setTempSource] = useState('Liquid')

  const currentTemp = tempSource === 'CPU' ? temperatures.cpu : tempSource === 'GPU' ? temperatures.gpu : temperatures.liquid

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Cooling</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <TempCard label="CPU"    value={temperatures.cpu}    tempUnit={tempUnit} accent={accent}/>
        <TempCard label="GPU"    value={temperatures.gpu}    tempUnit={tempUnit} accent={accent}/>
        <TempCard label="Liquid" value={temperatures.liquid} tempUnit={tempUnit} accent={accent}/>
        <TempCard label="Pump"   value={Math.min(100, (temperatures.pumpRpm / 3000) * 100)} tempUnit={tempUnit} accent={accent}/>
      </div>

      <Card style={{ padding: '16px 20px', border: `1px solid ${accent}55`, boxShadow: `0 0 24px ${accent}12` }} glow={false} accent={accent}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.2px' }}>
            {deviceStatus.connected ? deviceStatus.productName : 'Kraken Elite V2'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #1c1c1c' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e8e8e8' }}>Pump</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#f0f0f0' }}>{temperatures.pumpRpm}</span>
            <span style={{ fontSize: 10, color: '#555', marginLeft: 3 }}>RPM</span>
          </div>
          <div style={{ background: '#1c1c1c', border: '1px solid #2c2c2c', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }}/>
            Liquid
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#555' }}>Source de température</span>
            <Dropdown value={tempSource} options={['Liquid', 'CPU', 'GPU']} onChange={setTempSource} width={110} small accent={accent}/>
          </div>
          <FanCurveChart tempSource={tempSource} currentTemp={currentTemp} accent={accent}/>
        </div>
      </Card>
    </div>
  )
}
