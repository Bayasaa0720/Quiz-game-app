import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { isReduceAnimations } from './lib/prefs.js'

document.documentElement.classList.toggle('reduce-motion', isReduceAnimations())

// 1. Get the root element
const rootElement = document.getElementById('root')

// 2. Check if the element exists before trying to render
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
// If the element doesn't exist, the app won't render, which is expected behavior.