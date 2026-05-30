import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export function AppHeader() {
  const { state } = useApp()
  const { accent, deviceStatus } = state

  return (
    <div style={{
      height: 42, minHeight: 42,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px 0 14px',
      background: '#090909',
      borderBottom: '1px solid #161616',
      ...drag,
    }}>
      {/* Left: device pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...noDrag }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', borderRadius: 20,
          background: deviceStatus.connected ? `${accent}14` : '#1a1a1a',
          border: `1px solid ${deviceStatus.connected ? `${accent}33` : '#252525'}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: deviceStatus.connected ? accent : '#3a3a3a',
            boxShadow: deviceStatus.connected ? `0 0 6px ${accent}` : 'none',
          }}/>
          <span style={{ fontSize: 11, color: deviceStatus.connected ? '#c0c0c0' : '#3a3a3a', fontWeight: 600 }}>
            {deviceStatus.connected ? deviceStatus.productName : 'Not connected'}
          </span>
        </div>
      </div>

      {/* Right: window controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...noDrag }}>
        <WinBtn title="Minimize" onClick={() => api.hideWindow()}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </WinBtn>
        <WinBtn title="Quit" onClick={() => api.quitApp()} danger>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({ onClick, title, children, danger }: { onClick: () => void; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', transition: 'all 130ms' }}
      onMouseEnter={e => {
        const b = e.currentTarget as HTMLButtonElement
        b.style.background = danger ? '#ff475720' : '#1e1e1e'
        b.style.color = danger ? '#ff4757' : '#888'
      }}
      onMouseLeave={e => {
        const b = e.currentTarget as HTMLButtonElement
        b.style.background = 'transparent'
        b.style.color = '#3a3a3a'
      }}
    >
      {children}
    </button>
  )
}
