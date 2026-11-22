import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { restoreRememberedSession } from './services/sessionService'
import { initTheme } from './services/themeService'
import { requestPersistentStorage } from './services/imageCompression'
import { setupPwa } from './services/pwaService'

initTheme()
void requestPersistentStorage()
void setupPwa()

const root = createRoot(document.getElementById('root'))

restoreRememberedSession()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error) => {
    console.error('No se pudo restaurar la sesion recordada:', error)
    root.render(
      <StrictMode>
        <App startupError="No se pudo recuperar la sesión guardada. Conéctate e inicia sesión de nuevo." />
      </StrictMode>,
    )
  })
