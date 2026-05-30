import { useRef, useState, useCallback } from 'react'
import { DisplayConfig, DisplayElement, LCD_SIZE } from '@shared/display'

const CANVAS_PX = 440

const TYPE_ICON: Record<DisplayElement['type'], string> = {
  gauge: '◠',
  bar: '▭',
  text: 'T'
}

interface Props {
  config: DisplayConfig
  previewUrl: string | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMoveElement: (id: string, x: number, y: number) => void
}

export function PreviewCanvas({ config, previewUrl, selectedId, onSelect, onMoveElement }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const scale = CANVAS_PX / LCD_SIZE

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, el: DisplayElement) => {
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      onSelect(el.id)
      setDragId(el.id)
    },
    [onSelect]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragId || !boxRef.current) return
      const rect = boxRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      const cl = (v: number) => Math.max(0, Math.min(LCD_SIZE, Math.round(v)))
      onMoveElement(dragId, cl(x), cl(y))
    },
    [dragId, scale, onMoveElement]
  )

  const endDrag = useCallback(() => setDragId(null), [])

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={boxRef}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClick={() => onSelect(null)}
        className="relative rounded-full overflow-hidden border border-[#2a2a3e] shadow-[0_0_40px_rgba(0,0,0,0.6)] select-none"
        style={{ width: CANVAS_PX, height: CANVAS_PX, background: config.background, touchAction: 'none' }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="preview"
            draggable={false}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
            Rendu…
          </div>
        )}

        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/5 pointer-events-none" />

        {config.elements.map((el) => {
          const selected = el.id === selectedId
          return (
            <div
              key={el.id}
              onPointerDown={(e) => handlePointerDown(e, el)}
              title={`${el.type}`}
              className={`absolute flex items-center justify-center rounded-full text-[10px] font-bold cursor-grab active:cursor-grabbing transition-shadow ${
                selected
                  ? 'bg-[#00d4ff] text-[#0a0a0f] ring-2 ring-white shadow-[0_0_12px_rgba(0,212,255,0.8)] z-20'
                  : 'bg-black/60 text-[#00d4ff] ring-1 ring-[#00d4ff66] z-10 hover:bg-black/80'
              }`}
              style={{
                width: 22,
                height: 22,
                left: el.x * scale - 11,
                top: el.y * scale - 11
              }}
            >
              {TYPE_ICON[el.type]}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-600">Drag handles to reposition • {LCD_SIZE}×{LCD_SIZE}</p>
    </div>
  )
}
