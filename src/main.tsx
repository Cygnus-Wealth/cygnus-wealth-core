import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeWarningSuppression } from './utils/suppressWarnings'

// Suppress known third-party library warnings in development
if (import.meta.env.DEV) {
  initializeWarningSuppression();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
