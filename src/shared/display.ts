/**
 * Modèle de "scène" pour l'affichage personnalisable du LCD.
 * Partagé entre le frontend React et le backend Rust (via serde rename_all=camelCase).
 *
 * Tout est une liste d'éléments libres positionnés sur un canvas 640×640.
 * Les "layouts prédéfinis" sont des arrangements d'éléments pré-positionnés
 * (cf. PRESETS) que l'utilisateur peut ensuite déplacer / éditer librement.
 */

export const LCD_SIZE = 640

export type MetricId = 'cpu' | 'gpu' | 'liquid' | 'pump'
export type ElementType = 'gauge' | 'bar' | 'text'

export const METRIC_LABELS: Record<MetricId, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  liquid: 'Liquide',
  pump: 'Pompe'
}

export const METRIC_UNIT: Record<MetricId, string> = {
  cpu: '°',
  gpu: '°',
  liquid: '°',
  pump: ''
}

export const METRIC_MAX: Record<MetricId, number> = {
  cpu: 100,
  gpu: 100,
  liquid: 60,
  pump: 3000
}

interface ElementBase {
  id: string
  type: ElementType
  x: number
  y: number
}

export interface GaugeElement extends ElementBase {
  type: 'gauge'
  metric: MetricId
  radius: number
  thickness: number
  max: number
  color: string
  trackColor: string
  startAngle: number
  sweep: number
  warnColor: string
  warnAt: number
  showValue: boolean
  showLabel: boolean
  label: string
  valueSize: number
}

export interface BarElement extends ElementBase {
  type: 'bar'
  metric: MetricId
  width: number
  height: number
  max: number
  color: string
  trackColor: string
  warnColor: string
  warnAt: number
  showValue: boolean
  showLabel: boolean
  label: string
  valueSize: number
}

export interface TextElement extends ElementBase {
  type: 'text'
  text: string
  color: string
  size: number
  align: 'left' | 'center' | 'right'
}

export type DisplayElement = GaugeElement | BarElement | TextElement

export interface DisplayConfig {
  background: string
  elements: DisplayElement[]
  variant?: string
  decimals?: number
}

export function formatMetric(v: number, decimals = 0): string {
  const d = Math.max(0, Math.min(2, Math.floor(decimals)))
  return v.toFixed(d)
}

// --- Fabriques d'éléments (valeurs par défaut saines) ---

let idCounter = 0
export function genId(prefix = 'el'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`
}

export function makeGauge(metric: MetricId, overrides: Partial<GaugeElement> = {}): GaugeElement {
  return {
    id: genId('gauge'),
    type: 'gauge',
    metric,
    x: LCD_SIZE / 2,
    y: LCD_SIZE / 2,
    radius: 250,
    thickness: 38,
    max: METRIC_MAX[metric],
    color: '#00e696',
    trackColor: '#1c1c2a',
    startAngle: 0,
    sweep: 360,
    warnColor: '#ff4444',
    warnAt: metric === 'liquid' ? 50 : 85,
    showValue: true,
    showLabel: true,
    label: METRIC_LABELS[metric],
    valueSize: 64,
    ...overrides
  }
}

export function makeBar(metric: MetricId, overrides: Partial<BarElement> = {}): BarElement {
  return {
    id: genId('bar'),
    type: 'bar',
    metric,
    x: LCD_SIZE / 2,
    y: LCD_SIZE / 2,
    width: 380,
    height: 34,
    max: METRIC_MAX[metric],
    color: '#00e696',
    trackColor: '#1c1c2a',
    warnColor: '#ff4444',
    warnAt: metric === 'liquid' ? 50 : 85,
    showValue: true,
    showLabel: true,
    label: METRIC_LABELS[metric],
    valueSize: 32,
    ...overrides
  }
}

export function makeText(text: string, overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: genId('text'),
    type: 'text',
    text,
    x: LCD_SIZE / 2,
    y: LCD_SIZE / 2,
    color: '#ffffff',
    size: 32,
    align: 'center',
    ...overrides
  }
}

// --- Layouts prédéfinis ---

export interface Preset {
  id: string
  name: string
  description: string
  build: () => DisplayConfig
}

const BG = '#0a0a0f'

export const PRESETS: Preset[] = [
  {
    id: 'triple-rings',
    name: '3 anneaux',
    description: 'CPU, GPU et liquide en jauges concentriques',
    build: () => ({
      background: BG,
      elements: [
        makeGauge('cpu', { radius: 296, thickness: 38, showValue: false, showLabel: false }),
        makeGauge('gpu', { radius: 240, thickness: 38, color: '#00d4ff', showValue: false, showLabel: false }),
        makeGauge('liquid', { radius: 184, thickness: 38, color: '#b478ff', showValue: false, showLabel: false }),
        makeText('CPU', { x: 320, y: 244, size: 32, color: '#9aa0b4' }),
        makeText('{cpu}°', { x: 320, y: 300, size: 64 }),
        makeText('GPU  {gpu}°', { x: 320, y: 362, size: 16, color: '#00d4ff' }),
        makeText('LIQUIDE  {liquid}°', { x: 320, y: 392, size: 16, color: '#b478ff' })
      ]
    })
  },
  {
    id: 'single-cpu',
    name: 'CPU seul',
    description: 'Une grande jauge unique centrée',
    build: () => ({
      background: BG,
      elements: [
        makeGauge('cpu', { radius: 290, thickness: 46, valueSize: 128, label: 'CPU' })
      ]
    })
  },
  {
    id: 'single-gpu',
    name: 'GPU seul',
    description: 'Une grande jauge unique centrée',
    build: () => ({
      background: BG,
      elements: [
        makeGauge('gpu', { radius: 290, thickness: 46, color: '#00d4ff', valueSize: 128, label: 'GPU' })
      ]
    })
  },
  {
    id: 'single-liquid',
    name: 'Liquide seul',
    description: 'Température du liquide en grande jauge',
    build: () => ({
      background: BG,
      elements: [
        makeGauge('liquid', { radius: 290, thickness: 46, color: '#b478ff', valueSize: 128, label: 'LIQUIDE' })
      ]
    })
  },
  {
    id: 'dual-bars',
    name: '2 barres',
    description: 'CPU et GPU en barres horizontales (style CAM)',
    build: () => ({
      background: BG,
      elements: [
        makeBar('gpu', { x: 320, y: 285, color: '#00d4ff' }),
        makeBar('cpu', { x: 320, y: 390 })
      ]
    })
  },
  {
    id: 'big-number',
    name: 'Chiffre géant',
    description: 'Juste la température CPU en très grand',
    build: () => ({
      background: BG,
      elements: [
        makeText('CPU', { x: 320, y: 200, size: 32, color: '#9aa0b4' }),
        makeText('{cpu}°', { x: 320, y: 320, size: 128 })
      ]
    })
  }
]

export function defaultConfig(): DisplayConfig {
  return PRESETS[0].build()
}

export function resolveText(
  text: string,
  temps: { cpu: number; gpu: number; liquid: number; pumpRpm: number },
  decimals = 0
): string {
  const pick = (k: string): number => {
    if (k === 'cpu') return temps.cpu
    if (k === 'gpu') return temps.gpu
    if (k === 'liquid') return temps.liquid
    return temps.pumpRpm
  }
  return text.replace(/\{(cpu|gpu|liquid|pump)(?::(\d))?\}/gi, (_m, key, d) => {
    const dec = d != null ? parseInt(d, 10) : decimals
    return formatMetric(pick(key.toLowerCase()), dec)
  })
}
