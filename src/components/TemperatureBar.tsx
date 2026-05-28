import { useApp } from '../context/AppContext'

function TempItem({ label, value, color, max = 100 }: { label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const isHot = value > 80

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm w-12">{label}</span>
      <div className="flex-1 h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: isHot ? '#ff4444' : color }}
        />
      </div>
      <span
        className="text-sm font-mono w-14 text-right"
        style={{ color: isHot ? '#ff4444' : color }}
      >
        {Math.round(value)}°C
      </span>
    </div>
  )
}

export function TemperatureBar() {
  const { state } = useApp()
  const { temperatures } = state

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
      <TempItem label="CPU" value={temperatures.cpu} color="#00ff88" />
      <TempItem label="GPU" value={temperatures.gpu} color="#00ff88" />
      <TempItem label="Liquide" value={temperatures.liquid} color="#00d4ff" max={50} />
      {temperatures.pumpRpm > 0 && (
        <div className="flex items-center gap-3 pt-1 border-t border-[#1e1e2e]">
          <span className="text-gray-400 text-sm w-12">Pompe</span>
          <span className="text-gray-300 text-sm font-mono">{temperatures.pumpRpm} RPM</span>
        </div>
      )}
    </div>
  )
}
