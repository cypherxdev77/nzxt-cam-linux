import { DisplayElement, MetricId, METRIC_LABELS } from '@shared/display'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 justify-between">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function NumberField({
  label, value, onChange, min = 0, max = 640, step = 1
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <Row label={label}>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 accent-[#00d4ff]"
      />
      <input
        type="number"
        min={min} max={max} step={step}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 bg-[#0a0a0f] border border-[#2a2a3e] rounded px-1 py-0.5 text-xs text-gray-200"
      />
    </Row>
  )
}

function TextField({
  label, value, onChange, placeholder
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Row label={label}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-44 bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1 text-xs text-gray-200"
      />
    </Row>
  )
}

function ColorField({
  label, value, onChange
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-7 bg-transparent border border-[#2a2a3e] rounded cursor-pointer"
      />
      <span className="text-xs text-gray-500 font-mono w-16">{value}</span>
    </Row>
  )
}

function SelectField<T extends string>({
  label, value, options, onChange
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Row label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-44 bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1 text-xs text-gray-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Row>
  )
}

function ToggleField({
  label, value, onChange
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={label}>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#00d4ff]' : 'bg-[#2a2a3e]'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`}
        />
      </button>
    </Row>
  )
}

const METRIC_OPTIONS: { value: MetricId; label: string }[] = [
  { value: 'cpu', label: METRIC_LABELS.cpu },
  { value: 'gpu', label: METRIC_LABELS.gpu },
  { value: 'liquid', label: METRIC_LABELS.liquid },
  { value: 'pump', label: METRIC_LABELS.pump }
]

interface Props {
  element: DisplayElement | null
  onChange: (patch: Partial<DisplayElement>) => void
  onRemove: () => void
}

export function ElementInspector({ element, onChange, onRemove }: Props) {
  if (!element) {
    return (
      <div className="text-sm text-gray-600 p-4 text-center border border-dashed border-[#2a2a3e] rounded-xl">
        Select an element (handle on preview or list on the left) to edit it.
      </div>
    )
  }

  const c = onChange as (p: Record<string, unknown>) => void

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-200 capitalize">{element.type}</span>
        <button
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 rounded px-2 py-1"
        >
          Supprimer
        </button>
      </div>

      <NumberField label="Position X" value={element.x} onChange={(v) => c({ x: v })} min={0} max={640} />
      <NumberField label="Position Y" value={element.y} onChange={(v) => c({ y: v })} min={0} max={640} />

      {element.type === 'gauge' && (
        <>
          <SelectField label="Metric" value={element.metric} options={METRIC_OPTIONS} onChange={(v) => c({ metric: v })} />
          <TextField label="Label" value={element.label} onChange={(v) => c({ label: v })} />
          <ToggleField label="Afficher label" value={element.showLabel} onChange={(v) => c({ showLabel: v })} />
          <ToggleField label="Afficher valeur" value={element.showValue} onChange={(v) => c({ showValue: v })} />
          <NumberField label="Rayon" value={element.radius} onChange={(v) => c({ radius: v })} min={20} max={320} />
          <NumberField label="Épaisseur" value={element.thickness} onChange={(v) => c({ thickness: v })} min={4} max={160} />
          <NumberField label="Taille valeur" value={element.valueSize} onChange={(v) => c({ valueSize: v })} min={8} max={128} />
          <NumberField label="Max (jauge pleine)" value={element.max} onChange={(v) => c({ max: v })} min={1} max={5000} />
          <NumberField label="Start angle" value={element.startAngle} onChange={(v) => c({ startAngle: v })} min={0} max={360} />
          <NumberField label="Balayage" value={element.sweep} onChange={(v) => c({ sweep: v })} min={30} max={360} />
          <NumberField label="Seuil alerte" value={element.warnAt} onChange={(v) => c({ warnAt: v })} min={0} max={5000} />
          <ColorField label="Color" value={element.color} onChange={(v) => c({ color: v })} />
          <ColorField label="Alert color" value={element.warnColor} onChange={(v) => c({ warnColor: v })} />
          <ColorField label="Track color" value={element.trackColor} onChange={(v) => c({ trackColor: v })} />
        </>
      )}

      {element.type === 'bar' && (
        <>
          <SelectField label="Metric" value={element.metric} options={METRIC_OPTIONS} onChange={(v) => c({ metric: v })} />
          <TextField label="Label" value={element.label} onChange={(v) => c({ label: v })} />
          <ToggleField label="Afficher label" value={element.showLabel} onChange={(v) => c({ showLabel: v })} />
          <ToggleField label="Afficher valeur" value={element.showValue} onChange={(v) => c({ showValue: v })} />
          <NumberField label="Largeur" value={element.width} onChange={(v) => c({ width: v })} min={20} max={620} />
          <NumberField label="Hauteur" value={element.height} onChange={(v) => c({ height: v })} min={6} max={120} />
          <NumberField label="Taille texte" value={element.valueSize} onChange={(v) => c({ valueSize: v })} min={8} max={128} />
          <NumberField label="Max (barre pleine)" value={element.max} onChange={(v) => c({ max: v })} min={1} max={5000} />
          <NumberField label="Seuil alerte" value={element.warnAt} onChange={(v) => c({ warnAt: v })} min={0} max={5000} />
          <ColorField label="Color" value={element.color} onChange={(v) => c({ color: v })} />
          <ColorField label="Alert color" value={element.warnColor} onChange={(v) => c({ warnColor: v })} />
          <ColorField label="Track color" value={element.trackColor} onChange={(v) => c({ trackColor: v })} />
        </>
      )}

      {element.type === 'text' && (
        <>
          <TextField
            label="Texte"
            value={element.text}
            onChange={(v) => c({ text: v })}
            placeholder="Texte ou {cpu} {gpu} {liquid}"
          />
          <p className="text-[10px] text-gray-600 -mt-1">
            Tokens : <span className="font-mono text-gray-500">{'{cpu} {gpu} {liquid} {pump}'}</span>
          </p>
          <NumberField label="Taille" value={element.size} onChange={(v) => c({ size: v })} min={8} max={128} />
          <SelectField
            label="Alignement"
            value={element.align}
            options={[
              { value: 'left', label: 'Gauche' },
              { value: 'center', label: 'Centered' },
              { value: 'right', label: 'Droite' }
            ]}
            onChange={(v) => c({ align: v })}
          />
          <ColorField label="Color" value={element.color} onChange={(v) => c({ color: v })} />
        </>
      )}
    </div>
  )
}
