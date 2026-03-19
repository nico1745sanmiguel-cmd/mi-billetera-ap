import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { FinancialProvider } from './context/FinancialContext'
import './index.css' // <--- ¡ESTA ES LA LÍNEA MÁGICA!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FinancialProvider>
      <App />
    </FinancialProvider>
  </React.StrictMode>,
)