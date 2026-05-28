import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Card } from '../ui/Card'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { Settings } from '../Settings'
import { ProfileManager } from '../ProfileManager'
import { api } from '../../lib/api'

const ACCENT_COLORS = [
  { name: 'Violet', c: '#9d4edd' },
  { name: 'Cyan',   c: '#00bcd4' },
  { name: 'Green',  c: '#00e87a' },
  { name: 'Gold',   c: '#ffb347' },
  { name: 'Rose',   c: '#ff6b9d' },
  { name: 'Ember',  c: '#ff4757' },
]

const TABS = ['General', 'Profils', 'Support'] as const
type Tab = typeof TABS[number]

const IGithub = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
)
const IBug = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.5 1.5"/><path d="M14.5 3.5L16 2"/><path d="M9 9h6"/><path d="M9 12h6"/>
    <path d="M12 21c-3.314 0-6-2.686-6-6V9a3 3 0 0 1 6 0v6"/><path d="M12 21c3.314 0 6-2.686 6-6V9a3 3 0 0 0-6 0v6"/>
    <line x1="3" y1="10" x2="6" y2="10"/><line x1="18" y1="10" x2="21" y2="10"/>
    <line x1="3" y1="15" x2="6" y2="15"/><line x1="18" y1="15" x2="21" y2="15"/>
  </svg>
)
const IChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const SUPPORT_LINKS = [
  { title: 'GitHub Repository', desc: 'Code source, issues et contributions', Icon: IGithub, url: 'https://github.com/cypherxdev77/nzxt-cam-linux' },
  { title: 'Signaler un bug', desc: 'Ouvrir une issue GitHub', Icon: IBug, url: 'https://github.com/cypherxdev77/nzxt-cam-linux/issues/new' },
  { title: 'Reddit r/NZXT', desc: 'Communauté NZXT', Icon: IChat, url: 'https://reddit.com/r/NZXT' },
]

function SupportTab({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {SUPPORT_LINKS.map(({ title, desc, Icon, url }) => (
        <div key={title}
          onClick={() => window.open(url, '_blank')}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 9, cursor: 'pointer', transition: 'all 140ms' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}44`; (e.currentTarget as HTMLDivElement).style.background = '#111' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e1e'; (e.currentTarget as HTMLDivElement).style.background = '#0d0d0d' }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#161616', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexShrink: 0 }}>
            <Icon/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#d0d0d0', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 10, color: '#3a3a3a' }}>{desc}</div>
          </div>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      ))}
      <div style={{ marginTop: 6, padding: '12px 16px', background: '#080808', borderRadius: 8, border: '1px solid #141414' }}>
        <div style={{ fontSize: 11, color: '#2e2e2e', fontFamily: 'JetBrains Mono, monospace' }}>NZXT CAM · Linux Edition · v1.0.0</div>
        <div style={{ fontSize: 10, color: '#242424', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>Tauri 2 · Rust · Arch Linux</div>
      </div>
    </div>
  )
}

export function SettingsScreen() {
  const { state, dispatch } = useApp()
  const { accent, compact, tempUnit } = state
  const [tab, setTab] = useState<Tab>('General')
  const [autostart, setAutostart] = useState(false)

  useEffect(() => {
    api.getAutostart().then(setAutostart).catch(() => {})
  }, [])

  const toggleAutostart = async (val: boolean) => {
    try {
      await api.setAutostart(val)
      setAutostart(val)
    } catch (e) {
      console.error('Autostart error:', e)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Settings</div>

      <div style={{ display: 'flex', gap: 2, background: '#0f0f0f', padding: 4, borderRadius: 9, alignSelf: 'flex-start' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: tab === t ? '#222' : 'transparent',
            color: tab === t ? '#e0e0e0' : '#484848',
            transition: 'all 140ms',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'General' && (
        <Card style={{ padding: 24 }} accent={accent}>
          {/* Accent color */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 12, fontWeight: 700 }}>Couleur d'accent</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {ACCENT_COLORS.map(({ name, c }) => (
                <div key={c} onClick={() => dispatch({ type: 'SET_ACCENT', payload: c })} title={name}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${accent === c ? '#fff' : 'transparent'}`, boxShadow: accent === c ? `0 0 10px ${c}` : 'none', transition: 'all 140ms' }}/>
              ))}
            </div>
          </div>

          {/* Temp unit */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 12, fontWeight: 700 }}>Unité de température</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['°C', '°F'] as const).map(u => (
                <button key={u} onClick={() => dispatch({ type: 'SET_TEMP_UNIT', payload: u })} style={{
                  padding: '7px 24px', borderRadius: 6, border: `1px solid ${tempUnit === u ? accent : '#2c2c2c'}`,
                  background: tempUnit === u ? `${accent}1a` : 'transparent',
                  color: tempUnit === u ? accent : '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 140ms',
                }}>{u}</button>
              ))}
            </div>
          </div>

          {/* Compact sidebar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: '#c0c0c0', fontWeight: 500 }}>Sidebar compacte</div>
              <div style={{ fontSize: 11, color: '#484848', marginTop: 2 }}>Afficher uniquement les icônes</div>
            </div>
            <ToggleSwitch on={compact} onChange={v => dispatch({ type: 'SET_COMPACT', payload: v })} color={accent}/>
          </div>

          {/* Autostart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '14px 16px', background: '#0d0d0d', borderRadius: 9, border: `1px solid ${autostart ? `${accent}33` : '#1a1a1a'}`, transition: 'border-color 200ms' }}>
            <div>
              <div style={{ fontSize: 13, color: '#c0c0c0', fontWeight: 600, marginBottom: 3 }}>Lancer au démarrage</div>
              <div style={{ fontSize: 10, color: '#3a3a3a' }}>
                {autostart
                  ? 'L\'app démarre automatiquement avec ta session'
                  : 'L\'app ne démarre pas automatiquement'}
              </div>
            </div>
            <ToggleSwitch on={autostart} onChange={toggleAutostart} color={accent}/>
          </div>

          <div style={{ height: 1, background: '#1a1a1a', margin: '0 0 20px' }}/>

          {/* Existing settings */}
          <Settings/>
        </Card>
      )}

      {tab === 'Profils' && (
        <Card style={{ padding: 24 }} accent={accent}>
          <ProfileManager/>
        </Card>
      )}

      {tab === 'Support' && (
        <Card style={{ padding: 24 }} accent={accent}>
          <SupportTab accent={accent}/>
        </Card>
      )}
    </div>
  )
}
