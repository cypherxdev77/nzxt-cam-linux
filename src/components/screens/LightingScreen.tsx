import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Card } from '../ui/Card'
import { Dropdown } from '../ui/Dropdown'
import { Slider } from '../ui/Slider'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { api, RingMode, RingChannel, RingSpeed } from '../../lib/api'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

const RING_MODES = [
  { id: 'off',          label: 'Off',          hasColor: false, hasSpeed: false },
  { id: 'fixed',        label: 'Fixed',         hasColor: true,  hasSpeed: false },
  { id: 'breathing',    label: 'Breathing',     hasColor: true,  hasSpeed: true  },
  { id: 'pulse',        label: 'Pulse',         hasColor: true,  hasSpeed: true  },
  { id: 'spectrumWave', label: 'Spectrum',       hasColor: false, hasSpeed: true  },
  { id: 'rainbowFlow',  label: 'Rainbow Flow',  hasColor: false, hasSpeed: true  },
  { id: 'rainbowPulse', label: 'Rainbow Pulse', hasColor: false, hasSpeed: true  },
  { id: 'superRainbow', label: 'Super Rainbow', hasColor: false, hasSpeed: true  },
  { id: 'marquee',      label: 'Marquee',       hasColor: true,  hasSpeed: true  },
]

const SPEEDS: { id: RingSpeed; label: string }[] = [
  { id: 'slowest', label: 'Très lent' }, { id: 'slower', label: 'Lent' },
  { id: 'normal',  label: 'Normal'    }, { id: 'faster', label: 'Rapide' },
  { id: 'fastest', label: 'Max'       },
]

const CHANNELS: { id: RingChannel; label: string; hint: string }[] = [
  { id: 'ch01', label: 'Ring AIO',     hint: 'Ring autour du LCD' },
  { id: 'ch02', label: 'Ventilateurs', hint: 'Fans / accessoires' },
  { id: 'ch07', label: 'Tout',         hint: 'Tous les canaux'    },
]

const SWATCHES = ['#9d4edd', '#00e87a', '#ff4757', '#ffb347', '#00bcd4', '#ff6b9d', '#ffffff', '#00d4ff']

// Ring around LCD visualization
function RingIcon({ color, size = 42 }: { color: string; size?: number }) {
  const cx = size / 2, r = size / 2 - 4
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r - 4} fill="#111" stroke="#1a1a1a" strokeWidth="1"/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="5" opacity="0.18"/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="2.5"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }}/>
      <circle cx={cx} cy={cx} r={r - 10} fill="#0a0a0a" stroke="#222" strokeWidth="1"/>
      <text x={cx} y={cx + 3} textAnchor="middle" fill="#333" fontSize="6" fontFamily="Manrope,sans-serif" fontWeight="700">LCD</text>
    </svg>
  )
}

