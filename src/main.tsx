import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { getCurrentWindow } from '@tauri-apps/api/window'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Show window only after React has painted — eliminates white flash
getCurrentWindow().show()
