import { useApp } from '../context/AppContext'

export function DeviceStatus() {
  const { state } = useApp()
  const { deviceStatus } = state

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#111118] border border-[#1e1e2e] rounded-xl text-sm">
      <span
        className={`w-2 h-2 rounded-full ${deviceStatus.connected ? 'bg-[#00d4ff] shadow-[0_0_8px_#00d4ff]' : 'bg-red-500'}`}
      />
      <span className={deviceStatus.connected ? 'text-[#00d4ff]' : 'text-red-400'}>
        {deviceStatus.productName}
        {deviceStatus.connected && !deviceStatus.lcdControllable && ' (LCD indisponible)'}
      </span>
      {deviceStatus.error && (
        <span className="text-yellow-500 text-xs ml-2 truncate max-w-[200px]" title={deviceStatus.error}>
          ⚠ {deviceStatus.error}
        </span>
      )}
    </div>
  )
}
