import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import GlassCard from './GlassCard';
import { useUIState } from '../../context/UIContext';

/**
 * ErrorBoundaryInner atrapa errores en componentes hijos y muestra una UI de fallback
 * evitando que la aplicación completa muestre una pantalla en blanco.
 * Soporta modo modular (por defecto) o fullPage.
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
    console.error(`[ErrorBoundary] Atrapó un error en ${this.props.moduleName || 'módulo'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  render() {
    const { isGlass, fullPage = false, moduleName } = this.props;

    if (this.state.hasError) {
      if (fullPage) {
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
                Ha ocurrido un error inesperado. Por favor, recargá la página para intentarlo de nuevo.
              </p>
              <button
                aria-label="Recargar página completa"
                type="button"
                onClick={() => window.location.reload()}
                className="w-full min-h-[44px] py-3.5 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-xl hover:from-red-500 hover:to-red-700 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <RefreshCcw size={20} />
                Recargar página
              </button>
            </GlassCard>
          </div>
        );
      }

      // Fallback modular: preserva el header, navbar y bottom nav intactos
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full py-8 md:py-12 px-2 sm:px-4 flex items-center justify-center animate-fade-in"
        >
          <GlassCard className={`w-full max-w-md p-6 sm:p-8 text-center ${
            isGlass ? 'border-red-500/30 bg-white/5' : 'bg-white border-red-200 shadow-xl'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
              isGlass ? 'bg-red-500/20 border-red-500/30' : 'bg-red-50 border-red-200'
            }`}>
              <AlertTriangle className={isGlass ? 'text-red-400' : 'text-red-500'} size={32} />
            </div>
            
            <h2 className={`text-xl font-bold mb-2 ${isGlass ? 'text-white' : 'text-gray-800'}`}>
              {moduleName ? `Error en ${moduleName}` : 'Algo salió mal en esta sección'}
            </h2>
            
            <p className={`text-sm mb-6 ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
              Ocurrió un problema inesperado al cargar este módulo. Podés reintentar la carga o volver al inicio.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                aria-label={`Reintentar carga de ${moduleName || 'la sección'}`}
                type="button"
                onClick={this.handleReset}
                className="flex-1 min-h-[44px] py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <RefreshCcw size={18} />
                Reintentar
              </button>

              <button
                aria-label="Volver al Dashboard"
                type="button"
                onClick={this.handleGoHome}
                className={`flex-1 min-h-[44px] py-2.5 px-4 font-bold rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 ${
                  isGlass
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                }`}
              >
                <Home size={18} />
                Volver al Dashboard
              </button>
            </div>
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