// Spinning fan
function FanIcon({ color, size = 42 }: { color: string; size?: number }) {
  return (
    <>
      <style>{`@keyframes fan-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox="0 0 42 42"
          style={{ animation: 'fan-spin 1.4s linear infinite', transformOrigin: '50% 50%' }}>
          {/* hub */}
          <circle cx="21" cy="21" r="4" fill={color} opacity="0.9"/>
          <circle cx="21" cy="21" r="2" fill="#111"/>
          {/* 3 blades at 0°, 120°, 240° */}
          {[0, 120, 240].map(deg => {
            const rad = (deg - 90) * Math.PI / 180
            const bx = 21 + 11 * Math.cos(rad), by = 21 + 11 * Math.sin(rad)
            const tx1 = 21 + 7 * Math.cos(rad - 0.55), ty1 = 21 + 7 * Math.sin(rad - 0.55)
            const tx2 = 21 + 7 * Math.cos(rad + 0.55), ty2 = 21 + 7 * Math.sin(rad + 0.55)
            return (
              <path key={deg}
                d={`M21,21 L${tx1.toFixed(1)},${ty1.toFixed(1)} Q${bx.toFixed(1)},${by.toFixed(1)} ${tx2.toFixed(1)},${ty2.toFixed(1)} Z`}
                fill={color} opacity="0.85"
                style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}
              />
            )
          })}
        </svg>
      </div>
    </>
  )
}

function ColorSwatch({ color, selected, onSelect }: { color: string; selected: boolean; onSelect: (c: string) => void }) {
  return (
    <div onClick={() => onSelect(color)} style={{
      width: 22, height: 22, borderRadius: 4, background: color, cursor: 'pointer',
      border: `2px solid ${selected ? '#fff' : 'transparent'}`,
      boxShadow: selected ? `0 0 8px ${color}` : 'none',
      transition: 'all 140ms',
    }}/>
  )
}

function BrightnessRow({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', border: '1px solid #444' }}/>
      <div style={{ flex: 1 }}><Slider value={value} min={0} max={100} onChange={onChange} color={accent}/></div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      </svg>
    </div>
  )
}

function RingDeviceRow({ name, sub, isFan, accent }: {
  name: string; sub: string; isFan?: boolean; accent: string
}) {
  const { state } = useApp()
  const connected = state.deviceStatus.connected

  const [channel, setChannel] = useState<RingChannel>(isFan ? 'ch02' : 'ch01')
  const [effect, setEffect] = useState('fixed')
  const [color, setColor] = useState(accent)
  const [brightness, setBrightness] = useState(80)
  const [speed, setSpeed] = useState<RingSpeed>('normal')
  const [sync, setSync] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastApplied, setLastApplied] = useState(false)

  const modeDef = RING_MODES.find(m => m.id === effect)!

  const buildMode = (): RingMode => {
    const [r, g, b] = hexToRgb(color)
    switch (effect) {
      case 'fixed':        return { mode: 'fixed', r, g, b }
      case 'breathing':    return { mode: 'breathing', r, g, b, speed }
      case 'pulse':        return { mode: 'pulse', r, g, b, speed }
      case 'spectrumWave': return { mode: 'spectrumWave', speed }
      case 'rainbowFlow':  return { mode: 'rainbowFlow', speed }
      case 'rainbowPulse': return { mode: 'rainbowPulse', speed }
      case 'superRainbow': return { mode: 'superRainbow', speed }
      case 'marquee':      return { mode: 'marquee', r, g, b, speed }
      default:             return { mode: 'off' }
    }
  }

  const handleApply = async () => {
    if (!connected || sending) return
    setSending(true)
    try {
      await api.sendRing(buildMode(), channel)
      setLastApplied(true)
      setTimeout(() => setLastApplied(false), 2000)
    } finally {
      setSending(false)
    }
  }

  const displayColor = effect === 'off' ? '#333' : modeDef.hasColor ? color : '#9d4edd'

  return (
    <div style={{ borderBottom: '1px solid #1c1c1c', paddingBottom: 18, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        {/* Device visualization */}
        <div style={{ flexShrink: 0 }}>
          {isFan
            ? <FanIcon color={displayColor} size={42}/>
            : <RingIcon color={displayColor} size={42}/>
          }
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8e8e8' }}>{name}</div>
          <div style={{ fontSize: 10, color: '#484848', marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ width: 120 }}>
          <BrightnessRow value={brightness} onChange={setBrightness} accent={accent}/>
        </div>
        <Dropdown
          value={CHANNELS.find(c => c.id === channel)?.label ?? ''}
          options={CHANNELS.map(c => c.label)}
          onChange={v => setChannel(CHANNELS.find(c => c.label === v)?.id ?? 'ch02')}
          width={140} small accent={accent}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#484848' }}>Sync</span>
          <ToggleSwitch on={sync} onChange={setSync} size="sm" color={accent}/>
        </div>
      </div>

      <div style={{ paddingLeft: 56, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {RING_MODES.map(m => (
            <div key={m.id} onClick={() => setEffect(m.id)} style={{
              padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600,
              background: effect === m.id ? `${accent}22` : '#1c1c1c',
              color: effect === m.id ? accent : '#555',
              border: `1px solid ${effect === m.id ? `${accent}55` : '#2a2a2a'}`,
              transition: 'all 130ms',
            }}>{m.label}</div>
          ))}
        </div>

        {modeDef.hasColor && (
          <div style={{ display: 'flex', gap: 8 }}>
            {SWATCHES.map(c => <ColorSwatch key={c} color={c} selected={c === color} onSelect={setColor}/>)}
          </div>
        )}

        {modeDef.hasSpeed && (
          <div style={{ display: 'flex', gap: 5 }}>
            {SPEEDS.map(s => (
              <div key={s.id} onClick={() => setSpeed(s.id)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                background: speed === s.id ? `${accent}22` : '#1c1c1c',
                color: speed === s.id ? accent : '#555',
                border: `1px solid ${speed === s.id ? `${accent}55` : '#2a2a2a'}`,
                transition: 'all 130ms',
              }}>{s.label}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleApply} disabled={!connected || sending} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: connected ? accent : '#252525', border: 'none',
            color: connected ? '#fff' : '#555',
            borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 700,
            cursor: connected ? 'pointer' : 'not-allowed',
            boxShadow: connected ? `0 0 12px ${accent}44` : 'none', transition: 'all 140ms',
          }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            {sending ? 'Envoi…' : 'Appliquer'}
          </button>
          {lastApplied && <span style={{ fontSize: 11, color: '#00e87a' }}>Appliqué</span>}
          {!connected && <span style={{ fontSize: 11, color: '#ffb347' }}>Device non connecté</span>}
        </div>
      </div>
    </div>
  )
}

export function LightingScreen() {
  const { state } = useApp()
  const { accent } = state
  const [autoSync, setAutoSync] = useState(true)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Lighting</div>

      <Card style={{ padding: '18px 20px' }} accent={accent}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.2px' }}>
              {state.deviceStatus.connected ? state.deviceStatus.productName : 'Kraken Elite V2'}
            </div>
            <div style={{ fontSize: 10, color: state.deviceStatus.connected ? '#00e87a' : '#484848', marginTop: 2 }}>
              {state.deviceStatus.connected ? 'Connecté' : 'Non connecté'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#555' }}>RGB Auto Sync</span>
            <ToggleSwitch on={autoSync} onChange={setAutoSync} color={accent}/>
          </div>
        </div>

        <RingDeviceRow name="Ring AIO"     sub="Canal 1 · Ring autour du LCD" isFan={false} accent={accent}/>
        <RingDeviceRow name="Ventilateurs" sub="Canal 2 · Fans externes"      isFan={true}  accent={accent}/>
      </Card>
    </div>
  )
}
