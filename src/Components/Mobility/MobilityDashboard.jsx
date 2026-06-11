import React, { useState } from 'react';
import { Plus, List, BarChart2, Upload, ArrowLeft, Zap } from 'lucide-react';
import { MobilityProvider } from '../../context/MobilityContext';
import MobilityForm from './MobilityForm';
import MobilityHistory from './MobilityHistory';
import MobilityStats from './MobilityStats';
import MobilityImport from './MobilityImport';
import MobilityExpenses from './MobilityExpenses';
import { useUI } from '../../context/UIContext';

const TABS = [
    { id: 'expenses', label: 'Gastos',    icon: Zap },
    { id: 'register', label: 'Jornada',   icon: Plus },
    { id: 'history',  label: 'Historial', icon: List },
    { id: 'stats',    label: 'Análisis',  icon: BarChart2 },
    { id: 'import',   label: 'Importar',  icon: Upload },
];

export default function MobilityDashboard({ onBack }) {
    const { isGlass, privacyMode } = useUI();
    const [tab, setTab] = useState('expenses');

    return (
        <MobilityProvider>
            <div className="space-y-4">
                {/* HEADER — sin ícono de auto, solo título y botón volver */}
                <div className={`rounded-2xl p-5 ${isGlass
                    ? 'bg-white/10 backdrop-blur-md border border-white/10'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                }`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Movilidad</h2>
                            <p className="text-white/70 text-xs">Uber · Didi · Cabify · Otros</p>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className={`flex rounded-2xl p-1.5 gap-1 ${isGlass
                    ? 'bg-white/10 border border-white/10'
                    : 'bg-gray-100'
                }`}>
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                                tab === id
                                    ? isGlass
                                        ? 'bg-violet-500/80 text-white shadow-md'
                                        : 'bg-white text-violet-700 shadow-sm'
                                    : isGlass
                                        ? 'text-white/50 hover:text-white/80'
                                        : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={13} />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>

                {/* CONTENIDO */}
                <div>
                    {tab === 'expenses' && <MobilityExpenses isGlass={isGlass} />}
                    {tab === 'register' && <MobilityForm isGlass={isGlass} onSuccess={() => setTab('history')} />}
                    {tab === 'history'  && <MobilityHistory isGlass={isGlass} privacyMode={privacyMode} />}
                    {tab === 'stats'    && <MobilityStats isGlass={isGlass} privacyMode={privacyMode} />}
                    {tab === 'import'   && <MobilityImport isGlass={isGlass} onSuccess={() => setTab('history')} />}
                </div>
            </div>
        </MobilityProvider>
    );
}
