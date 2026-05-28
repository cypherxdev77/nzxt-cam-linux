import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useApp } from '../../context/AppContext'

const IHeart = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
const ICopy = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const ICheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IQR = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/><path d="M14 14h3v3h-3z" fill="currentColor" stroke="none"/><path d="M17 17h4"/><path d="M17 21v-4"/><path d="M21 17h-1v4"/></svg>

function QRModal({ name, symbol, color, address, onClose }: { name: string, symbol: string, color: string, address: string, onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, address, {
        width: 200, margin: 2,
        color: { dark: '#f0f0f0', light: '#0f0f0f' }
      })
    }
  }, [address])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: `1px solid ${color}44`, borderRadius: 16, padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: `0 32px 80px rgba(0,0,0,0.9), 0 0 40px ${color}20`, animation: 'ddFadeIn 180ms ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: color + '18', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color, fontWeight: 700 }}>
            {symbol === 'BTC' ? '₿' : symbol === 'SOL' ? '◎' : 'Ξ'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0' }}>{name}</div>
            <div style={{ fontSize: 9, color: '#484848', fontWeight: 700 }}>{symbol}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 16, background: 'none', border: 'none', color: '#484848', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 10, background: '#0f0f0f', borderRadius: 10, border: `1px solid ${color}33` }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 6 }}/>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#484848', textAlign: 'center', maxWidth: 200, wordBreak: 'break-all', lineHeight: 1.6 }}>{address}</div>
        <div style={{ fontSize: 10, color: '#383838' }}>Scannez avec votre application crypto</div>
      </div>
    </div>
  )
}

const CRYPTO = [
  { id: 'btc', name: 'Bitcoin',  symbol: 'BTC',   color: '#f7931a', icon: '₿', address: 'bc1qxz8ctth9h296dz95v43kerhrlajfqgnt4j9umc' },
  { id: 'erc', name: 'ERC-20',   symbol: 'ETH/USDT', color: '#627eea', icon: 'Ξ', address: '0xdB6B57BE02dbb5Baa7f1013207ACEdB2E70b879c' },
  { id: 'sol', name: 'Solana',   symbol: 'SOL',   color: '#9945ff', icon: '◎', address: '7nA4q7dDXujLe6SbBX6hx91dMkwTMKcttCX1SNP1bc2v' },
]

function DonatePanel({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [qrTarget, setQrTarget] = useState<typeof CRYPTO[number] | null>(null)
  const copyAddress = (id: string, addr: string) => {
    if (addr === '—') return
    navigator.clipboard?.writeText(addr).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }
  return (
    <>{qrTarget && <QRModal name={qrTarget.name} symbol={qrTarget.symbol} color={qrTarget.color} address={qrTarget.address} onClose={() => setQrTarget(null)}/>}
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
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => copyAddress(id, address)} style={{ background: copied === id ? color + '22' : 'transparent', border: `1px solid ${copied === id ? color + '55' : '#2a2a2a'}`, borderRadius: 5, color: copied === id ? color : '#444', cursor: 'pointer', padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, transition: 'all 160ms' }}>
                    {copied === id ? <><ICheck/> Copié</> : <><ICopy/> Copier</>}
                  </button>
                  <button onClick={() => setQrTarget(CRYPTO.find(c => c.id === id)!)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 5, color: '#444', cursor: 'pointer', padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, transition: 'all 160ms' }} title="QR Code">
                    <IQR/> QR
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 18px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: '#2e2e2e' }}>Merci pour votre soutien au projet NZXTCAM Linux</div>
      </div>
    </div>
    </>
  )
}

export function DonateWidget() {
  const { state } = useApp()
  const accent = state.accent
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 800, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {open && <DonatePanel onClose={() => setOpen(false)}/>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
        <button onClick={() => { setOpen(false); setDismissed(true) }} title="Masquer" style={{
          background: '#131313', border: '1px solid #252525', borderRadius: '50%',
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#383838', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)', transition: 'all 180ms', flexShrink: 0,
        }}>×</button>
      </div>
    </div>
  )
}
