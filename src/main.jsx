import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { restoreRememberedSession } from './services/sessionService'

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
        <App startupError="No se pudo recuperar la sesion local. Conectate e inicia sesion de nuevo." />
      </StrictMode>,
    )
  })
