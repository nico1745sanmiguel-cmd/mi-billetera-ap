import React, { Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { AVAILABLE_MODULES } from '../../config/modules';

// Importación lazy de las configuraciones específicas de cada módulo
// A medida que agreguemos más configuraciones, las importamos acá
const MobilitySettings = lazy(() => import('../Mobility/MobilitySettings'));

const LazyLoader = () => (
    <div className="flex justify-center items-center h-40 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export default function ModuleDetailSettings({ onBack }) {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { isGlass } = useUI();

    const moduleInfo = AVAILABLE_MODULES.find(m => m.id === moduleId);

    if (!moduleInfo) {
        return (
            <div className="space-y-4">
                <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/10 border border-white/10 text-white' : 'bg-white shadow-sm border border-gray-100 text-gray-800'}`}>
                    <h2 className="text-lg font-bold">Módulo no encontrado</h2>
                    <button aria-label="Acción" type="button" onClick={onBack || (() => navigate(-1))} className="mt-4 text-blue-500">Volver</button>
                </div>
            </div>
        );
    }

    const { label, description, icon: Icon, color, iconBg, iconColor } = moduleInfo;

    const renderSpecificSettings = () => {
        switch (moduleId) {
            case 'mobility':
                // MobilitySettings ya tiene su propia card y botón de guardar/volver.
                // Le pasamos el onBack para que regrese a la lista de módulos.
                return (
                    <Suspense fallback={<LazyLoader />}>
                        <MobilitySettings isGlass={isGlass} onBack={onBack || (() => navigate(-1))} />
                    </Suspense>
                );
            default:
                return (
                    <div className={`rounded-2xl p-6 text-center ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                        <span className="text-4xl mb-3 block">🚧</span>
                        <h3 className={`font-bold text-lg mb-2 ${isGlass ? 'text-white' : 'text-gray-800'}`}>Próximamente</h3>
                        <p className={`text-sm ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                            Las opciones avanzadas de personalización para el módulo <strong>{label}</strong> estarán disponibles en futuras actualizaciones.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-4 pb-10">
            {/* HEADER COMÚN */}
            <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg'}`}>
                <div className="flex items-center gap-3">
                    <button aria-label="Acción" type="button"
                        onClick={onBack || (() => navigate(-1))}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/20`}>
                            <Icon size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">{label}</h2>
                            <p className="text-white/70 text-xs truncate max-w-[200px] sm:max-w-xs">{description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENIDO ESPECÍFICO DEL MÓDULO */}
            {renderSpecificSettings()}
        </div>
    );
}
