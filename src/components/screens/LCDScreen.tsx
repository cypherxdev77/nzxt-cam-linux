import { useApp } from '../../context/AppContext'
import { Card } from '../ui/Card'
import { LCDCircularPreview } from '../ui/LCDCircularPreview'
import { MediaUploader } from '../MediaUploader'
import { TempDisplayConfig } from '../display/TempDisplayConfig'
import { LCDPreview } from '../LCDPreview'
import { api } from '../../lib/api'
import { useState } from 'react'
import { Temperatures } from '../../lib/api'

function LivePreview({ applied, temperatures }: {
  applied: { mode: 'image' | 'gif' | 'temperatures'; url?: string } | null
  temperatures: Temperatures
}) {
  if (!applied) {
    return (
      <div style={{
        width: 200, height: 200, borderRadius: '50%', background: '#080808',
        border: '1px solid #1e1e1e', boxShadow: '0 0 0 4px #111, 0 0 0 5px #1a1a1a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#252525" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span style={{ fontSize: 10, color: '#252525', fontWeight: 500 }}>Not found</span>
      </div>
    )
  }

  if (applied.mode === 'temperatures') {
    return <LCDCircularPreview temp={temperatures.liquid} source="Liquid" showLogo={true}/>
  }

  if (applied.url) {
    return (
      <div style={{
        width: 200, height: 200, borderRadius: '50%', overflow: 'hidden',
        border: '1px solid #1e1e1e', boxShadow: '0 0 0 4px #111, 0 0 0 5px #1a1a1a',
      }}>
        <img src={applied.url} alt="LCD" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
      </div>
    )
  }

  return (
    <div style={{
      width: 200, height: 200, borderRadius: '50%', background: '#080808',
      border: '1px solid #1e1e1e', boxShadow: '0 0 0 4px #111, 0 0 0 5px #1a1a1a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 10, color: '#252525' }}>Not found</span>
    </div>
  )
}

const IImage = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
)
const IGif = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M10 9v6M6 9h4M14 9v6h3M17 12h-3"/>
  </svg>
)
const IThermo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
)

const MODES = [
  { id: 'image',        label: 'Image',        Icon: IImage  },
  { id: 'gif',          label: 'GIF',           Icon: IGif    },
  { id: 'temperatures', label: 'Temperatures',  Icon: IThermo },
] as const

export function LCDScreen() {
  const { state, dispatch } = useApp()
  const { accent, temperatures, currentMode, deviceStatus } = state
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const handleApply = async () => {
    if (!deviceStatus.connected || applying) return
    setApplying(true)
    try {
      if (currentMode === 'temperatures') {
        await api.startTempMode()
        dispatch({ type: 'SET_LCD_APPLIED', payload: { mode: 'temperatures' } })
      } else if (currentMode === 'image' && state.currentImagePath) {
        await api.sendImage(state.currentImagePath)
        dispatch({ type: 'SET_LCD_APPLIED', payload: { mode: 'image', url: state.imagePreviewUrl ?? undefined } })
      } else if (currentMode === 'gif' && state.currentGifPath) {
        await api.sendGif(state.currentGifPath)
        dispatch({ type: 'SET_LCD_APPLIED', payload: { mode: 'gif', url: state.gifPreviewUrl ?? undefined } })
      }
      setApplied(true)
      setTimeout(() => setApplied(false), 3000)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>LCD Display</div>

      <div style={{ display: 'grid', gridTemplateColumns: currentMode === 'temperatures' ? '1fr' : '1fr 260px', gap: 18, alignItems: 'start' }}>
        {/* Left: main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mode selector */}
          <Card style={{ padding: '14px 18px' }} accent={accent}>
            <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, fontWeight: 700 }}>Mode d'affichage</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {MODES.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => dispatch({ type: 'SET_MODE', payload: id })} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 7,
                  border: `1px solid ${currentMode === id ? `${accent}55` : '#252525'}`,
                  background: currentMode === id ? `${accent}14` : '#111',
                  color: currentMode === id ? accent : '#555',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 140ms',
                }}>
                  <Icon/>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </Card>

          {state.error && (
            <div style={{ background: '#ff475718', border: '1px solid #ff4757', borderRadius: 8, padding: '9px 13px', color: '#ff4757', fontSize: 12 }}>
              {state.error}
            </div>
          )}

          {/* Screen content */}
          {currentMode === 'temperatures' ? (
            <TempDisplayConfig/>
          ) : (
            <Card style={{ padding: 20 }} accent={accent}>
              <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, fontWeight: 700 }}>Contenu LCD</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <LCDPreview/>
                </div>
                <div style={{ flex: 1 }}>
                  <MediaUploader/>
                </div>
              </div>
            </Card>
          )}

          {/* Apply button */}
          {currentMode !== 'temperatures' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={handleApply} disabled={!deviceStatus.connected || applying} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: deviceStatus.connected ? accent : '#252525',
                border: 'none', color: deviceStatus.connected ? '#fff' : '#444',
                borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700,
                cursor: deviceStatus.connected ? 'pointer' : 'not-allowed',
                boxShadow: deviceStatus.connected ? `0 0 16px ${accent}44` : 'none',
                transition: 'all 140ms',
              }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {applying ? 'Sending…' : applied ? 'Applied to LCD' : 'Apply to LCD'}
              </button>
              {applied && <span style={{ fontSize: 11, color: '#00e87a' }}>✓</span>}
              {!deviceStatus.connected && <span style={{ fontSize: 11, color: '#ffb347' }}>Device non connecté</span>}
            </div>
          )}
        </div>

        {/* Right: preview + info — hidden in temperatures mode (TempDisplayConfig has its own) */}
        {currentMode !== 'temperatures' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }} accent={accent}>
            <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Live Preview</div>
            <LivePreview applied={state.lcdApplied} temperatures={temperatures}/>
            <div style={{ fontSize: 10, color: '#2e2e2e', fontFamily: 'JetBrains Mono, monospace' }}>480 × 480 px</div>
          </Card>

          <Card style={{ padding: 16 }} accent={accent}>
            <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 12, fontWeight: 700 }}>Display Info</div>
            {[
              { label: 'Resolution', val: '480 × 480' },
              { label: 'Interface',  val: 'USB Direct' },
              { label: 'Brightness', val: '100%' },
              { label: 'Status',     val: deviceStatus.connected ? deviceStatus.productName : 'Not connected' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#484848' }}>{label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#888' }}>{val}</span>
              </div>
            ))}
          </Card>
        </div>}
      </div>
    </div>
  )
}
