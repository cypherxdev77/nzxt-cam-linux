import { useApp } from '../context/AppContext'
import { useIPC } from '../hooks/useIPC'
import { api } from '../lib/api'

const IUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const IThermo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
)

export function MediaUploader() {
  const { state, dispatch } = useApp()
  const { accent } = state
  const { sendImage, sendGif, startTempMode, openFile } = useIPC()
  const controllable = state.deviceStatus.lcdControllable || !state.deviceStatus.connected

  const handleClick = async () => {
    if (state.currentMode === 'temperatures') {
      await startTempMode()
      return
    }
    const path = await openFile(state.currentMode === 'gif' ? 'gif' : 'image')
    if (!path) return
    if (state.currentMode === 'image') {
      dispatch({ type: 'SET_IMAGE_PREVIEW', payload: api.fileUrl(path) })
    } else if (state.currentMode === 'gif') {
      dispatch({ type: 'SET_GIF_PREVIEW', payload: api.fileUrl(path) })
    }
    if (state.currentMode === 'image') {
      dispatch({ type: 'SET_IMAGE_PATH', payload: path })
      await sendImage(path)
    } else if (state.currentMode === 'gif') {
      dispatch({ type: 'SET_GIF_PATH', payload: path })
      await sendGif(path)
    }
  }

  if (state.currentMode === 'temperatures') {
    return (
      <div
        onClick={controllable ? handleClick : undefined}
        style={{
          width: '100%', padding: '28px 20px', borderRadius: 10,
          border: `1px solid ${accent}33`, background: `${accent}0a`,
          cursor: controllable ? 'pointer' : 'not-allowed',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          opacity: state.isLoading ? 0.6 : 1, transition: 'all 150ms',
        }}
      >
        <span style={{ color: accent, opacity: 0.7 }}><IThermo/></span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 4 }}>
            {state.isLoading ? 'Starting…' : 'Start Temperature mode'}
          </div>
          <div style={{ fontSize: 11, color: '#484848' }}>Affiche CPU, GPU et liquide sur le LCD</div>
        </div>
      </div>
    )
  }

  const hint = state.currentMode === 'gif' ? 'GIF animé — max 50 MB' : 'JPG, PNG, WebP — max 50 MB'

  return (
    <div
      onClick={controllable ? handleClick : undefined}
      style={{
        width: '100%', padding: '32px 20px', borderRadius: 10,
        border: `1px dashed ${controllable ? '#2e2e2e' : '#1e1e1e'}`,
        background: '#0d0d0d',
        cursor: controllable ? 'pointer' : 'not-allowed',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        opacity: state.isLoading || !controllable ? 0.5 : 1, transition: 'all 150ms',
      }}
      onMouseEnter={e => { if (controllable && !state.isLoading) (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}55` }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2e2e2e' }}
    >
      <span style={{ color: '#484848' }}><IUpload/></span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#c0c0c0', marginBottom: 5 }}>
          {state.isLoading ? 'Envoi en cours…' : 'Cliquer pour choisir un fichier'}
        </div>
        <div style={{ fontSize: 11, color: '#484848' }}>{hint}</div>
        {!controllable && (
          <div style={{ fontSize: 10, color: '#ffb347', marginTop: 6 }}>Device non contrôlable</div>
        )}
      </div>
    </div>
  )
}
