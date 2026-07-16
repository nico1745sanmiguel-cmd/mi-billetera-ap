import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { CardsProvider } from './context/CardsContext';
import { SupermarketProvider } from './context/SupermarketContext';
import { ServicesProvider } from './context/ServicesContext';
import { SavingsProvider } from './context/SavingsContext';
import { MobilityProvider } from './context/MobilityContext';
import { SalaryProvider } from './context/SalaryContext';
import { NotesProvider } from './context/NotesContext';
import ErrorBoundary from './Components/UI/ErrorBoundary';

export default function AppProviders({ children }) {
    return (
        <AuthProvider>
            <UIProvider>
                <CardsProvider>
                    <SupermarketProvider>
                        <ServicesProvider>
                            <FinancialProvider>
                                <SavingsProvider>
                                    <MobilityProvider>
                                        <SalaryProvider>
                                            <NotesProvider>
                                                <BrowserRouter>
                                                    <ErrorBoundary>
                                                        {children}
                                                    </ErrorBoundary>
                                                </BrowserRouter>
                                            </NotesProvider>
                                        </SalaryProvider>
                                    </MobilityProvider>
                                </SavingsProvider>
                            </FinancialProvider>
                        </ServicesProvider>
                    </SupermarketProvider>
                </CardsProvider>
            </UIProvider>
        </AuthProvider>
    );
}
