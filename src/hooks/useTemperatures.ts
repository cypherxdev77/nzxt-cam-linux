import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { useWindowVisibility } from './useWindowVisibility'

export function useTemperatures() {
  const { state, dispatch } = useApp()
  const [intervalMs, setIntervalMs] = useState<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    api.getSettings()
      .then((s) => setIntervalMs(typeof s?.pollIntervalMs === 'number' ? s.pollIntervalMs : 1000))
      .catch(() => setIntervalMs(1000))
  }, [])

  useEffect(() => {
    if (intervalMs == null) return
    let unlisten: (() => void) | null = null

    api.startTempPolling(intervalMs)
    intervalRef.current = intervalMs

    api.onTemperaturesUpdate((temps) => {
      dispatch({ type: 'SET_TEMPERATURES', payload: temps })
    }).then((un) => { unlisten = un })

    api.getTemperatures().then((temps) => {
      dispatch({ type: 'SET_TEMPERATURES', payload: temps })
    })

    return () => {
      api.stopTempPolling()
      if (unlisten) unlisten()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs])

  // Suspend UI temp polling when window is hidden, resume when shown.
  useWindowVisibility((visible) => {
    if (intervalRef.current == null) return
    if (visible) {
      api.startTempPolling(intervalRef.current)
      api.getTemperatures().then((temps) => {
        dispatch({ type: 'SET_TEMPERATURES', payload: temps })
      })
    } else {
      api.stopTempPolling()
    }
  })

  return state.temperatures
}
