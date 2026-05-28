import { AppProvider, useApp } from './context/AppContext'
import { AppSidebar } from './components/AppSidebar'
import { AppHeader } from './components/AppHeader'
import { DonateWidget } from './components/ui/DonateWidget'
import { CloseDialog } from './components/CloseDialog'
import { MonitoringScreen } from './components/screens/MonitoringScreen'
import { CoolingScreen } from './components/screens/CoolingScreen'
import { LightingScreen } from './components/screens/LightingScreen'
import { LCDScreen } from './components/screens/LCDScreen'
import { SettingsScreen } from './components/screens/SettingsScreen'
import { useDevice } from './hooks/useDevice'
import { useTemperatures } from './hooks/useTemperatures'

function MainApp() {
  const { state } = useApp()
  useDevice()
  useTemperatures()

  const { section } = state

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#0e0e0e', color: '#e0e0e0', overflow: 'hidden', fontFamily: 'Manrope, sans-serif' }}>
      <AppHeader />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AppSidebar />
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {section === 'monitoring' && <MonitoringScreen />}
          {section === 'cooling'    && <CoolingScreen />}
          {section === 'lighting'   && <LightingScreen />}
          {section === 'lcd'        && <LCDScreen />}
          {section === 'settings'   && <SettingsScreen />}
        </div>
      </div>
      <DonateWidget />
      <CloseDialog />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  )
}
