import { useState } from 'react'
import { useApp } from '../../context/AppContext'

const IHeart = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
const ICopy = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const ICheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

const CRYPTO = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', color: '#f7931a', icon: '₿', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
  { id: 'sol', name: 'Solana',  symbol: 'SOL', color: '#9945ff', icon: '◎', address: '—' },
  { id: 'xmr', name: 'Monero',  symbol: 'XMR', color: '#ff6600', icon: 'ɱ', address: '—' },
]

function DonatePanel({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const copyAddress = (id: string, addr: string) => {
    if (addr === '—') return
    navigator.clipboard?.writeText(addr).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }
  return (
    <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, width: 360, background: '#131313', border: '1px solid #2a2a2a', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.85)', animation: 'ddFadeIn 180ms ease' }}>
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid #1e1e1e', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: '#ff4757', display: 'flex' }}><IHeart/></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.2px' }}>Contribute to the Project</div>
            <div style={{ fontSize: 10, color: '#484848', marginTop: 2 }}>NZXTCAM Linux · Open Source</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#484848', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>
      <div style={{ padding: '12px 18px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a' }}>
        <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
          Ce projet est open source et développé bénévolement. Si vous l'appréciez et souhaitez soutenir son développement, toute contribution est la bienvenue. 🙏
        </p>
      </div>
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CRYPTO.map(({ id, name, symbol, color, icon, address }) => (
          <div key={id} style={{ background: '#0f0f0f', border: `1px solid ${color}22`, borderRadius: 9, padding: '11px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: color + '18', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color, fontWeight: 700 }}>{icon}</div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#d0d0d0' }}>{name}</span>
                <span style={{ fontSize: 9, color: '#484848', marginLeft: 6, background: '#1a1a1a', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{symbol}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141414', borderRadius: 6, padding: '7px 10px', border: '1px solid #1e1e1e' }}>
              <div style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: '#686868', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</div>
              {address !== '—' && (
                <button onClick={() => copyAddress(id, address)} style={{ background: copied === id ? color + '22' : 'transparent', border: `1px solid ${copied === id ? color + '55' : '#2a2a2a'}`, borderRadius: 5, color: copied === id ? color : '#444', cursor: 'pointer', padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, transition: 'all 160ms' }}>
                  {copied === id ? <><ICheck/> Copié</> : <><ICopy/> Copier</>}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 18px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: '#2e2e2e' }}>Merci pour votre soutien au projet NZXTCAM Linux ✨</div>
      </div>
    </div>
  )
}

export function DonateWidget() {
  const { state } = useApp()
  const accent = state.accent
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 800, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {open && <DonatePanel onClose={() => setOpen(false)}/>}
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 14px', borderRadius: 20,
        background: open ? '#1e1e1e' : '#131313',
        border: `1px solid ${open ? accent + '66' : '#252525'}`,
        color: open ? accent : '#484848',
        cursor: 'pointer', fontSize: 11, fontWeight: 700,
        boxShadow: open ? `0 0 16px ${accent}30` : '0 4px 16px rgba(0,0,0,0.6)',
        transition: 'all 180ms', letterSpacing: '0.3px',
      }}>
        <span style={{ color: '#ff4757', display: 'flex', animation: 'logoPulse 2s ease-in-out infinite' }}><IHeart/></span>
        Contribuer au projet
      </button>
    </div>
  )
}
