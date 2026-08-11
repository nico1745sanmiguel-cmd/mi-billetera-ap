export { SavingsProvider, useSavings } from './context/SavingsContext';

// Hooks
export { useSavingsData } from './hooks/useSavingsData';
export { useSavingsGoal } from './hooks/useSavingsGoal';
export { useSavingsPrices } from './hooks/useSavingsPrices';
export { useSavingsStopLoss } from './hooks/useSavingsStopLoss';
export { useSavingsCalculations } from './hooks/useSavingsCalculations';

// Components - operations
export { default as OperationModal } from './components/operations/OperationModal';
export { default as TradeForm } from './components/operations/TradeForm';
export { default as CaucionForm } from './components/operations/CaucionForm';
export { default as CouponForm } from './components/operations/CouponForm';

// Components - portfolio
export { default as PortfolioTab } from './components/portfolio/PortfolioTab';
export { default as ResumenPortfolio } from './components/portfolio/ResumenPortfolio';
export { default as TenenciasLista } from './components/portfolio/TenenciasLista';
export { default as CaucionesActivas } from './components/portfolio/CaucionesActivas';
