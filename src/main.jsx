import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { FinancialProvider } from './context/FinancialContext'
import { UIProvider } from './context/UIContext'
import { AuthProvider } from './context/AuthContext'
import { CardsProvider } from './context/CardsContext'
import { SupermarketProvider } from './context/SupermarketContext'
import { ServicesProvider } from './context/ServicesContext'
import { SavingsProvider } from './context/SavingsContext'
import ErrorBoundary from './Components/UI/ErrorBoundary'
import './index.css' // <--- ¡ESTA ES LA LÍNEA MÁGICA!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CardsProvider>
        <SupermarketProvider>
          <ServicesProvider>
            <SavingsProvider>
              <FinancialProvider>
                <UIProvider>
                  <BrowserRouter>
                    <ErrorBoundary>
                      <App />
                    </ErrorBoundary>
                  </BrowserRouter>
                </UIProvider>
              </FinancialProvider>
            </SavingsProvider>
          </ServicesProvider>
        </SupermarketProvider>
      </CardsProvider>
    </AuthProvider>
  </React.StrictMode>,
)