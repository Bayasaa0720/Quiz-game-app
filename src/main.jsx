import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 1. Get the root element
const rootElement = document.getElementById('root')

// 2. Check if the element exists before trying to render
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
// If the element doesn't exist, the app won't render, which is expected behavior.