import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// When a new service worker takes control, reload to load fresh assets (Chrome/Android)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

// iOS fallback: SW updates are unreliable on Safari. Poll /version.json and hard-reload
// when the deployed version differs from the one loaded at session start.
if (import.meta.env.PROD) {
  const VERSION_KEY = 'app_version'

  const checkForUpdate = async () => {
    try {
      const res = await fetch('/version.json', { cache: 'no-store' })
      if (!res.ok) return
      const { v } = await res.json()
      const stored = sessionStorage.getItem(VERSION_KEY)
      if (stored && stored !== v) {
        window.location.reload()
        return
      }
      if (!stored) sessionStorage.setItem(VERSION_KEY, v)
    } catch {
      // offline — silently ignore
    }
  }

  checkForUpdate()
  setInterval(checkForUpdate, 5 * 60 * 1000)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
