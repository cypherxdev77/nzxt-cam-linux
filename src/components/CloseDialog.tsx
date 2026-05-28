import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useApp } from '../context/AppContext'

export function CloseDialog() {
  const { state } = useApp()
  const accent = state.accent
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const unlisten = listen('close-requested', () => setVisible(true))
    return () => { unlisten.then(f => f()) }
  }, [])

  if (!visible) return null

  const hideWindow = async () => {
    setVisible(false)
    await invoke('hide_window')
  }

  const quitApp = async () => {
    setVisible(false)
    await invoke('quit_app')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: '#111', border: '1px solid #222', borderRadius: 16,
        padding: 28, width: 320, display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f0f0f0', marginBottom: 6, letterSpacing: '-0.2px' }}>
            Fermer la fenêtre ?
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
            L'app peut continuer en arrière-plan et maintenir le contrôle RGB + LCD.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={hideWindow} style={{
            padding: '10px 0', borderRadius: 9, border: 'none',
            background: accent, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: `0 0 18px ${accent}44`, transition: 'all 140ms',
          }}>
            Garder en arrière-plan
          </button>
          <button onClick={quitApp} style={{
            padding: '10px 0', borderRadius: 9, border: '1px solid #252525',
            background: 'transparent', color: '#555', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 140ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff4757'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#ff475733' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#252525' }}
          >
            Quitter complètement
          </button>
        </div>
      </div>
    </div>
  )
}
