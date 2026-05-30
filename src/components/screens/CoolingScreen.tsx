import { useRef, useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useApp } from '../../context/AppContext'
import { CircularGauge } from '../ui/CircularGauge'
import { Card } from '../ui/Card'
import { Dropdown } from '../ui/Dropdown'

interface FanPoint { t: number; s: number }

// ── Shared helpers ───────────────────────────────────────────────────────────

function interpDuty(pts: FanPoint[], temp: number): number {
  if (pts.length === 0) return 30
  if (temp <= pts[0].t) return pts[0].s
  if (temp >= pts[pts.length - 1].t) return pts[pts.length - 1].s
  for (let i = 0; i < pts.length - 1; i++) {
    const { t: t0, s: s0 } = pts[i]
    const { t: t1, s: s1 } = pts[i + 1]
    if (temp >= t0 && temp <= t1) {
      if (t1 === t0) return s0
      const r = (temp - t0) / (t1 - t0)
      return Math.round(s0 + r * (s1 - s0))
    }
  }
  return pts[pts.length - 1].s
}

function ProfileButton({ label, color, active, onClick }: { id: string; label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
      background: active ? color + '18' : 'transparent',
      border: `1px solid ${active ? color + '66' : '#232323'}`,
      color: active ? color : '#484848',
      transition: 'all 160ms', letterSpacing: '0.2px',
    }}>{label}</button>
  )
}

function FanCurveChart({ chartId, tempSource, currentTemp, accent, pts, onChange, editable }: {
  chartId: string; tempSource: string; currentTemp: number; accent: string
  pts: FanPoint[]; onChange?: (pts: FanPoint[]) => void; editable: boolean
}) {
  const W = 2000, H = 300
  const PAD = { t: 16, r: 20, b: 44, l: 56 }
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b

  const tX = (t: number) => PAD.l + ((t - 10) / 90) * PW
  const sY = (s: number) => PAD.t + (1 - Math.max(0, Math.min(100, s)) / 100) * PH
  const xT = (x: number) => Math.max(10, Math.min(100, 10 + ((x - PAD.l) / PW) * 90))
  const yS = (y: number) => Math.max(0, Math.min(100, (1 - (y - PAD.t) / PH) * 100))

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
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (drag === null || !editable || !onChange) return
    const { x, y } = getSVGPos(e)
    const next = [...pts]
    next[drag] = { t: Math.round(xT(x)), s: Math.round(yS(y)) }
    onChange(next.sort((a, b) => a.t - b.t))
  }

  const curveColor = editable ? accent : '#00e87a'
  const TICKS_T = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const TICKS_S = [0, 25, 50, 75, 100]
  const curX = tX(currentTemp)
  const gradId = `grad-${chartId}`
  const clipId = `clip-${chartId}`

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
        {tempSource}: <span style={{ color: curveColor }}>{Math.round(currentTemp)}°</span>
        {!editable && <span style={{ color: '#2a2a2a', marginLeft: 10, fontSize: 10 }}>(read-only — preset profile)</span>}
        {editable && <span style={{ color: '#2a2a2a', marginLeft: 10, fontSize: 10 }}>glissez les points pour modifier</span>}
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible', cursor: drag !== null ? 'grabbing' : 'default' }}
        onMouseMove={onMouseMove} onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={curveColor} stopOpacity="0.14"/>
            <stop offset="100%" stopColor={curveColor} stopOpacity="0.01"/>
          </linearGradient>
          <clipPath id={clipId}><rect x={PAD.l} y={PAD.t} width={PW} height={PH}/></clipPath>
        </defs>
        {TICKS_S.map(s => (
          <g key={s}>
            <line x1={PAD.l} y1={sY(s)} x2={PAD.l + PW} y2={sY(s)} stroke="#1a1a1a" strokeWidth="1.5"/>
            <text x={PAD.l - 8} y={sY(s)} textAnchor="end" dominantBaseline="middle" fill="#404040" fontSize="11" fontFamily="JetBrains Mono, monospace">{s}%</text>
          </g>
        ))}
        {TICKS_T.map(t => (
          <g key={t}>
            <line x1={tX(t)} y1={PAD.t} x2={tX(t)} y2={PAD.t + PH} stroke="#181818" strokeWidth="1.5"/>
            <text x={tX(t)} y={PAD.t + PH + 20} textAnchor="middle" fill="#404040" fontSize="11" fontFamily="JetBrains Mono, monospace">{t}°</text>
          </g>
        ))}
        <path d={areaPath()} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`}/>
        <path d={curvePath()} fill="none" stroke={curveColor} strokeWidth="2" strokeLinecap="round" clipPath={`url(#${clipId})`}
          style={{ filter: `drop-shadow(0 0 4px ${curveColor}66)` }}/>
        <line x1={curX} y1={PAD.t} x2={curX} y2={PAD.t + PH} stroke={accent} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.55"/>
        <text x={curX + 6} y={PAD.t + 14} fill={accent} fontSize="11" fontFamily="JetBrains Mono, monospace" opacity="0.7">{Math.round(currentTemp)}°</text>
        {pts.map((p, i) => {
          const sx = tX(p.t), sy = sY(p.s), active = hov === i || drag === i
          return (
            <circle key={i} cx={sx} cy={sy} r={active ? 6 : 4} fill={curveColor}
              stroke={active ? '#fff' : curveColor} strokeWidth={active ? 1.5 : 0}
              style={{ cursor: editable ? 'grab' : 'default', filter: active ? `drop-shadow(0 0 6px ${curveColor}cc)` : 'none', transition: 'r 100ms' }}
              onMouseDown={e => { if (!editable) return; e.preventDefault(); setDrag(i) }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => { if (drag === null) setHov(null) }}
            />
          )
        })}
      </svg>
    </div>
  )
}

