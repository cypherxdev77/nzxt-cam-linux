import { useState, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { LCDCircularPreview } from '../ui/LCDCircularPreview'
import { Dropdown } from '../ui/Dropdown'
import { Card } from '../ui/Card'
import { api } from '../../lib/api'
import {
  DisplayConfig, MetricId, METRIC_LABELS, PRESETS,
  makeGauge, makeBar, makeText,
} from '@shared/display'

type VizType = 'gauge' | 'ring' | 'linear' | 'none'

const BG_COLORS   = ['#ffffff', '#888888', '#1a1a2e', '#000000']
const LOGO_COLORS = ['#ffffff', '#9d4edd', '#00e87a', '#ffb347', '#ff4757']
const VIZ_COLORS  = ['#9d4edd', '#00e87a', '#ff4757', '#ffb347', '#00bcd4', '#ff6b9d']
const NUM_COLORS  = ['#ffffff', '#9d4edd', '#00e87a', '#ffb347', '#ff4757']
const TXT_COLORS  = ['#ffffff', '#9d4edd', '#00e87a', '#ffb347', '#ff4757']
const VIZ_TYPES: { id: VizType; label: string }[] = [
  { id: 'gauge',  label: 'Gauge'  },
  { id: 'ring',   label: 'Ring'   },
  { id: 'linear', label: 'Linear' },
  { id: 'none',   label: 'None'   },
]
const METRIC_OPTIONS: { id: MetricId; label: string }[] = [
  { id: 'liquid', label: 'Liquid Temperature' },
  { id: 'cpu',    label: 'CPU Temperature'    },
  { id: 'gpu',    label: 'GPU Temperature'    },
  { id: 'pump',   label: 'Pump Speed'         },
]

interface Settings {
  bg:            string
  showLogo:      boolean
  logoColor:     string
  showViz:       boolean
  vizType:       VizType
  vizColor:      string
  primaryMetric: MetricId
  numberColor:   string
  textColor:     string
}

const DEFAULT: Settings = {
  bg: '#000000', showLogo: true, logoColor: '#ffffff',
  showViz: true, vizType: 'gauge', vizColor: '#9d4edd',
  primaryMetric: 'liquid', numberColor: '#ffffff', textColor: '#ffffff',
}

function buildConfig(s: Settings): DisplayConfig {
  const elements = []
  if (s.showViz && s.vizType !== 'none') {
    if (s.vizType === 'gauge') {
      elements.push(makeGauge(s.primaryMetric, { radius: 290, thickness: 46, color: s.vizColor, startAngle: -45, sweep: 270, showValue: false, showLabel: false }))
    } else if (s.vizType === 'ring') {
      elements.push(makeGauge(s.primaryMetric, { radius: 290, thickness: 46, color: s.vizColor, startAngle: 0, sweep: 360, showValue: false, showLabel: false }))
    } else if (s.vizType === 'linear') {
      elements.push(makeBar(s.primaryMetric, { x: 320, y: 500, color: s.vizColor }))
    }
  }
  if (s.showLogo) elements.push(makeText('NZXT', { x: 320, y: 210, size: 40, color: s.logoColor }))
  elements.push(makeText(`{${s.primaryMetric}}°`, { x: 320, y: 340, size: 96, color: s.numberColor }))
  elements.push(makeText(METRIC_LABELS[s.primaryMetric].toUpperCase(), { x: 320, y: 420, size: 24, color: s.textColor }))
  return { background: s.bg, elements }
}

function Swatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      width: 22, height: 22, borderRadius: 5, background: color, cursor: 'pointer',
      border: `2px solid ${selected ? '#fff' : 'transparent'}`,
      boxShadow: selected ? `0 0 7px ${color}99` : 'none',
      outline: color === '#ffffff' ? '1px solid #2a2a2a' : 'none',
      transition: 'all 120ms',
    }}/>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 28 }}>
      <div style={{ fontSize: 12, color: '#a0a0a0', fontWeight: 500, minWidth: 88 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function CheckRow({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 28 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', minWidth: 88 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ width: 14, height: 14, accentColor: '#9d4edd', cursor: 'pointer' }}/>
        <span style={{ fontSize: 12, color: '#a0a0a0', fontWeight: 500 }}>{label}</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', opacity: checked ? 1 : 0.35, transition: 'opacity 150ms', pointerEvents: checked ? 'auto' : 'none' }}>{children}</div>
    </div>
  )
}

export function TempDisplayConfig() {
  const { state } = useApp()
  const { accent, temperatures, deviceStatus } = state
  const [s, setS] = useState<Settings>(DEFAULT)
  const [status, setStatus] = useState<'idle' | 'applying' | 'done' | 'error'>('idle')

  const upd = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(prev => ({ ...prev, [k]: v }))

  const metricTemp = (() => {
    switch (s.primaryMetric) {
      case 'cpu': return temperatures.cpu
      case 'gpu': return temperatures.gpu
      case 'liquid': return temperatures.liquid
      default: return temperatures.liquid
    }
  })()

  const metricLabel = METRIC_OPTIONS.find(m => m.id === s.primaryMetric)?.label ?? s.primaryMetric

  const apply = useCallback(async () => {
    setStatus('applying')
    try {
      await api.saveDisplayConfig(buildConfig(s))
      const res = await api.startTempMode()
      setStatus(res?.success === false ? 'error' : 'done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch { setStatus('error') }
  }, [s])

  const loadPreset = useCallback(async (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId)
    if (!preset) return
    setStatus('applying')
    try {
      await api.saveDisplayConfig(preset.build())
      await api.startTempMode()
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch { setStatus('error') }
  }, [])

  const connected = deviceStatus.connected

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 18, alignItems: 'start' }}>
      {/* Left: settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Presets row */}
        <Card style={{ padding: '12px 16px' }} accent={accent}>
          <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, fontWeight: 700 }}>Modèles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => loadPreset(p.id)} title={p.description} style={{
                padding: '4px 11px', borderRadius: 6, border: '1px solid #252525',
                background: '#111', color: '#666', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 130ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}55`; (e.currentTarget as HTMLButtonElement).style.color = accent }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#252525'; (e.currentTarget as HTMLButtonElement).style.color = '#666' }}
              >{p.name}</button>
            ))}
          </div>
        </Card>

        {/* Display settings */}
        <Card style={{ padding: '16px 18px' }} accent={accent}>
          <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, fontWeight: 700 }}>Display Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <CheckRow label="Background" checked={true} onChange={() => {}}>
              {BG_COLORS.map(c => <Swatch key={c} color={c} selected={s.bg === c} onClick={() => upd('bg', c)}/>)}
            </CheckRow>

            <CheckRow label="Logo" checked={s.showLogo} onChange={v => upd('showLogo', v)}>
              {LOGO_COLORS.map(c => <Swatch key={c} color={c} selected={s.logoColor === c} onClick={() => upd('logoColor', c)}/>)}
            </CheckRow>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <CheckRow label="Visualization" checked={s.showViz} onChange={v => upd('showViz', v)}>
                {VIZ_COLORS.map(c => <Swatch key={c} color={c} selected={s.vizColor === c} onClick={() => upd('vizColor', c)}/>)}
              </CheckRow>
              <div style={{ paddingLeft: 100, display: 'flex', gap: 5, opacity: s.showViz ? 1 : 0.35, pointerEvents: s.showViz ? 'auto' : 'none', transition: 'opacity 150ms' }}>
                {VIZ_TYPES.map(({ id, label }) => (
                  <button key={id} onClick={() => upd('vizType', id)} style={{
                    padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${s.vizType === id ? `${accent}55` : '#252525'}`,
                    background: s.vizType === id ? `${accent}18` : '#111',
                    color: s.vizType === id ? accent : '#555',
                    transition: 'all 120ms',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: '#1c1c1c', margin: '2px 0' }}/>

            <Row label="Primary Reading">
              <Dropdown
                value={metricLabel}
                options={METRIC_OPTIONS.map(m => m.label)}
                onChange={v => { const m = METRIC_OPTIONS.find(o => o.label === v); if (m) upd('primaryMetric', m.id) }}
                width={200} small accent={accent}
              />
            </Row>

            <div style={{ height: 1, background: '#1c1c1c', margin: '2px 0' }}/>

            <Row label="Number">
              {NUM_COLORS.map(c => <Swatch key={c} color={c} selected={s.numberColor === c} onClick={() => upd('numberColor', c)}/>)}
            </Row>

            <Row label="Text">
              {TXT_COLORS.map(c => <Swatch key={c} color={c} selected={s.textColor === c} onClick={() => upd('textColor', c)}/>)}
            </Row>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={apply} disabled={!connected || status === 'applying'} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: connected ? accent : '#252525',
              border: 'none', color: connected ? '#fff' : '#444',
              borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700,
              cursor: connected ? 'pointer' : 'not-allowed',
              boxShadow: connected ? `0 0 14px ${accent}44` : 'none',
              transition: 'all 140ms',
            }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {status === 'applying' ? 'Sending…' : status === 'done' ? 'Applied ✓' : status === 'error' ? 'Error' : 'Apply to LCD'}
            </button>

            <button onClick={() => {}} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, border: '1px solid #252525',
              background: 'transparent', color: '#555', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 130ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a3a'; (e.currentTarget as HTMLButtonElement).style.color = '#888' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#252525'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Rotate display
            </button>

            {!connected && <span style={{ fontSize: 11, color: '#ffb347' }}>Device non connecté</span>}
          </div>
        </Card>
      </div>

      {/* Right: preview + info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} accent={accent}>
          <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Live Preview</div>
          <LCDCircularPreview
            temp={metricTemp}
            source={METRIC_LABELS[s.primaryMetric]}
            showLogo={s.showLogo}
            color={s.showViz ? s.vizColor : undefined}
          />
          <div style={{ fontSize: 10, color: '#2e2e2e', fontFamily: 'JetBrains Mono, monospace' }}>480 × 480 px · 60 fps</div>
        </Card>

        <Card style={{ padding: 16 }} accent={accent}>
          <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 12, fontWeight: 700 }}>Display Info</div>
          {[
            { label: 'Resolution', val: '480 × 480' },
            { label: 'Interface',  val: 'USB Direct' },
            { label: 'Brightness', val: '100%' },
            { label: 'Rotation',   val: '0°' },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#484848' }}>{label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#888' }}>{val}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
