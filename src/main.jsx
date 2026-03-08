import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PriceBookProvider } from './context/PriceBookContext.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfirmProvider>
      <PriceBookProvider>
        <App />
      </PriceBookProvider>
    </ConfirmProvider>
  </StrictMode>,
)
