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
import { MobilityProvider } from './context/MobilityContext'
import { SalaryProvider } from './context/SalaryContext'
import ErrorBoundary from './Components/UI/ErrorBoundary'
import './index.css' // <--- ¡ESTA ES LA LÍNEA MÁGICA!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <UIProvider>
        <CardsProvider>
          <SupermarketProvider>
            <ServicesProvider>
              <SavingsProvider>
                <FinancialProvider>
                  <MobilityProvider>
                    <SalaryProvider>
                      <BrowserRouter>
                        <ErrorBoundary>
                          <App />
                        </ErrorBoundary>
                      </BrowserRouter>
                    </SalaryProvider>
                  </MobilityProvider>
                </FinancialProvider>
              </SavingsProvider>
            </ServicesProvider>
          </SupermarketProvider>
        </CardsProvider>
      </UIProvider>
    </AuthProvider>
  </React.StrictMode>,
)