import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { DisplayConfig } from '@shared/display'
import { DeviceStatus, Temperatures } from '../lib/api'

export type Section = 'monitoring' | 'cooling' | 'lighting' | 'lcd' | 'settings'
type Mode = 'image' | 'gif' | 'temperatures'

interface AppState {
  // UI navigation
  section: Section
  accent: string
  compact: boolean
  tempUnit: '°C' | '°F'
  // Device
  deviceStatus: DeviceStatus
  temperatures: Temperatures
  // LCD
  currentMode: Mode
  currentImagePath: string | null
  currentGifPath: string | null
  imagePreviewUrl: string | null
  gifPreviewUrl: string | null
  isLoading: boolean
  error: string | null
  // What's actually on the LCD right now
  lcdApplied: { mode: 'image' | 'gif' | 'temperatures'; url?: string } | null
  // Display editor
  displayConfig: DisplayConfig | null
  selectedElementId: string | null
}

type Action =
  | { type: 'SET_SECTION'; payload: Section }
  | { type: 'SET_ACCENT'; payload: string }
  | { type: 'SET_COMPACT'; payload: boolean }
  | { type: 'SET_TEMP_UNIT'; payload: '°C' | '°F' }
  | { type: 'SET_DEVICE_STATUS'; payload: DeviceStatus }
  | { type: 'SET_TEMPERATURES'; payload: Temperatures }
  | { type: 'SET_MODE'; payload: Mode }
  | { type: 'SET_IMAGE_PATH'; payload: string }
  | { type: 'SET_GIF_PATH'; payload: string }
  | { type: 'SET_IMAGE_PREVIEW'; payload: string | null }
  | { type: 'SET_GIF_PREVIEW'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LCD_APPLIED'; payload: { mode: 'image' | 'gif' | 'temperatures'; url?: string } | null }
  | { type: 'SET_DISPLAY_CONFIG'; payload: DisplayConfig }
  | { type: 'SELECT_ELEMENT'; payload: string | null }

const initialState: AppState = {
  section: 'monitoring',
  accent: '#9d4edd',
  compact: false,
  tempUnit: '°C',
  deviceStatus: { connected: false, productName: 'Non détecté', pid: null, error: null, lcdControllable: false },
  temperatures: { cpu: 0, gpu: 0, liquid: 0, pumpRpm: 0 },
  currentMode: 'image',
  currentImagePath: null,
  currentGifPath: null,
  imagePreviewUrl: null,
  gifPreviewUrl: null,
  isLoading: false,
  error: null,
  lcdApplied: null,
  displayConfig: null,
  selectedElementId: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SECTION':       return { ...state, section: action.payload }
    case 'SET_ACCENT':        return { ...state, accent: action.payload }
    case 'SET_COMPACT':       return { ...state, compact: action.payload }
    case 'SET_TEMP_UNIT':     return { ...state, tempUnit: action.payload }
    case 'SET_DEVICE_STATUS': return { ...state, deviceStatus: action.payload }
    case 'SET_TEMPERATURES':  return { ...state, temperatures: action.payload }
    case 'SET_MODE':          return { ...state, currentMode: action.payload }
    case 'SET_IMAGE_PATH':    return { ...state, currentImagePath: action.payload }
    case 'SET_GIF_PATH':      return { ...state, currentGifPath: action.payload }
    case 'SET_IMAGE_PREVIEW': return { ...state, imagePreviewUrl: action.payload }
    case 'SET_GIF_PREVIEW':   return { ...state, gifPreviewUrl: action.payload }
    case 'SET_LOADING':       return { ...state, isLoading: action.payload }
    case 'SET_ERROR':         return { ...state, error: action.payload }
    case 'SET_LCD_APPLIED':   return { ...state, lcdApplied: action.payload }
    case 'SET_DISPLAY_CONFIG':return { ...state, displayConfig: action.payload }
    case 'SELECT_ELEMENT':    return { ...state, selectedElementId: action.payload }
    default: return state
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
