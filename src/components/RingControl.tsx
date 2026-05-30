import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { api, RingMode, RingChannel, RingSpeed } from '../lib/api'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

type ModeDef = {
  id: string
  label: string
  hasColor: boolean
  hasMultiColor: boolean
  hasSpeed: boolean
  description: string
}

const MODES: ModeDef[] = [
  { id: 'off',          label: 'Off',         hasColor: false, hasMultiColor: false, hasSpeed: false, description: 'LEDs off' },
  { id: 'fixed',        label: 'Fixe',          hasColor: true,  hasMultiColor: false, hasSpeed: false, description: 'Couleur statique' },
  { id: 'breathing',    label: 'Respiration',   hasColor: true,  hasMultiColor: false, hasSpeed: true,  description: 'Fondu doux' },
  { id: 'pulse',        label: 'Pulse',         hasColor: true,  hasMultiColor: false, hasSpeed: true,  description: 'Flash rapide' },
  { id: 'fading',       label: 'Fading',       hasColor: false, hasMultiColor: true,  hasSpeed: true,  description: 'Multi-color transition' },
  { id: 'spectrumWave', label: 'Spectre',        hasColor: false, hasMultiColor: false, hasSpeed: true,  description: 'Auto rainbow' },
  { id: 'rainbowFlow',  label: 'Rainbow Flow',  hasColor: false, hasMultiColor: false, hasSpeed: true,  description: 'Flowing rainbow' },
  { id: 'rainbowPulse', label: 'Rainbow Pulse', hasColor: false, hasMultiColor: false, hasSpeed: true,  description: 'Pulsing rainbow' },
  { id: 'superRainbow', label: 'Super Rainbow', hasColor: false, hasMultiColor: false, hasSpeed: true,  description: 'Super rainbow' },
  { id: 'marquee',      label: 'Marquee',       hasColor: true,  hasMultiColor: false, hasSpeed: true,  description: 'Couleur tournante' },
  { id: 'staryNight',   label: 'Étoiles',       hasColor: true,  hasMultiColor: false, hasSpeed: true,  description: 'Scintillement' },
]

const SPEEDS: { id: RingSpeed; label: string }[] = [
  { id: 'slowest', label: 'Slowest' },
  { id: 'slower',  label: 'Lent' },
  { id: 'normal',  label: 'Normal' },
  { id: 'faster',  label: 'Rapide' },
  { id: 'fastest', label: 'Max' },
]

type ChannelDef = {
  id: RingChannel
  icon: string
  label: string
  hint: string
}

const CHANNELS: ChannelDef[] = [
  { id: 'ch01', icon: '⭕', label: 'Ring AIO',     hint: 'Channel 0x01 — ring around the LCD' },
  { id: 'ch02', icon: '🌀', label: 'Ventilateurs', hint: 'Channel 0x02 — fans / external accessories' },
  { id: 'ch07', icon: '🔆', label: 'Tout',          hint: 'Channel 0x07 — all channels at once' },
]

const SWATCHES = [
  '#00d4ff', '#00ff88', '#ff3232', '#ff8c00',
  '#ffffff', '#b400ff', '#ff00aa', '#ffff00',
]

