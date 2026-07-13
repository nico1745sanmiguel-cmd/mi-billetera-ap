import React, { useState } from 'react';
import { Settings, Save, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { useMobility } from '../../context/MobilityContext';
import { useUI } from '../../context/UIContext';

export default function MobilitySettings({ isGlass, onBack }) {
    const { settings, updateSettings, sessions, deleteAllSessions } = useMobility();
    const { showToast } = useUI();

    const [weekStartDay, setWeekStartDay] = useState(settings.weekStartDay);
    const [activePlatforms, setActivePlatforms] = useState(settings.activePlatforms);
    const [expenseCategories, setExpenseCategories] = useState(settings.expenseCategories);
    const [defaultTab, setDefaultTab] = useState(settings.defaultTab);
    const [widgetTitle, setWidgetTitle] = useState(settings.widgetTitle || 'Movilidad');

    const [newCategory, setNewCategory] = useState('');
    
    // Estados para borrar historial
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);

    const handleSave = () => {
        updateSettings({
            weekStartDay: Number(weekStartDay),
            activePlatforms,
            expenseCategories,
            defaultTab,
            widgetTitle
        });
        showToast('Ajustes de Movilidad guardados', 'success');
        onBack();
    };

    const togglePlatform = (key) => {
        setActivePlatforms(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleCategory = (id) => {
        setExpenseCategories(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
    };

    const removeCategory = (id) => {
        setExpenseCategories(prev => prev.filter(c => c.id !== id));
    };

    const addCategory = () => {
        if (!newCategory.trim()) return;
        const id = newCategory.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (expenseCategories.find(c => c.id === id)) {
            showToast('Esa categoría ya existe', 'error');
            return;
        }
        setExpenseCategories(prev => [
            ...prev,
            { id, label: newCategory.trim(), iconName: 'Tag', color: '#6366f1', active: true }
        ]);
        setNewCategory('');
    };

    const handleDeleteAll = async () => {
        setDeletingAll(true);
        await deleteAllSessions();
        setDeletingAll(false);
        setShowDeleteAll(false);
        showToast('Historial borrado correctamente', 'success');
    };

    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub = isGlass ? 'text-white/50' : 'text-gray-400';
    const inputStyle = `w-full rounded-xl px-3 py-2 text-sm outline-none transition-all ${
        isGlass 
            ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-violet-400/50 focus:bg-white/10' 
            : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
    }`;

    return (
        <div className="space-y-4 animate-fade-in pb-20">
            <div className={`${card}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${text}`}>
                    <Settings size={18} />
                    Configuración Avanzada
                </h3>

                <div className="space-y-6">
                    {/* General */}
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>General</p>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="input-field" className={`block text-xs font-medium mb-1 ${sub}`}>Día de inicio de semana</label>
                                <select 
                                    value={weekStartDay} 
                                    onChange={(e) => setWeekStartDay(e.target.value)}
                                    className={inputStyle}
                                >
                                    <option value={1} className="text-gray-800">Lunes</option>
                                    <option value={2} className="text-gray-800">Martes</option>
                                    <option value={3} className="text-gray-800">Miércoles</option>
                                    <option value={4} className="text-gray-800">Jueves</option>
                                    <option value={5} className="text-gray-800">Viernes</option>
                                    <option value={6} className="text-gray-800">Sábado</option>
                                    <option value={0} className="text-gray-800">Domingo</option>
                                </select>
                            </div>
                            
                            <div>
                                <label htmlFor="input-field" className={`block text-xs font-medium mb-1 ${sub}`}>Título del Widget</label>
                                <input autoComplete="off" 
                                    type="text" 
                                    value={widgetTitle}
                                    onChange={(e) => setWidgetTitle(e.target.value)}
                                    placeholder="Ej. Movilidad"
                                    className={inputStyle}
                                    maxLength={20}
                                />
                            </div>

                            <div>
                                <label htmlFor="input-field" className={`block text-xs font-medium mb-1 ${sub}`}>Pestaña por defecto</label>
                                <select 
                                    value={defaultTab} 
                                    onChange={(e) => setDefaultTab(e.target.value)}
                                    className={inputStyle}
                                >
                                    <option value="expenses" className="text-gray-800">Gastos</option>
                                    <option value="register" className="text-gray-800">Jornada</option>
                                    <option value="history" className="text-gray-800">Historial</option>
                                    <option value="stats" className="text-gray-800">Análisis</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Plataformas */}
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Plataformas Activas</p>
                        <div className="space-y-2">
                            {Object.keys(activePlatforms).map(key => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className={`text-sm capitalize ${text}`}>
                                        {key === 'others' ? 'Otros' : key}
                                    </span>
                                    <button aria-label="Acción" type="button" 
                                        onClick={() => togglePlatform(key)}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${activePlatforms[key] ? 'bg-violet-500' : 'bg-gray-300 dark:bg-white/20'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${activePlatforms[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Categorías de Gastos */}
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Categorías de Gastos</p>
                        <div className="space-y-2 mb-3">
                            {expenseCategories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className={`text-sm ${text}`}>{cat.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button aria-label="Acción" type="button" 
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`w-9 h-5 rounded-full transition-colors relative ${cat.active ? 'bg-violet-500' : 'bg-gray-300 dark:bg-white/20'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${cat.active ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                        <button aria-label="Acción" type="button" onClick={() => removeCategory(cat.id)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <input autoComplete="off" id="input-field" 
                                type="text" 
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="Nueva categoría..."
                                className={inputStyle}
                            />
                            <button aria-label="Acción" type="button" 
                                onClick={addCategory}
                                className={`p-2 rounded-xl bg-violet-500 text-white hover:bg-violet-600 transition-colors`}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Zona de Peligro: Borrar Historial */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                    <p className={`text-xs font-bold uppercase tracking-wide mb-3 text-red-500`}>Zona de Peligro</p>
                    
                    {sessions.length > 0 && !showDeleteAll && (
                        <button aria-label="Acción" type="button"
                            onClick={() => setShowDeleteAll(true)}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${isGlass ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100'}`}
                        >
                            <Trash2 size={13} />
                            Borrar todo el historial ({sessions.length} registros)
                        </button>
                    )}

                    {showDeleteAll && (
                        <div className={`rounded-xl p-4 border ${isGlass ? 'bg-red-500/10 border-red-400/30' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex items-start gap-3 mb-3">
                                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm text-red-600">¿Borrar {sessions.length} registros?</p>
                                    <p className={`text-xs mt-0.5 ${isGlass ? 'text-red-300' : 'text-red-500'}`}>Esta acción no se puede deshacer.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button aria-label="Acción" type="button"
                                    onClick={() => setShowDeleteAll(false)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${isGlass ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                                >
                                    Cancelar
                                </button>
                                <button aria-label="Acción" type="button"
                                    onClick={handleDeleteAll}
                                    disabled={deletingAll}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50"
                                >
                                    {deletingAll ? 'Borrando...' : 'Sí, borrar todo'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button aria-label="Acción" type="button" 
                    onClick={handleSave}
                    className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors"
                >
                    <Save size={18} />
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}
