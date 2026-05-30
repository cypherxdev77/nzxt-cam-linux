import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { api, Profile, ProfileLcd, ProfileSummary } from '../lib/api'

const LCD_TYPE_LABEL: Record<string, string> = {
  image:        'Image',
  gif:          'GIF',
  temperatures: 'Temperatures',
  none:         'LCD unchanged',
}

const IPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IPlay = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)
const ITrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const ICopy = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

function SaveDialog({ onSave, onCancel }: {
  onSave: (name: string, includeLcd: boolean, includeRing: boolean) => void
  onCancel: () => void
}) {
  const { state } = useApp()
  const accent = state.accent
  const [name, setName] = useState('')
  const [includeLcd, setIncludeLcd] = useState(true)
  const [includeRing, setIncludeRing] = useState(true)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 14, padding: 24, width: 340, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.2px' }}>Nouveau profil</div>

        <input
          autoFocus
          placeholder="Nom du profil (ex: gaming, idle…)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim(), includeLcd, includeRing)}
          style={{
            background: '#0d0d0d', border: `1px solid ${accent}44`, borderRadius: 8,
            padding: '9px 12px', fontSize: 13, color: '#e0e0e0', outline: 'none',
            fontFamily: 'Manrope, sans-serif',
          }}
        />

        <div>
          <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: 10 }}>Inclure dans le profil</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { key: 'lcd', label: 'Mode LCD actuel', val: includeLcd, set: setIncludeLcd },
              { key: 'ring', label: 'Ring LED actuel', val: includeRing, set: setIncludeRing },
            ].map(({ key, label, val, set }) => (
              <div key={key} onClick={() => set(!val)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                background: val ? `${accent}0e` : '#0d0d0d',
                border: `1px solid ${val ? `${accent}44` : '#1e1e1e'}`,
                transition: 'all 140ms',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  background: val ? accent : 'transparent',
                  border: `1.5px solid ${val ? accent : '#3a3a3a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 140ms',
                }}>
                  {val && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: val ? '#d0d0d0' : '#555' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #222',
            background: 'transparent', color: '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 140ms',
          }}>Annuler</button>
          <button onClick={() => name.trim() && onSave(name.trim(), includeLcd, includeRing)} disabled={!name.trim()} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
            background: name.trim() ? accent : '#252525', color: name.trim() ? '#fff' : '#444',
            fontSize: 12, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed',
            boxShadow: name.trim() ? `0 0 14px ${accent}44` : 'none', transition: 'all 140ms',
          }}>Sauvegarder</button>
        </div>
      </div>
    </div>
  )
}

export function ProfileManager() {
  const { state } = useApp()
  const { accent, deviceStatus } = state
  const connected = deviceStatus.connected

  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const list = await api.listProfiles()
    setProfiles(list)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleSave = async (name: string, includeLcd: boolean, includeRing: boolean) => {
    setShowSaveDialog(false)
    setError(null)
    let lcd: ProfileLcd = { type: 'none' }
    if (includeLcd) {
      switch (state.currentMode) {
        case 'image':       if (state.currentImagePath) lcd = { type: 'image', path: state.currentImagePath }; break
        case 'gif':         if (state.currentGifPath)   lcd = { type: 'gif',   path: state.currentGifPath   }; break
        case 'temperatures': lcd = { type: 'temperatures' }; break
      }
    }
    const profile: Profile = {
      name, lcd,
      ring: includeRing ? undefined : undefined,
      displayConfig: includeLcd && state.currentMode === 'temperatures' ? state.displayConfig ?? undefined : undefined,
    }
    const result = await api.saveProfile(profile)
    if (!result.success) setError(result.error ?? 'Erreur inconnue')
    else { flash(`"${name}" saved`); refresh() }
  }

  const handleApply = async (name: string) => {
    if (!connected || applying) return
    setApplying(name); setError(null)
    try {
      const result = await api.applyProfile(name)
      if (!result.success) setError(result.error ?? 'Erreur')
      else flash(`"${name}" applied`)
    } finally { setApplying(null) }
  }

  const handleDelete = async (name: string) => {
    setError(null)
    const result = await api.deleteProfile(name)
    if (!result.success) setError(result.error ?? 'Erreur')
    else { flash(`"${name}" deleted`); refresh() }
  }

  const autoStartCmd = (name: string) => `exec-once = ~/.local/bin/nzxtcam --profile ${name}`

  const copyCmd = (name: string) => {
    navigator.clipboard.writeText(autoStartCmd(name)).catch(() => {})
    setCopied(name)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 700 }}>Profils sauvegardés</div>
          <div style={{ fontSize: 11, color: '#2e2e2e', marginTop: 4 }}>Sauvegarde ta configuration LCD + Ring en un clic</div>
        </div>
        <button onClick={() => setShowSaveDialog(true)} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: accent, color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', boxShadow: `0 0 14px ${accent}44`, transition: 'all 140ms',
        }}>
          <IPlus/> Nouveau profil
        </button>
      </div>

      {/* Profile list */}
      {profiles.length === 0 ? (
        <div style={{ padding: '28px 20px', borderRadius: 10, border: '1px dashed #1e1e1e', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#2e2e2e', fontWeight: 500 }}>Aucun profil</div>
          <div style={{ fontSize: 11, color: '#222', marginTop: 5 }}>Crée un profil pour sauvegarder ta configuration</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {profiles.map(p => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', background: '#0d0d0d',
              border: '1px solid #1a1a1a', borderRadius: 9, transition: 'border-color 140ms',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#d0d0d0', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: '#3a3a3a' }}>{LCD_TYPE_LABEL[p.lcdType] ?? p.lcdType}</div>
              </div>
              <button onClick={() => handleApply(p.name)} disabled={!connected || applying === p.name} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 6, border: `1px solid ${accent}33`,
                background: `${accent}12`, color: accent,
                fontSize: 11, fontWeight: 700, cursor: connected ? 'pointer' : 'not-allowed',
                opacity: !connected ? 0.4 : 1, transition: 'all 130ms',
              }}>
                <IPlay/>{applying === p.name ? 'Envoi…' : 'Appliquer'}
              </button>
              <button onClick={() => handleDelete(p.name)} style={{
                width: 30, height: 30, borderRadius: 6, border: '1px solid #1e1e1e',
                background: 'transparent', color: '#3a3a3a', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 130ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ff475733'; (e.currentTarget as HTMLButtonElement).style.color = '#ff4757'; (e.currentTarget as HTMLButtonElement).style.background = '#ff475712' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e1e1e'; (e.currentTarget as HTMLButtonElement).style.color = '#3a3a3a'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              ><ITrash/></button>
            </div>
          ))}
        </div>
      )}

      {/* Autostart */}
      {profiles.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 700, marginBottom: 8 }}>Autostart — Hyprland</div>
          <div style={{ fontSize: 11, color: '#2e2e2e', marginBottom: 10, lineHeight: 1.6 }}>
            Add to <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#484848' }}>~/.config/hypr/hyprland.conf</span> to launch a profile at startup :
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {profiles.map(p => (
              <div key={p.name} onClick={() => copyCmd(p.name)} title="Cliquer pour copier" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 7,
                background: '#0a0a0a', border: `1px solid ${copied === p.name ? `${accent}44` : '#181818'}`,
                cursor: 'pointer', transition: 'all 130ms',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a2a'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = copied === p.name ? `${accent}44` : '#181818'}
              >
                <span style={{ color: copied === p.name ? accent : '#3a3a3a', flexShrink: 0 }}><ICopy/></span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#484848', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {autoStartCmd(p.name)}
                </span>
                {copied === p.name && <span style={{ fontSize: 10, color: accent, fontWeight: 700, flexShrink: 0 }}>Copié</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {success && (
        <div style={{ fontSize: 11, color: '#00e87a', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          {success}
        </div>
      )}
      {error && (
        <div style={{ padding: '9px 13px', background: '#ff475712', border: '1px solid #ff475733', borderRadius: 8, fontSize: 11, color: '#ff4757' }}>{error}</div>
      )}

      {showSaveDialog && <SaveDialog onSave={handleSave} onCancel={() => setShowSaveDialog(false)}/>}
    </div>
  )
}