export function RingControl() {
  const { state } = useApp()
  const connected = state.deviceStatus.connected

  const [channel, setChannel] = useState<RingChannel>('ch02')
  const [selectedMode, setSelectedMode] = useState('fixed')
  const [color, setColor] = useState('#00d4ff')
  const [speed, setSpeed] = useState<RingSpeed>('normal')
  const [multiColors, setMultiColors] = useState<string[]>(['#00d4ff', '#ff3232'])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSent, setLastSent] = useState<{ channel: RingChannel; mode: string } | null>(null)

  const modeDef = MODES.find((m) => m.id === selectedMode)!

  const buildRingMode = (): RingMode => {
    const [r, g, b] = hexToRgb(color)
    switch (selectedMode) {
      case 'off':          return { mode: 'off' }
      case 'fixed':        return { mode: 'fixed', r, g, b }
      case 'breathing':    return { mode: 'breathing', r, g, b, speed }
      case 'pulse':        return { mode: 'pulse', r, g, b, speed }
      case 'fading':       return { mode: 'fading', colors: multiColors.map(hexToRgb), speed }
      case 'spectrumWave': return { mode: 'spectrumWave', speed }
      case 'rainbowFlow':  return { mode: 'rainbowFlow', speed }
      case 'rainbowPulse': return { mode: 'rainbowPulse', speed }
      case 'superRainbow': return { mode: 'superRainbow', speed }
      case 'marquee':      return { mode: 'marquee', r, g, b, speed }
      case 'staryNight':   return { mode: 'staryNight', r, g, b, speed }
      default:             return { mode: 'off' }
    }
  }

  const handleApply = async () => {
    if (!connected || sending) return
    setSending(true)
    setError(null)
    try {
      const result = await api.sendRing(buildRingMode(), channel)
      if (!result.success) setError(result.error ?? 'Unknown error')
      else setLastSent({ channel, mode: selectedMode })
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setSending(false)
    }
  }

  const addColor = () => setMultiColors((c) => [...c, '#ffffff'].slice(0, 8))
  const removeColor = (i: number) => setMultiColors((c) => c.filter((_, j) => j !== i))
  const updateColor = (i: number, hex: string) =>
    setMultiColors((c) => c.map((v, j) => (j === i ? hex : v)))

  return (
    <div className="flex flex-col gap-5 max-w-xl">

      {/* Channel selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Cible LED</p>
        <div className="grid grid-cols-4 gap-2">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              title={ch.hint}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all ${
                channel === ch.id
                  ? 'bg-[#00d4ff] text-[#0a0a0f] shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                  : 'bg-[#111118] text-gray-400 border border-[#1e1e2e] hover:border-[#00d4ff44] hover:text-gray-200'
              }`}
            >
              <span className="text-xl">{ch.icon}</span>
              <span>{ch.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          {CHANNELS.find((c) => c.id === channel)?.hint}
        </p>
        {channel === 'ch01' && (
          <p className="text-xs text-yellow-500/80 mt-1">
            Try ⭕ Ring AIO for the white ring around the LCD screen
          </p>
        )}
      </div>

      {/* Mode grid */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Animation</p>
        <div className="grid grid-cols-4 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              title={m.description}
              className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-center ${
                selectedMode === m.id
                  ? 'bg-[#00d4ff] text-[#0a0a0f] shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                  : 'bg-[#111118] text-gray-400 border border-[#1e1e2e] hover:border-[#00d4ff44] hover:text-gray-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1.5">{modeDef.description}</p>
      </div>

      {/* Single color */}
      {modeDef.hasColor && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Color</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                onClick={() => setColor(hex)}
                className={`w-9 h-9 rounded-xl transition-all ${
                  color === hex
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0a0a0f] scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-12 rounded-xl cursor-pointer border-2 border-[#1e1e2e] bg-transparent p-0.5"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => {
                if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setColor(e.target.value)
              }}
              className="w-32 bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm font-mono text-gray-300 focus:outline-none focus:border-[#00d4ff]"
            />
            <div className="w-8 h-8 rounded-lg border border-[#1e1e2e]" style={{ backgroundColor: color }} />
          </div>
        </div>
      )}

      {/* Multi-color (Fading) */}
      {modeDef.hasMultiColor && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">
            Colors ({multiColors.length}/8)
          </p>
          <div className="flex flex-col gap-2">
            {multiColors.map((hex, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => updateColor(i, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-[#1e1e2e] bg-transparent p-0.5"
                />
                <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: hex }} />
                {multiColors.length > 2 && (
                  <button
                    onClick={() => removeColor(i)}
                    className="text-gray-600 hover:text-red-400 text-xl leading-none transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {multiColors.length < 8 && (
              <button
                onClick={addColor}
                className="text-xs text-[#00d4ff] hover:text-white transition-colors mt-1 text-left"
              >
                + Ajouter une couleur
              </button>
            )}
          </div>
        </div>
      )}

      {/* Speed */}
      {modeDef.hasSpeed && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Vitesse</p>
          <div className="flex gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSpeed(s.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  speed === s.id
                    ? 'bg-[#00d4ff] text-[#0a0a0f]'
                    : 'bg-[#111118] text-gray-400 border border-[#1e1e2e] hover:border-[#00d4ff44] hover:text-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Apply */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleApply}
          disabled={!connected || sending}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all bg-[#00d4ff] text-[#0a0a0f] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,212,255,0.3)]"
        >
          {sending ? 'Sending...' : '💡 Apply'}
        </button>
        {lastSent && !error && (
          <span className="text-xs text-green-400">
            ✓ {CHANNELS.find((c) => c.id === lastSent.channel)?.label} — {MODES.find((m) => m.id === lastSent.mode)?.label}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-red-400 text-xs">
          {error}
        </div>
      )}

      {!connected && (
        <p className="text-yellow-500 text-xs">Device not connected</p>
      )}
    </div>
  )
}
