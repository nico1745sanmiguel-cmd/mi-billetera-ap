import React, { useState, useMemo } from 'react';
import { Briefcase, Plus, Trash2, ArrowRightLeft, X } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useUI } from '../../context/UIContext';

export default function CarterasPanel({ isGlass }) {
    const { carterasPersonalizadas, addCartera, deleteCartera, savingsTransactions, migrateCarteraTransactions } = useSavings();
    const { showToast } = useUI();
    const [nuevaCartera, setNuevaCartera] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [migratingTo, setMigratingTo] = useState(null); // name of the new cartera to migrate into
    const [oldCarteraSelected, setOldCarteraSelected] = useState('');

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 border border-white/20 backdrop-blur-md' : 'bg-white shadow-sm border border-gray-100';
    const inputBg = isGlass ? 'bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-green-400' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-green-500';

    // Obtener todos los nombres de carteras históricas únicas que están en uso
    const carterasHistoricas = useMemo(() => {
        const set = new Set();
        (savingsTransactions || []).forEach(tx => {
            if (tx.cartera) set.add(tx.cartera);
        });
        // Filtrar las que ya están como personalizadas para no mostrar redundancia (opcional, pero útil)
        const personalizadasNombres = (carterasPersonalizadas || []).map(c => c.nombre);
        return Array.from(set).filter(name => !personalizadasNombres.includes(name));
    }, [savingsTransactions, carterasPersonalizadas]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!nuevaCartera.trim()) return;

        setIsSubmitting(true);
        try {
            await addCartera(nuevaCartera);
            setNuevaCartera('');
            showToast('Cartera/Broker agregada correctamente', 'success');
        } catch (error) {
            showToast('Error al agregar cartera', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await deleteCartera(id);
            showToast('Cartera eliminada', 'success');
        } catch (error) {
            showToast('Error al eliminar cartera', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleMigrate = async () => {
        if (!oldCarteraSelected || !migratingTo) return;
        setIsSubmitting(true);
        try {
            await migrateCarteraTransactions(oldCarteraSelected, migratingTo);
            showToast(`Se migraron los activos a ${migratingTo}`, 'success');
            setMigratingTo(null);
            setOldCarteraSelected('');
        } catch (error) {
            showToast('Error al migrar activos', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`rounded-3xl p-6 ${cardBg}`}>
            {/* Modal de Migración */}
            {migratingTo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in ${isGlass ? 'bg-[#0f0c29] border border-white/20' : 'bg-white'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-lg font-bold ${textColor}`}>Migrar Operaciones</h3>
                            <button onClick={() => setMigratingTo(null)} className={`p-2 rounded-full ${isGlass ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <p className={`text-sm mb-4 ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
                            Todas las operaciones de la cartera que elijas abajo pasarán a llamarse <strong>{migratingTo}</strong>.
                        </p>
                        
                        <select
                            value={oldCarteraSelected}
                            onChange={(e) => setOldCarteraSelected(e.target.value)}
                            className={`w-full p-3 rounded-xl mb-4 outline-none ${inputBg}`}
                        >
                            <option value="">Seleccioná el nombre viejo...</option>
                            {carterasHistoricas.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleMigrate}
                            disabled={!oldCarteraSelected || isSubmitting}
                            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
                        >
                            {isSubmitting ? 'Migrando...' : 'Confirmar Migración'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-4 mb-6">
                <div className={`p-3 rounded-2xl shrink-0 ${isGlass ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <Briefcase size={24} />
                </div>
                <div>
                    <h3 className={`text-xl font-bold ${textColor}`}>Mis Brokers / Carteras</h3>
                    <p className={isGlass ? 'text-white/60 text-sm' : 'text-gray-500 text-sm'}>
                        Administrá tus plataformas de inversión. Aparecerán como opciones sugeridas al cargar operaciones.
                    </p>
                </div>
            </div>

            <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                <input 
                    type="text"
                    value={nuevaCartera}
                    onChange={(e) => setNuevaCartera(e.target.value)}
                    placeholder="Ej: Cocos Capital"
                    className={`flex-1 p-3 rounded-xl border outline-none transition-all ${inputBg}`}
                />
                <button 
                    type="submit"
                    disabled={!nuevaCartera.trim() || isSubmitting}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Agregar</span>
                </button>
            </form>

            <div className="space-y-2">
                {carterasPersonalizadas?.length === 0 ? (
                    <div className={`text-center py-6 text-sm ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                        No tenés carteras personalizadas cargadas.
                    </div>
                ) : (
                    carterasPersonalizadas?.map(cartera => (
                        <div key={cartera.id} className={`flex justify-between items-center p-3 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <span className={`font-bold ${textColor}`}>{cartera.nombre}</span>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setMigratingTo(cartera.nombre)}
                                    title="Migrar operaciones viejas hacia esta cartera"
                                    className={`p-2 rounded-lg transition-colors ${isGlass ? 'hover:bg-blue-500/20 text-blue-400/80 hover:text-blue-400' : 'hover:bg-blue-100 text-blue-500/70 hover:text-blue-600'}`}
                                >
                                    <ArrowRightLeft size={16} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleDelete(cartera.id)}
                                    disabled={deletingId === cartera.id}
                                    title="Eliminar cartera"
                                    className={`p-2 rounded-lg transition-colors ${isGlass ? 'hover:bg-red-500/20 text-white/50 hover:text-red-400' : 'hover:bg-red-100 text-gray-400 hover:text-red-600'}`}
                                >
                                    {deletingId === cartera.id ? (
                                        <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