// ── Pump profiles ────────────────────────────────────────────────────────────

type ProfileId = 'auto' | 'silent' | 'balanced' | 'performance' | 'turbo' | 'manual'

const PROFILES: Record<Exclude<ProfileId, 'auto' | 'manual'>, { label: string; color: string; pts: FanPoint[] }> = {
  silent:      { label: 'Silencieux',   color: '#4fc3f7', pts: [{ t: 20, s: 20 }, { t: 30, s: 22 }, { t: 40, s: 25 }, { t: 50, s: 32 }, { t: 60, s: 42 }, { t: 70, s: 55 }, { t: 80, s: 65 }] },
  balanced:    { label: 'Balanced',    color: '#00e87a', pts: [{ t: 20, s: 25 }, { t: 30, s: 26 }, { t: 40, s: 30 }, { t: 50, s: 47 }, { t: 60, s: 65 }, { t: 70, s: 80 }] },
  performance: { label: 'Performance',  color: '#ffb347', pts: [{ t: 20, s: 35 }, { t: 30, s: 40 }, { t: 40, s: 50 }, { t: 50, s: 65 }, { t: 60, s: 80 }, { t: 70, s: 95 }, { t: 80, s: 100 }] },
  turbo:       { label: 'Turbo',        color: '#ff4757', pts: [{ t: 20, s: 60 }, { t: 30, s: 70 }, { t: 40, s: 80 }, { t: 50, s: 90 }, { t: 60, s: 100 }] },
}

// ── GPU fan section ──────────────────────────────────────────────────────────

interface GpuFanStatus {
  hwmonPath: string
  rpm: number
  duty: number
  gpuTemp: number
  controllable: boolean
}

type GpuProfileId = 'auto' | 'silent' | 'balanced' | 'performance' | 'turbo' | 'manual'

const GPU_PROFILES: Record<Exclude<GpuProfileId, 'auto' | 'manual'>, { label: string; color: string; pts: FanPoint[] }> = {
  silent:      { label: 'Silencieux',  color: '#4fc3f7', pts: [{ t: 30, s: 0 }, { t: 50, s: 20 }, { t: 60, s: 30 }, { t: 70, s: 45 }, { t: 80, s: 60 }, { t: 90, s: 80 }] },
  balanced:    { label: 'Balanced',   color: '#00e87a', pts: [{ t: 30, s: 20 }, { t: 50, s: 30 }, { t: 60, s: 45 }, { t: 70, s: 60 }, { t: 80, s: 80 }, { t: 90, s: 100 }] },
  performance: { label: 'Performance', color: '#ffb347', pts: [{ t: 30, s: 35 }, { t: 50, s: 50 }, { t: 60, s: 65 }, { t: 70, s: 80 }, { t: 80, s: 95 }, { t: 90, s: 100 }] },
  turbo:       { label: 'Turbo',       color: '#ff4757', pts: [{ t: 30, s: 60 }, { t: 50, s: 75 }, { t: 60, s: 85 }, { t: 70, s: 95 }, { t: 80, s: 100 }] },
}

