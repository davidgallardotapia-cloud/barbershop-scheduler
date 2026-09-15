import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PlatformAdminApp from './components/PlatformAdminApp'

const isPlatformAdminRoute =
  window.location.pathname.split('/').filter(Boolean)[0] === 'plataforma'

const root = document.getElementById('root')
// Only the landing is static at build time; other routes keep their existing mount.
delete root.dataset.prerendered
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {isPlatformAdminRoute ? <PlatformAdminApp /> : <App />}
  </React.StrictMode>,
)
