import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { LogoMark } from './ui/LogoMark'

type Section = 'monitoring' | 'cooling' | 'lighting' | 'lcd' | 'settings'

const IActivity  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const ISnowflake = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="7.5" y2="7.5"/><line x1="19" y1="5" x2="16.5" y2="7.5"/><line x1="5" y1="19" x2="7.5" y2="16.5"/><line x1="19" y1="19" x2="16.5" y2="16.5"/></svg>
const IBulb     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"/></svg>
const IScreen   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><circle cx="12" cy="10" r="3"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
const IGear     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
const IChevronLeft  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
const IChevronRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>

const SIDEBAR_W = 200

const NAV: { id: Section; label: string; Icon: () => JSX.Element }[] = [
  { id: 'monitoring', label: 'Monitoring',  Icon: IActivity  },
  { id: 'cooling',    label: 'Cooling',     Icon: ISnowflake },
  { id: 'lighting',   label: 'Lighting',    Icon: IBulb      },
  { id: 'lcd',        label: 'LCD Display', Icon: IScreen    },
]

function NavItem({ id, label, Icon, isActive, accent }: {
  id: Section; label: string; Icon: () => JSX.Element; isActive: boolean; accent: string
}) {
  const { dispatch } = useApp()
  return (
    <div
      onClick={() => dispatch({ type: 'SET_SECTION', payload: id })}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 11px',
        paddingLeft: isActive ? 9 : 11,
        borderRadius: 7, marginBottom: 2, cursor: 'pointer',
        color: isActive ? '#f0f0f0' : '#484848',
        background: isActive ? `${accent}18` : 'transparent',
        borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
        transition: 'all 140ms', fontWeight: isActive ? 700 : 500, fontSize: 13,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.color = '#b0b0b0'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.028)' } }}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.color = '#484848'; (e.currentTarget as HTMLDivElement).style.background = 'transparent' } }}
    >
      <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.55 }}><Icon/></span>
      <span>{label}</span>
    </div>
  )
}

export function AppSidebar() {
  const { state, dispatch } = useApp()
  const { section, accent } = state
  const [open, setOpen] = useState(true)

  return (
    <div style={{ position: 'relative', display: 'flex', flexShrink: 0, height: '100%' }}>

      {/* Sidebar panel */}
      <div style={{
        width: open ? SIDEBAR_W : 0,
        minWidth: 0,
        overflow: 'hidden',
        background: '#0e0e0e',
        borderRight: open ? '1px solid #1c1c1c' : 'none',
        display: 'flex', flexDirection: 'column', height: '100%',
        transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1), border-color 280ms',
      }}>
        {/* Inner wrapper — fixed width so content doesn't compress during animation */}
        <div style={{ width: SIDEBAR_W, display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Brand */}
          <div style={{ padding: '18px 16px 20px', borderBottom: '1px solid #161616', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark accent={accent} size={34}/>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#f0f0f0', letterSpacing: '-0.3px' }}>
                <span style={{ color: accent }}>NZXT</span>CAM
              </div>
              <div style={{ fontSize: 9, color: '#2e2e2e', marginTop: 4, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>Linux</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: '0 7px' }}>
            {NAV.map(({ id, label, Icon }) => (
              <NavItem key={id} id={id} label={label} Icon={Icon} isActive={section === id} accent={accent}/>
            ))}
          </div>

          {/* Settings + collapse button at bottom */}
          <div style={{ padding: '8px 7px 10px', borderTop: '1px solid #141414' }}>
            <div
              onClick={() => dispatch({ type: 'SET_SECTION', payload: 'settings' })}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 11px',
                paddingLeft: section === 'settings' ? 9 : 11,
                borderRadius: 7, cursor: 'pointer',
                color: section === 'settings' ? '#f0f0f0' : '#484848',
                background: section === 'settings' ? `${accent}18` : 'transparent',
                borderLeft: section === 'settings' ? `2px solid ${accent}` : '2px solid transparent',
                transition: 'all 140ms', fontWeight: section === 'settings' ? 700 : 500, fontSize: 13,
                whiteSpace: 'nowrap', marginBottom: 4,
              }}
              onMouseEnter={e => { if (section !== 'settings') { (e.currentTarget as HTMLDivElement).style.color = '#b0b0b0'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.028)' } }}
              onMouseLeave={e => { if (section !== 'settings') { (e.currentTarget as HTMLDivElement).style.color = '#484848'; (e.currentTarget as HTMLDivElement).style.background = 'transparent' } }}
            >
              <span style={{ flexShrink: 0, opacity: section === 'settings' ? 1 : 0.55 }}><IGear/></span>
              <span>Settings</span>
            </div>

            {/* Collapse button */}
            <div
              onClick={() => setOpen(false)}
              title="Réduire le menu"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 11px', borderRadius: 7, cursor: 'pointer',
                color: '#2e2e2e', fontSize: 11, fontWeight: 600,
                transition: 'all 140ms', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = '#666'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = '#2e2e2e'; (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <IChevronLeft/>
              <span>Réduire</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating re-open tab — visible only when sidebar is closed */}
      <div
        onClick={() => setOpen(true)}
        title="Ouvrir le menu"
        style={{
          position: 'absolute', left: 0, top: '50%',
          transform: `translateY(-50%) translateX(${open ? '-100%' : '0%'})`,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
          zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 52,
          background: '#161616',
          border: '1px solid #2a2a2a',
          borderLeft: 'none',
          borderRadius: '0 7px 7px 0',
          cursor: 'pointer',
          color: '#484848',
          transition: 'opacity 240ms 60ms, transform 280ms cubic-bezier(0.4, 0, 0.2, 1), color 140ms, background 140ms',
          boxShadow: '3px 0 12px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = '#aaa'; (e.currentTarget as HTMLDivElement).style.background = '#222' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = '#484848'; (e.currentTarget as HTMLDivElement).style.background = '#161616' }}
      >
        <IChevronRight/>
      </div>
    </div>
  )
}