function GpuFanSection({ accent }: { accent: string }) {
  const [status, setStatus] = useState<GpuFanStatus | null>(null)
  const [profile, setProfile] = useState<GpuProfileId>('auto')
  const [manualPts, setManualPts] = useState<FanPoint[]>([
    { t: 30, s: 20 }, { t: 50, s: 35 }, { t: 60, s: 50 }, { t: 70, s: 65 }, { t: 80, s: 85 }, { t: 90, s: 100 },
  ])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<GpuFanStatus | null>('get_gpu_fan_status').then(setStatus).catch(() => {})
    const t = setInterval(() => {
      invoke<GpuFanStatus | null>('get_gpu_fan_status').then(setStatus).catch(() => {})
    }, 1500)
    return () => clearInterval(t)
  }, [])

  const applyProfile = (p: GpuProfileId, pts?: FanPoint[]) => {
    if (p === 'auto') {
      invoke('set_gpu_fan_auto').then(() => setError(null)).catch(e => setError(String(e)))
    } else {
      const curve = p === 'manual' ? (pts ?? manualPts) : GPU_PROFILES[p as Exclude<GpuProfileId, 'auto' | 'manual'>].pts
      invoke('set_gpu_fan_curve', { points: curve }).then(() => setError(null)).catch(e => setError(String(e)))
    }
  }

  const handleProfileClick = (p: GpuProfileId) => { setProfile(p); applyProfile(p) }
  const handleManualCurve = (pts: FanPoint[]) => { setManualPts(pts); applyProfile('manual', pts) }

  const activePts = profile === 'manual' ? manualPts
    : profile === 'auto' ? GPU_PROFILES.balanced.pts
    : GPU_PROFILES[profile as Exclude<GpuProfileId, 'auto' | 'manual'>].pts

  const curveColor = profile === 'auto' ? '#484848'
    : profile === 'manual' ? accent
    : GPU_PROFILES[profile as Exclude<GpuProfileId, 'auto' | 'manual'>].color

  if (!status) return null

  return (
    <Card style={{ padding: '16px 20px', border: `1px solid #2a2020` }} glow={false} accent={accent}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0' }}>RX 6700 XT — Ventilateurs GPU</div>
          <div style={{ fontSize: 10, color: '#383838', marginTop: 3 }}>Control via hwmon · GPU temp source</div>
          {error && <div style={{ fontSize: 10, color: '#ff4757', marginTop: 4 }}>{error}</div>}
          {!status.controllable && !error && (
            <div style={{ fontSize: 10, color: '#ff9800', marginTop: 4 }}>
              Missing udev rule — re-run <code>install.sh</code> with sudo then reboot
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#f0f0f0' }}>{status.rpm} <span style={{ fontSize: 10, color: '#484848' }}>RPM</span></div>
          <div style={{ fontSize: 10, color: '#484848', marginTop: 2 }}>{status.duty}% · {Math.round(status.gpuTemp)}°C</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <ProfileButton id="auto" label="Auto" color="#484848" active={profile === 'auto'} onClick={() => handleProfileClick('auto')}/>
        {(Object.entries(GPU_PROFILES) as [Exclude<GpuProfileId, 'auto' | 'manual'>, typeof GPU_PROFILES[keyof typeof GPU_PROFILES]][]).map(([id, p]) => (
          <ProfileButton key={id} id={id} label={p.label} color={p.color} active={profile === id} onClick={() => handleProfileClick(id)}/>
        ))}
        <ProfileButton id="manual" label="Manuel" color={accent} active={profile === 'manual'} onClick={() => handleProfileClick('manual')}/>
      </div>

      {profile !== 'auto' && (
        <FanCurveChart
          chartId="gpu"
          tempSource="GPU"
          currentTemp={status.gpuTemp}
          accent={curveColor}
          pts={activePts}
          onChange={handleManualCurve}
          editable={profile === 'manual'}
        />
      )}
    </Card>
  )
}

// ── Case fan section ─────────────────────────────────────────────────────────

interface FanChannel {
  id: string
  label: string
  hwmonPath: string
  pwmIndex: number
  rpm: number
  duty: number
  auto: boolean
  controllable: boolean
}

type CaseFanProfileId = 'auto' | 'silent' | 'balanced' | 'performance' | 'turbo' | 'manual'

const CASE_PROFILES: Record<Exclude<CaseFanProfileId, 'auto' | 'manual'>, { label: string; color: string; pts: FanPoint[] }> = {
  silent:      { label: 'Silencieux',  color: '#4fc3f7', pts: [{ t: 30, s: 0 }, { t: 40, s: 20 }, { t: 50, s: 30 }, { t: 60, s: 45 }, { t: 70, s: 65 }, { t: 80, s: 85 }] },
  balanced:    { label: 'Balanced',   color: '#00e87a', pts: [{ t: 30, s: 20 }, { t: 40, s: 30 }, { t: 50, s: 45 }, { t: 60, s: 60 }, { t: 70, s: 80 }, { t: 80, s: 100 }] },
  performance: { label: 'Performance', color: '#ffb347', pts: [{ t: 30, s: 35 }, { t: 40, s: 50 }, { t: 50, s: 65 }, { t: 60, s: 80 }, { t: 70, s: 95 }, { t: 80, s: 100 }] },
  turbo:       { label: 'Turbo',       color: '#ff4757', pts: [{ t: 30, s: 60 }, { t: 40, s: 75 }, { t: 50, s: 85 }, { t: 60, s: 95 }, { t: 70, s: 100 }] },
}

function CaseFanSection({ accent }: { accent: string }) {
  const { state } = useApp()
  const [channels, setChannels] = useState<FanChannel[]>([])
  const [profile, setProfile] = useState<CaseFanProfileId>('balanced')
  const [manualPts, setManualPts] = useState<FanPoint[]>([
    { t: 30, s: 20 }, { t: 40, s: 30 }, { t: 50, s: 45 }, { t: 60, s: 60 }, { t: 70, s: 80 }, { t: 80, s: 100 },
  ])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<FanChannel[]>('list_fan_channels').then(chs => setChannels(chs)).catch(() => {})
    const t = setInterval(() => {
      invoke<FanChannel[]>('read_fan_channels').then(chs => setChannels(chs)).catch(() => {})
    }, 2000)
    return () => clearInterval(t)
  }, [])

  // Apply curve to all controllable channels on temp changes
  useEffect(() => {
    if (profile === 'auto' || channels.length === 0) return
    const curve = profile === 'manual' ? manualPts : CASE_PROFILES[profile as Exclude<CaseFanProfileId, 'auto' | 'manual'>].pts
    const duty = interpDuty(curve, state.temperatures.cpu)
    channels.filter(ch => ch.controllable).forEach(ch => {
      invoke('set_fan_duty_cmd', { args: { hwmonPath: ch.hwmonPath, pwmIndex: ch.pwmIndex, duty } }).catch(() => {})
    })
  }, [state.temperatures.cpu, profile, manualPts, channels])

  const handleProfileClick = (p: CaseFanProfileId) => {
    setProfile(p)
    const controllable = channels.filter(ch => ch.controllable)
    if (p === 'auto') {
      controllable.forEach(ch => {
        invoke('set_fan_auto_cmd', { args: { hwmonPath: ch.hwmonPath, pwmIndex: ch.pwmIndex } })
          .then(() => setError(null)).catch(e => setError(String(e)))
      })
    } else {
      const curve = CASE_PROFILES[p as Exclude<CaseFanProfileId, 'auto' | 'manual'>]?.pts ?? manualPts
      const duty = interpDuty(curve, state.temperatures.cpu)
      controllable.forEach(ch => {
        invoke('set_fan_duty_cmd', { args: { hwmonPath: ch.hwmonPath, pwmIndex: ch.pwmIndex, duty } })
          .then(() => setError(null)).catch(e => setError(String(e)))
      })
    }
  }

  const handleManualCurve = (pts: FanPoint[]) => {
    setManualPts(pts)
    const duty = interpDuty(pts, state.temperatures.cpu)
    channels.filter(ch => ch.controllable).forEach(ch => {
      invoke('set_fan_duty_cmd', { args: { hwmonPath: ch.hwmonPath, pwmIndex: ch.pwmIndex, duty } })
        .then(() => setError(null)).catch(e => setError(String(e)))
    })
  }

  const activePts = profile === 'manual' ? manualPts
    : profile === 'auto' ? CASE_PROFILES.balanced.pts
    : CASE_PROFILES[profile as Exclude<CaseFanProfileId, 'auto' | 'manual'>].pts

  const curveColor = profile === 'auto' ? '#484848'
    : profile === 'manual' ? accent
    : CASE_PROFILES[profile as Exclude<CaseFanProfileId, 'auto' | 'manual'>].color

  const controllableCount = channels.filter(ch => ch.controllable).length

  return (
    <Card style={{ padding: '16px 20px', border: `1px solid #1a2020` }} glow={false} accent={accent}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0' }}>Case Fans</div>
          <div style={{ fontSize: 10, color: '#383838', marginTop: 3 }}>
            Control via hwmon · CPU temp source
            {channels.length > 0 && ` · ${channels.length} channel${channels.length > 1 ? 's' : ''} detected`}
          </div>
          {error && <div style={{ fontSize: 10, color: '#ff4757', marginTop: 4 }}>{error}</div>}
          {channels.length > 0 && controllableCount === 0 && !error && (
            <div style={{ fontSize: 10, color: '#ff9800', marginTop: 4 }}>
              Missing udev rule — re-run <code>install.sh</code> with sudo then reboot
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {channels.slice(0, 4).map(ch => (
            <div key={ch.id} style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>
                {ch.rpm} <span style={{ fontSize: 10, color: '#484848' }}>RPM</span>
              </div>
              <div style={{ fontSize: 9, color: '#484848', marginTop: 1 }}>
                {ch.label.includes('—') ? ch.label.split('—')[1].trim() : ch.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {channels.length === 0 ? (
        <div style={{ fontSize: 11, color: '#383838', padding: '4px 0 8px' }}>
          No fans detected via hwmon
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <ProfileButton id="auto" label="Auto" color="#484848" active={profile === 'auto'} onClick={() => handleProfileClick('auto')}/>
            {(Object.entries(CASE_PROFILES) as [Exclude<CaseFanProfileId, 'auto' | 'manual'>, typeof CASE_PROFILES[keyof typeof CASE_PROFILES]][]).map(([id, p]) => (
              <ProfileButton key={id} id={id} label={p.label} color={p.color} active={profile === id} onClick={() => handleProfileClick(id)}/>
            ))}
            <ProfileButton id="manual" label="Manuel" color={accent} active={profile === 'manual'} onClick={() => handleProfileClick('manual')}/>
          </div>

          {profile !== 'auto' && (
            <FanCurveChart
              chartId="case"
              tempSource="CPU"
              currentTemp={state.temperatures.cpu}
              accent={curveColor}
              pts={activePts}
              onChange={handleManualCurve}
              editable={profile === 'manual'}
            />
          )}
        </>
      )}
    </Card>
  )
}

// ── Temperature / pump cards ─────────────────────────────────────────────────

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

function PumpCard({ rpm, accent }: { rpm: number; accent: string }) {
  const MAX_RPM = 3200
  const pct = Math.min(rpm / MAX_RPM, 1) * 100
  const color = pct > 85 ? '#ff4757' : pct > 65 ? '#ffb347' : accent
  return (
    <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 700 }}>Pump</div>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <CircularGauge value={pct} max={100} size={90} stroke={8} color={color}/>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#f0f0f0', lineHeight: 1 }}>{rpm}</span>
          <span style={{ fontSize: 9, color: '#484848', marginTop: 3 }}>RPM</span>
        </div>
      </div>
    </Card>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────

export function CoolingScreen() {
  const { state } = useApp()
  const { temperatures, tempUnit, accent, deviceStatus } = state
  const [profile, setProfile] = useState<ProfileId>('balanced')
  const [tempSource, setTempSource] = useState('Liquid')
  const [manualPts, setManualPts] = useState<FanPoint[]>([
    { t: 20, s: 25 }, { t: 30, s: 26 }, { t: 40, s: 30 }, { t: 50, s: 47 }, { t: 60, s: 65 }, { t: 70, s: 80 },
  ])

  const currentTemp = tempSource === 'CPU' ? temperatures.cpu : temperatures.liquid
  const activePts = profile === 'manual' ? manualPts
    : profile === 'auto' ? PROFILES.balanced.pts
    : PROFILES[profile as Exclude<ProfileId, 'auto' | 'manual'>].pts

  const applyProfile = (pts: FanPoint[]) => {
    invoke('set_pump_profile', { points: pts }).catch(console.error)
  }

  useEffect(() => {
    if (profile !== 'auto') applyProfile(activePts)
  }, [profile])

  const handleManualChange = (pts: FanPoint[]) => {
    setManualPts(pts)
    applyProfile(pts)
  }

  const pumpCurveColor = profile === 'auto' ? '#484848'
    : profile === 'manual' ? accent
    : PROFILES[profile as Exclude<ProfileId, 'auto' | 'manual'>].color

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Cooling</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <TempCard label="CPU"    value={temperatures.cpu}    tempUnit={tempUnit} accent={accent}/>
        <TempCard label="GPU"    value={temperatures.gpu}    tempUnit={tempUnit} accent={accent}/>
        <TempCard label="Liquid" value={temperatures.liquid} tempUnit={tempUnit} accent={accent}/>
        <PumpCard rpm={temperatures.pumpRpm} accent={accent}/>
      </div>

      {/* Watercooling Kraken — Pompe */}
      <Card style={{ padding: '16px 20px', border: `1px solid ${accent}44`, boxShadow: `0 0 24px ${accent}10` }} glow={false} accent={accent}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0' }}>
              {deviceStatus.connected ? deviceStatus.productName : 'Kraken Elite V2'} — Pompe
            </div>
            <div style={{ fontSize: 10, color: '#383838', marginTop: 3 }}>Watercooling · contrôle CPU &amp; liquide</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#f0f0f0' }}>{temperatures.pumpRpm}</span>
            <span style={{ fontSize: 10, color: '#484848' }}>RPM</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <ProfileButton id="auto" label="Auto" color="#484848" active={profile === 'auto'} onClick={() => setProfile('auto')}/>
          {(Object.entries(PROFILES) as [Exclude<ProfileId, 'auto' | 'manual'>, typeof PROFILES[keyof typeof PROFILES]][]).map(([id, p]) => (
            <ProfileButton key={id} id={id} label={p.label} color={p.color} active={profile === id} onClick={() => setProfile(id)}/>
          ))}
          <ProfileButton id="manual" label="Manuel" color={accent} active={profile === 'manual'} onClick={() => setProfile('manual')}/>
        </div>

        {profile !== 'auto' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: '#484848' }}>Source</span>
              <Dropdown value={tempSource} options={['Liquid', 'CPU']} onChange={setTempSource} width={100} small accent={accent}/>
              {profile !== 'manual' && (
                <span style={{ fontSize: 10, color: '#2e2e2e', marginLeft: 4 }}>Switch to Manual mode to edit the curve</span>
              )}
            </div>
            <FanCurveChart
              chartId="pump"
              tempSource={tempSource}
              currentTemp={currentTemp}
              accent={pumpCurveColor}
              pts={activePts}
              onChange={handleManualChange}
              editable={profile === 'manual'}
            />
          </>
        )}
      </Card>

      <GpuFanSection accent={accent}/>
      <CaseFanSection accent={accent}/>

      {/* GPU — info séparée */}
      <Card style={{ padding: '14px 20px' }} glow={false} accent={accent}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#484848" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#686868' }}>GPU — Independent fans</div>
            <div style={{ fontSize: 10, color: '#303030', marginTop: 3 }}>
              The GPU has its own fans managed by the graphics driver. They are not part of the Kraken watercooling circuit and cannot be controlled here.
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#555' }}>
              {tempUnit === '°F' ? Math.round(temperatures.gpu * 9/5 + 32) : Math.round(temperatures.gpu)}
              <span style={{ fontSize: 10, color: '#383838', marginLeft: 3 }}>{tempUnit === '°F' ? '°F' : '°C'}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
