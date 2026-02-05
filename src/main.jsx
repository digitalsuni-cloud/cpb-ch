import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PriceBookProvider } from './context/PriceBookContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PriceBookProvider>
      <App />
    </PriceBookProvider>
  </StrictMode>,
)
