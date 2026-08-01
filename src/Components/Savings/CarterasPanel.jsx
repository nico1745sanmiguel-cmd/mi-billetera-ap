import React, { useState } from 'react';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useUI } from '../../context/UIContext';

export default function CarterasPanel({ isGlass }) {
    const { carterasPersonalizadas, addCartera, deleteCartera } = useSavings();
    const { showToast } = useUI();
    const [nuevaCartera, setNuevaCartera] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 border border-white/20 backdrop-blur-md' : 'bg-white shadow-sm border border-gray-100';
    const inputBg = isGlass ? 'bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-green-400' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-green-500';

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

    return (
        <div className={`rounded-3xl p-6 ${cardBg}`}>
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
                            <button 
                                type="button"
                                onClick={() => handleDelete(cartera.id)}
                                disabled={deletingId === cartera.id}
                                className={`p-2 rounded-lg transition-colors ${isGlass ? 'hover:bg-red-500/20 text-white/50 hover:text-red-400' : 'hover:bg-red-100 text-gray-400 hover:text-red-600'}`}
                            >
                                {deletingId === cartera.id ? (
                                    <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
