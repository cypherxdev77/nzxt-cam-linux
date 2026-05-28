import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

export function useDevice() {
  const { state, dispatch } = useApp()

  useEffect(() => {
    let unlistenStatus: (() => void) | null = null

    // Initial status fetch + try a connection attempt.
    api.getDeviceStatus().then((status) => {
      dispatch({ type: 'SET_DEVICE_STATUS', payload: status })
      if (!status.connected) {
        api.connectDevice().then(() => api.getDeviceStatus()).then((s) => {
          dispatch({ type: 'SET_DEVICE_STATUS', payload: s })
        }).catch(() => {})
      }
    })

    api.onDeviceStatusChanged((status) => {
      dispatch({ type: 'SET_DEVICE_STATUS', payload: status })
    }).then((un) => { unlistenStatus = un })

    return () => {
      if (unlistenStatus) unlistenStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state.deviceStatus
}
