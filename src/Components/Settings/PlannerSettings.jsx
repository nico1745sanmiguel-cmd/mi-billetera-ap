import React, { useState } from 'react';
import { Settings, Save, LayoutList, EyeOff, FolderOpen, ArrowDownUp, AlertTriangle } from 'lucide-react';
import { CACHE_KEYS } from '../../config/constants';
import { getCache, setCache } from '../../utils/cache';
import { formatInputNumber, parseInputNumber } from '../../utils';

export const getPlannerSettings = () => {
    return getCache(CACHE_KEYS.PLANNER_SETTINGS) || {
        compactView: false,
        hideCompleted: false,
        initialState: 'default', // 'default', 'expanded', 'collapsed'
        sortBy: 'date', // 'date', 'price_desc', 'alpha'
        budgetAlert: 0
    };
};

export default function PlannerSettings({ isGlass, onBack: _onBack }) {
    const [settings, setSettings] = useState(getPlannerSettings());
    const [saved, setSaved] = useState(false);

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        setCache(CACHE_KEYS.PLANNER_SETTINGS, settings);
        window.dispatchEvent(new CustomEvent('plannerSettingsChanged'));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const card = `rounded-2xl p-4 transition-all ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className="space-y-4 animate-fade-in">
            {/* VISTA COMPACTA */}
            <div className={card}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center shrink-0">
                        <LayoutList size={16} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${text}`}>Vista Compacta</h3>
                        <p className={`text-xs ${sub}`}>Tarjetas más chicas para listas largas</p>
                    </div>
                </div>
                
                <div className={`flex items-center w-full rounded-xl p-1 ${isGlass ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <button aria-label="Acción" type="button"
                        onClick={() => updateSetting('compactView', false)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${!settings.compactView ? (isGlass ? 'bg-fuchsia-500 text-white shadow-md' : 'bg-white text-fuchsia-600 shadow-sm') : (isGlass ? 'text-white/50' : 'text-gray-500')}`}
                    >
                        Normal
                    </button>
                    <button aria-label="Acción" type="button"
                        onClick={() => updateSetting('compactView', true)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${settings.compactView ? (isGlass ? 'bg-fuchsia-500 text-white shadow-md' : 'bg-white text-fuchsia-600 shadow-sm') : (isGlass ? 'text-white/50' : 'text-gray-500')}`}
                    >
                        Compacta
                    </button>
                </div>
            </div>

            {/* OCULTAR COMPLETADOS */}
            <div className={card}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center shrink-0">
                            <EyeOff size={16} />
                        </div>
                        <div>
                            <h3 className={`font-bold text-sm ${text}`}>Ocultar Completados</h3>
                            <p className={`text-xs ${sub}`}>Los ítems listos se esconden automáticamente</p>
                        </div>
                    </div>
                    <button aria-label="Acción" type="button"
                        onClick={() => updateSetting('hideCompleted', !settings.hideCompleted)}
                        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${settings.hideCompleted ? 'bg-fuchsia-500' : (isGlass ? 'bg-white/20' : 'bg-gray-200')}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${settings.hideCompleted ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            {/* ESTADO INICIAL DE CATEGORÍAS */}
            <div className={card}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center shrink-0">
                        <FolderOpen size={16} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${text}`}>Estado Inicial</h3>
                        <p className={`text-xs ${sub}`}>¿Cómo se abren las categorías por defecto?</p>
                    </div>
                </div>
                
                <div className="space-y-2">
                    {[
                        { id: 'default', label: 'Por Defecto (Solo algunas abiertas)' },
                        { id: 'expanded', label: 'Todo Expandido' },
                        { id: 'collapsed', label: 'Todo Colapsado' }
                    ].map(opt => (
                        <button aria-label="Acción" type="button" key={opt.id}
                            onClick={() => updateSetting('initialState', opt.id)}
                            className={`w-full text-left p-3 rounded-xl border text-sm font-semibold transition-colors ${
                                settings.initialState === opt.id
                                    ? (isGlass ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300' : 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700')
                                    : (isGlass ? 'bg-white/5 border-white/10 text-white/70' : 'bg-white border-gray-100 text-gray-600')
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ORDEN DE ITEMS */}
            <div className={card}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center shrink-0">
                        <ArrowDownUp size={16} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${text}`}>Orden de ítems</h3>
                        <p className={`text-xs ${sub}`}>¿Cómo ordenar los elementos pendientes?</p>
                    </div>
                </div>
                
                <div className={`flex items-center w-full rounded-xl p-1 ${isGlass ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {[
                        { id: 'date', label: 'Fecha' },
                        { id: 'price_desc', label: 'Mayor Precio' },
                        { id: 'alpha', label: 'Alfabético' }
                    ].map(opt => (
                        <button aria-label="Acción" type="button" key={opt.id}
                            onClick={() => updateSetting('sortBy', opt.id)}
                            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${settings.sortBy === opt.id ? (isGlass ? 'bg-fuchsia-500 text-white shadow-md' : 'bg-white text-fuchsia-600 shadow-sm') : (isGlass ? 'text-white/50' : 'text-gray-500')}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ALERTA DE PRESUPUESTO */}
            <div className={card}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center shrink-0">
                        <AlertTriangle size={16} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${text}`}>Alerta de Presupuesto</h3>
                        <p className={`text-xs ${sub}`}>Avisa si el presupuesto total supera este monto (0 para apagar)</p>
                    </div>
                </div>
                
                <div className={`flex items-center rounded-xl px-3 border w-full ${isGlass ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <span className={`text-xs mr-2 font-bold ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                    <input autoComplete="off" id="input-field"
                        type="tel"
                        className={`w-full bg-transparent outline-none text-sm font-bold text-left py-2.5 ${isGlass ? 'text-white' : 'text-gray-800'}`}
                        placeholder="0"
                        value={formatInputNumber(String(settings.budgetAlert))}
                        onChange={e => updateSetting('budgetAlert', parseInputNumber(e.target.value))}
                    />
                </div>
            </div>

            {/* GUARDAR */}
            <button aria-label="Acción" type="button"
                onClick={handleSave}
                className={`w-full py-3 mt-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                    saved
                        ? 'bg-green-500 text-white'
                        : (isGlass ? 'bg-fuchsia-500 text-white hover:bg-fuchsia-400' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700')
                }`}
            >
                <Save size={18} />
                {saved ? '¡Guardado!' : 'Guardar Cambios'}
            </button>
        </div>
    );
}
