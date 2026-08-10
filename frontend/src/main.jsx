import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PlatformAdminApp from './components/PlatformAdminApp'

const isPlatformAdminRoute =
  window.location.pathname.split('/').filter(Boolean)[0] === 'plataforma'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isPlatformAdminRoute ? <PlatformAdminApp /> : <App />}
  </React.StrictMode>,
)
