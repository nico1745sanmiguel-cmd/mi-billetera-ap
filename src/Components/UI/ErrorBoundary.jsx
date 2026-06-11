import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import GlassCard from './GlassCard';
import { useUIState } from '../../context/UIContext';

/**
 * ErrorBoundaryInner atrapa errores en componentes hijos y muestra una UI de fallback
 * evitando que la aplicación completa muestre una pantalla en blanco.
 */
class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary atrapó un error:', error, errorInfo);
  }

  render() {
    const { isGlass } = this.props;

    if (this.state.hasError) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
          isGlass 
            ? 'bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]'
            : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'
        }`}>
          <GlassCard className={`w-full max-w-md p-8 text-center animate-fade-in ${
            isGlass ? 'border-red-500/30' : 'bg-white border-red-200 shadow-xl'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border ${
              isGlass ? 'bg-red-500/20 border-red-500/30' : 'bg-red-50 border-red-200'
            }`}>
              <AlertTriangle className={isGlass ? 'text-red-400' : 'text-red-500'} size={40} />
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${isGlass ? 'text-white' : 'text-gray-800'}`}>Algo salió mal</h1>
            <p className={`text-sm mb-6 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
              Ha ocurrido un error inesperado al cargar esta sección. Por favor, recarga la página para intentarlo de nuevo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-xl hover:from-red-500 hover:to-red-700 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCcw size={20} />
              Recargar página
            </button>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary(props) {
  const { isGlass } = useUIState();
  return <ErrorBoundaryInner isGlass={isGlass} {...props} />;
}
