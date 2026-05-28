/**
 * Tauri API wrapper — replaces the Electron `window.api` (preload contextBridge).
 *
 * All commands are typed and follow the Rust backend in src-tauri/src/commands.rs.
 * Tauri 2 converts JS camelCase arguments to Rust snake_case parameters automatically,
 * and our Rust structs use `#[serde(rename_all = "camelCase")]` so the wire format
 * is identical to the old Electron IPC.
 */
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { DisplayConfig } from '@shared/display'

// ============================================================================
// Types — mirror Rust types
// ============================================================================
export interface DeviceStatus {
  connected: boolean
  productName: string
  pid: number | null
  error: string | null
  lcdControllable: boolean
}

export interface Temperatures {
  cpu: number
  gpu: number
  liquid: number
  pumpRpm: number
}

export interface GpuSource {
  id: string
  label: string
  pci: string
  tempPath: string
  discrete: boolean
}

export interface AppSettings {
  gpuSource: string | null
  selectedDevice: string
  pollIntervalMs: number
  lcdPollMs: number
  lcdMinPushMs: number
  decimals: number
}

export interface CommandResult {
  success: boolean
  error?: string
}

export interface PreviewResult {
  success: boolean
  dataUrl?: string
  error?: string
}

export interface SaveSettingsResult {
  success: boolean
  settings: AppSettings
}

export interface FileFilter {
  name: string
  extensions: string[]
}

// ============================================================================
// Ring LED types
// ============================================================================
export type RingSpeed = 'slowest' | 'slower' | 'normal' | 'faster' | 'fastest'

/** 0x01 = external/accessories, 0x02 = ring/fans, 0x04 = logo, 0x07 = all */
export type RingChannel = 'ch01' | 'ch02' | 'ch04' | 'ch07'

export type RingMode =
  | { mode: 'off' }
  | { mode: 'fixed'; r: number; g: number; b: number }
  | { mode: 'breathing'; r: number; g: number; b: number; speed: RingSpeed }
  | { mode: 'pulse'; r: number; g: number; b: number; speed: RingSpeed }
  | { mode: 'fading'; colors: [number, number, number][]; speed: RingSpeed }
  | { mode: 'spectrumWave'; speed: RingSpeed }
  | { mode: 'rainbowFlow'; speed: RingSpeed }
  | { mode: 'rainbowPulse'; speed: RingSpeed }
  | { mode: 'superRainbow'; speed: RingSpeed }
  | { mode: 'marquee'; r: number; g: number; b: number; speed: RingSpeed }
  | { mode: 'staryNight'; r: number; g: number; b: number; speed: RingSpeed }

// ============================================================================
// API surface
// ============================================================================
export const api = {
  // --- Device ---
  getDeviceStatus: () => invoke<DeviceStatus>('get_device_status'),
  connectDevice: () => invoke<CommandResult>('connect_device'),

  // --- Modes ---
  sendColor: (r: number, g: number, b: number) =>
    invoke<CommandResult>('send_color', { r, g, b }),
  sendImage: (path: string) => invoke<CommandResult>('send_image', { path }),
  sendGif: (path: string) => invoke<CommandResult>('send_gif', { path }),
  startTempMode: () => invoke<CommandResult>('start_temp_mode'),
  stopCurrentMode: () => invoke<CommandResult>('stop_current_mode'),

  // --- Temperature polling ---
  getTemperatures: () => invoke<Temperatures>('get_temperatures'),
  startTempPolling: (intervalMs?: number) =>
    invoke<CommandResult>('start_temp_polling', { intervalMs }),
  stopTempPolling: () => invoke<CommandResult>('stop_temp_polling'),

  // --- Display config / preview ---
  getDisplayConfig: () => invoke<DisplayConfig>('get_display_config'),
  saveDisplayConfig: (config: DisplayConfig) =>
    invoke<CommandResult>('save_display_config', { configIn: config }),
  renderDisplayPreview: (config: DisplayConfig) =>
    invoke<PreviewResult>('render_display_preview', { configIn: config }),

  // --- Settings ---
  listGpuSources: () => invoke<GpuSource[]>('list_gpu_sources'),
  getSettings: () => invoke<AppSettings>('get_settings'),
  saveSettings: async (patch: Partial<AppSettings>): Promise<SaveSettingsResult> => {
    // Backend expects a full AppSettings — merge with current values.
    const current = await invoke<AppSettings>('get_settings')
    const merged: AppSettings = { ...current, ...patch }
    return invoke<SaveSettingsResult>('save_settings', { settings: merged })
  },

  // --- Ring LED ---
  sendRing: (mode: RingMode, channel: RingChannel) =>
    invoke<CommandResult>('send_ring', { mode, channel }),

  // --- Profiles ---
  listProfiles: () => invoke<ProfileSummary[]>('list_profiles'),
  saveProfile: (p: Profile) => invoke<CommandResult>('save_profile_cmd', { p }),
  deleteProfile: (name: string) => invoke<CommandResult>('delete_profile_cmd', { name }),
  getProfile: (name: string) => invoke<Profile>('get_profile', { name }),
  applyProfile: (name: string) => invoke<CommandResult>('apply_profile', { name }),

  // --- Window ---
  hideWindow:   () => invoke<void>('hide_window'),
  quitApp:      () => invoke<void>('quit_app'),
  getAutostart: () => invoke<boolean>('get_autostart'),
  setAutostart: (enabled: boolean) => invoke<void>('set_autostart', { enabled }),

  // --- Misc ---
  openExternal: (url: string) => invoke<CommandResult>('open_external', { url }),

  // --- File dialog (uses Tauri 2 dialog plugin directly) ---
  openFileDialog: async (filters: FileFilter[]): Promise<string | null> => {
    const result = await openDialog({ multiple: false, directory: false, filters })
    return typeof result === 'string' ? result : null
  },

  // --- Local file URL conversion (replaces file:// which Tauri webview blocks) ---
  fileUrl: (path: string): string => convertFileSrc(path),

  // --- Events ---
  onDeviceStatusChanged: (cb: (status: DeviceStatus) => void): Promise<UnlistenFn> =>
    listen<DeviceStatus>('device-status-changed', (e) => cb(e.payload)),

  onTemperaturesUpdate: (cb: (temps: Temperatures) => void): Promise<UnlistenFn> =>
    listen<Temperatures>('temperatures-update', (e) => cb(e.payload))
}

// ============================================================================
// Profile types
// ============================================================================
export type ProfileLcd =
  | { type: 'color'; r: number; g: number; b: number }
  | { type: 'image'; path: string }
  | { type: 'gif'; path: string }
  | { type: 'temperatures' }
  | { type: 'none' }

export interface ProfileRingData {
  channel: RingChannel
  mode: RingMode
}

export interface Profile {
  name: string
  lcd: ProfileLcd
  ring?: ProfileRingData
  displayConfig?: unknown
}

export interface ProfileSummary {
  name: string
  lcdType: string
}

export type Api = typeof api
