import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'

type VisibilityCallback = (visible: boolean) => void

const listeners = new Set<VisibilityCallback>()
let currentlyVisible = true

// Global singleton — one Tauri listener shared across all callers.
let initialized = false
function init() {
  if (initialized) return
  initialized = true
  listen<boolean>('window-visibility', (e) => {
    currentlyVisible = e.payload
    listeners.forEach((cb) => cb(e.payload))
  })
}

export function useWindowVisibility(onVisibilityChange: VisibilityCallback) {
  const cbRef = useRef(onVisibilityChange)
  cbRef.current = onVisibilityChange

  useEffect(() => {
    init()
    const cb: VisibilityCallback = (v) => cbRef.current(v)
    listeners.add(cb)
    // Fire immediately with current state so callers don't need to guess.
    cbRef.current(currentlyVisible)
    return () => { listeners.delete(cb) }
  }, [])
}
