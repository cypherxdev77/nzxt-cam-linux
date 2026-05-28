import { useApp } from '../context/AppContext'

const IScreen = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)

export function LCDPreview() {
  const { state } = useApp()
  const { imagePreviewUrl, gifPreviewUrl, currentMode, temperatures } = state
  const previewUrl = currentMode === 'image' ? imagePreviewUrl : currentMode === 'gif' ? gifPreviewUrl : null

  const renderContent = () => {
    if (currentMode === 'temperatures') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080808', padding: 12 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>NZXT KRAKEN</div>
          <div style={{ marginBottom: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#484848', marginBottom: 2 }}>CPU</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: temperatures.cpu > 80 ? '#ff4757' : '#00e87a', lineHeight: 1 }}>
              {Math.round(temperatures.cpu)}°
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'GPU', value: temperatures.gpu, color: temperatures.gpu > 80 ? '#ff4757' : '#00e87a' },
              { label: 'LIQ', value: temperatures.liquid, color: '#00bcd4' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#484848', marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{Math.round(value)}°</div>
              </div>
            ))}
          </div>
          {temperatures.pumpRpm > 0 && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#2e2e2e', marginTop: 8 }}>{temperatures.pumpRpm} RPM</div>
          )}
        </div>
      )
    }

    if (previewUrl) {
      return <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
    }

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080808', gap: 10 }}>
        <span style={{ color: '#252525' }}><IScreen/></span>
        <span style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 500 }}>Aucun contenu</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 200, height: 200, borderRadius: '50%', overflow: 'hidden',
        border: '1px solid #1e1e1e', background: '#080808',
        boxShadow: '0 0 0 4px #111, 0 0 0 5px #1a1a1a',
      }}>
        {renderContent()}
      </div>
      <div style={{ fontSize: 10, color: '#2e2e2e', fontFamily: 'JetBrains Mono, monospace' }}>Preview LCD 480×480</div>
    </div>
  )
}
