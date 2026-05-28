import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

export function useIPC() {
  const { dispatch } = useApp()

  const sendImage = async (path: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const result = await api.sendImage(path)
      if (!result.success) dispatch({ type: 'SET_ERROR', payload: result.error ?? 'Erreur inconnue' })
      else dispatch({ type: 'SET_IMAGE_PATH', payload: path })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const sendGif = async (path: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const result = await api.sendGif(path)
      if (!result.success) dispatch({ type: 'SET_ERROR', payload: result.error ?? 'Erreur inconnue' })
      else dispatch({ type: 'SET_GIF_PATH', payload: path })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const startTempMode = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const result = await api.startTempMode()
      if (!result.success) dispatch({ type: 'SET_ERROR', payload: result.error ?? 'Erreur inconnue' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const openFile = async (type: 'image' | 'gif') => {
    const filters =
      type === 'image'
        ? [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
        : [{ name: 'GIF', extensions: ['gif'] }]
    return api.openFileDialog(filters)
  }

  return { sendImage, sendGif, startTempMode, openFile }
}
