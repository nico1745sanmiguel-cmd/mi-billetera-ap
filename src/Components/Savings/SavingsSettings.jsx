import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useUI } from '../../context/UIContext';
import AssetPricesPanel from './AssetPricesPanel';

export default function SavingsSettings({ isGlass, onBack }) {
    const { clearAllSavings } = useSavings();
    const { showToast } = useUI();
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 border border-white/20 backdrop-blur-md' : 'bg-white shadow-sm border border-gray-100';

    const handleDeleteAll = async () => {
        if (confirmText.toLowerCase() !== 'borrar') {
            showToast('Escribí "borrar" para confirmar', 'error');
            return;
        }

        setIsDeleting(true);
        try {
            await clearAllSavings();
            showToast('Todos los datos de ahorros fueron eliminados', 'success');
            onBack();
        } catch (error) {
            console.error('Error clearing savings:', error);
            showToast('Error al borrar los datos', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <AssetPricesPanel isGlass={isGlass} />

            <div className={`rounded-3xl p-6 ${cardBg}`}>
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className={`text-xl font-bold ${textColor}`}>Zona de Peligro</h3>
                        <p className={isGlass ? 'text-white/60 text-sm' : 'text-gray-500 text-sm'}>
                            Acciones destructivas para el módulo de Ahorros.
                        </p>
                    </div>
                </div>

                {!isConfirming ? (
                    <div className="space-y-4">
                        <p className={isGlass ? 'text-white/80 text-sm' : 'text-gray-700 text-sm'}>
                            Si querés reiniciar tu progreso, podés eliminar todos tus movimientos de ahorros y objetivos. <strong>Esta acción no se puede deshacer.</strong>
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsConfirming(true)}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all active:scale-95"
                        >
                            <Trash2 size={18} />
                            Borrar todos los datos de Ahorros
                        </button>
                    </div>
                ) : (
                    <div className={`p-4 rounded-2xl border ${isGlass ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                        <h4 className="font-bold text-red-600 mb-2">¿Estás completamente seguro?</h4>
                        <p className={`text-sm mb-4 ${isGlass ? 'text-red-200' : 'text-red-800'}`}>
                            Escribí la palabra <strong>"borrar"</strong> para confirmar la eliminación de todos los datos de ahorros de forma permanente.
                        </p>
                        
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder='Escribí "borrar"'
                            className={`w-full p-3 rounded-xl mb-4 font-bold text-center ${
                                isGlass 
                                ? 'bg-black/20 border border-red-500/30 text-white placeholder-white/30 focus:border-red-500 outline-none' 
                                : 'bg-white border border-red-200 text-gray-900 focus:border-red-500 outline-none'
                            }`}
                        />

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirming(false);
                                    setConfirmText('');
                                }}
                                disabled={isDeleting}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                    isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                }`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAll}
                                disabled={isDeleting || confirmText.toLowerCase() !== 'borrar'}
                                className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95"
                            >
                                {isDeleting ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
