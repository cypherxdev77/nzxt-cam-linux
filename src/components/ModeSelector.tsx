import { useApp } from '../context/AppContext'

type Mode = 'image' | 'gif' | 'temperatures'

const modes: { id: Mode; label: string; icon: string }[] = [
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'gif', label: 'GIF', icon: '🎬' },
  { id: 'temperatures', label: 'Températures', icon: '🌡️' }
]

export function ModeSelector() {
  const { state, dispatch } = useApp()

  return (
    <div className="flex gap-2">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => dispatch({ type: 'SET_MODE', payload: m.id })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            state.currentMode === m.id
              ? 'bg-[#00d4ff] text-[#0a0a0f] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
              : 'bg-[#111118] text-gray-400 border border-[#1e1e2e] hover:border-[#00d4ff44] hover:text-gray-200'
          }`}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  )
}
