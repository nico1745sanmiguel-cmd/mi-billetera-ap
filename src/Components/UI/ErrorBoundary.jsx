import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import GlassCard from './GlassCard';

/**
 * ErrorBoundary atrapa errores en componentes hijos y muestra una UI de fallback
 * evitando que la aplicación completa muestre una pantalla en blanco.
 */
class ErrorBoundary extends React.Component {
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
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]">
          <GlassCard className="w-full max-w-md p-8 text-center animate-fade-in border-red-500/30">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/30">
              <AlertTriangle className="text-red-400" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Algo salió mal</h1>
            <p className="text-white/60 text-sm mb-6">
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

export default ErrorBoundary;
