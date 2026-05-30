import { useEffect, useRef, useState, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import {
  DisplayConfig, DisplayElement, PRESETS, makeGauge, makeBar, makeText, METRIC_LABELS
} from '@shared/display'
import { api } from '../../lib/api'
import { PreviewCanvas } from './PreviewCanvas'
import { ElementInspector } from './ElementInspector'

function elementTitle(el: DisplayElement): string {
  if (el.type === 'text') return `Texte « ${el.text || '…'} »`
  return `${el.type === 'gauge' ? 'Jauge' : 'Barre'} — ${METRIC_LABELS[el.metric]}`
}

export function DisplayEditor() {
  const { state, dispatch } = useApp()
  const config = state.displayConfig
  const selectedId = state.selectedElementId

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'done' | 'error'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial load of the persisted scene.
  useEffect(() => {
    if (config) return
    api.getDisplayConfig().then((cfg: DisplayConfig) => {
      // If the backend has an empty default scene, fall back to a frontend preset.
      const initial = cfg && cfg.elements && cfg.elements.length > 0 ? cfg : PRESETS[0].build()
      dispatch({ type: 'SET_DISPLAY_CONFIG', payload: initial })
    })
  }, [config, dispatch])

  // Debounced preview render.
  useEffect(() => {
    if (!config) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await api.renderDisplayPreview(config)
      if (res?.success && res.dataUrl) setPreviewUrl(res.dataUrl)
    }, 90)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [config])

  const setConfig = useCallback(
    (next: DisplayConfig) => {
      dispatch({ type: 'SET_DISPLAY_CONFIG', payload: next })
      setApplyState('idle')
    },
    [dispatch]
  )

  const updateElement = useCallback(
    (id: string, patch: Partial<DisplayElement>) => {
      if (!config) return
      setConfig({
        ...config,
        elements: config.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as DisplayElement) : el))
      })
    },
    [config, setConfig]
  )

  const moveElement = useCallback(
    (id: string, x: number, y: number) => updateElement(id, { x, y } as Partial<DisplayElement>),
    [updateElement]
  )

  const addElement = useCallback(
    (type: DisplayElement['type']) => {
      if (!config) return
      const el =
        type === 'gauge' ? makeGauge('cpu', { radius: 200, thickness: 32 })
        : type === 'bar' ? makeBar('cpu')
        : makeText('{cpu}°', { size: 64 })
      setConfig({ ...config, elements: [...config.elements, el] })
      dispatch({ type: 'SELECT_ELEMENT', payload: el.id })
    },
    [config, setConfig, dispatch]
  )

  const removeElement = useCallback(
    (id: string) => {
      if (!config) return
      setConfig({ ...config, elements: config.elements.filter((el) => el.id !== id) })
      dispatch({ type: 'SELECT_ELEMENT', payload: null })
    },
    [config, setConfig, dispatch]
  )

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = PRESETS.find((p) => p.id === presetId)
      if (!preset) return
      setConfig(preset.build())
      dispatch({ type: 'SELECT_ELEMENT', payload: null })
    },
    [setConfig, dispatch]
  )

  const applyToLcd = useCallback(async () => {
    if (!config) return
    setApplyState('applying')
    try {
      await api.saveDisplayConfig(config)
      const res = await api.startTempMode()
      setApplyState(res?.success === false ? 'error' : 'done')
    } catch {
      setApplyState('error')
    }
  }, [config])

  if (!config) {
    return <div className="text-gray-500 text-sm p-8">Loading editor…</div>
  }

  const selected = config.elements.find((el) => el.id === selectedId) ?? null

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      <div className="w-56 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Templates</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                title={p.description}
                className="text-xs px-2 py-2 rounded-lg bg-[#111118] border border-[#1e1e2e] text-gray-300 hover:border-[#00d4ff66] hover:text-white transition-all text-left"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Elements</p>
          <div className="flex flex-col gap-1">
            {config.elements.map((el) => (
              <button
                key={el.id}
                onClick={() => dispatch({ type: 'SELECT_ELEMENT', payload: el.id })}
                className={`text-xs px-2 py-1.5 rounded-lg text-left truncate transition-all ${
                  el.id === selectedId
                    ? 'bg-[#00d4ff] text-[#0a0a0f] font-medium'
                    : 'bg-[#111118] border border-[#1e1e2e] text-gray-400 hover:text-gray-200'
                }`}
              >
                {elementTitle(el)}
              </button>
            ))}
            {config.elements.length === 0 && (
              <p className="text-xs text-gray-600 italic">Aucun élément</p>
            )}
          </div>
          <div className="flex gap-1 mt-2">
            <button onClick={() => addElement('gauge')} className="flex-1 text-xs py-1.5 rounded-lg bg-[#111118] border border-[#1e1e2e] text-gray-300 hover:border-[#00d4ff66]">+ Jauge</button>
            <button onClick={() => addElement('bar')} className="flex-1 text-xs py-1.5 rounded-lg bg-[#111118] border border-[#1e1e2e] text-gray-300 hover:border-[#00d4ff66]">+ Barre</button>
            <button onClick={() => addElement('text')} className="flex-1 text-xs py-1.5 rounded-lg bg-[#111118] border border-[#1e1e2e] text-gray-300 hover:border-[#00d4ff66]">+ Texte</button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Fond</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.background}
              onChange={(e) => setConfig({ ...config, background: e.target.value })}
              className="w-9 h-7 bg-transparent border border-[#2a2a3e] rounded cursor-pointer"
            />
            <span className="text-xs text-gray-500 font-mono">{config.background}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-w-0">
        <PreviewCanvas
          config={config}
          previewUrl={previewUrl}
          selectedId={selectedId}
          onSelect={(id) => dispatch({ type: 'SELECT_ELEMENT', payload: id })}
          onMoveElement={moveElement}
        />
        <button
          onClick={applyToLcd}
          disabled={applyState === 'applying' || !state.deviceStatus.lcdControllable}
          className="px-6 py-2.5 rounded-xl bg-[#00d4ff] text-[#0a0a0f] font-semibold text-sm hover:bg-[#33ddff] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,212,255,0.3)]"
        >
          {applyState === 'applying' ? 'Sending…'
            : applyState === 'done' ? '✓ Applied to LCD'
            : applyState === 'error' ? '✕ Error — retry'
            : 'Apply to LCD'}
        </button>
        {!state.deviceStatus.lcdControllable && (
          <p className="text-xs text-amber-500">LCD not available — check device connection</p>
        )}
      </div>

      <div className="w-80 shrink-0 overflow-y-auto bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Properties</p>
        <ElementInspector
          element={selected}
          onChange={(patch) => selectedId && updateElement(selectedId, patch)}
          onRemove={() => selectedId && removeElement(selectedId)}
        />
      </div>
    </div>
  )
}
