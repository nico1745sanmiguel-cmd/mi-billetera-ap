import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, CheckCircle2, ShieldAlert, FileText, Target, Wallet, BellOff } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useUI } from '../../context/UIContext';
import AssetPricesPanel from './AssetPricesPanel';
import CarterasPanel from './CarterasPanel';

export default function SavingsSettings({ isGlass, onBack }) {
    const navigate = useNavigate();
    const { clearAllSavings } = useSavings();
    const { showToast } = useUI();
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 border border-white/20 backdrop-blur-md' : 'bg-white shadow-sm border border-gray-100';

    const handleGoBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate('/savings');
        }
    };

    const handleDeleteAll = async () => {
        if (confirmText.trim().toLowerCase() !== 'borrar') {
            showToast('Escribí "borrar" para confirmar', 'error');
            return;
        }

        setIsDeleting(true);
        try {
            await clearAllSavings();
            showToast('Se eliminaron todos los datos de ahorros correctamente', 'success');
            handleGoBack();
        } catch (error) {
            console.error('Error clearing savings:', error);
            showToast('Hubo un error al eliminar los datos. Probá nuevamente.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <CarterasPanel isGlass={isGlass} />
            <AssetPricesPanel isGlass={isGlass} />

            {/* Panel de Zona de Peligro / Reinicio Total */}
            <div className={`rounded-3xl p-6 transition-all ${cardBg}`}>
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl shrink-0">
                        <ShieldAlert size={26} />
                    </div>
                    <div>
                        <h3 className={`text-xl font-black ${textColor}`}>Reinicio del Módulo</h3>
                        <p className={isGlass ? 'text-white/60 text-sm' : 'text-gray-500 text-sm'}>
                            Eliminar todos los datos y comenzar de nuevo desde cero.
                        </p>
                    </div>
                </div>

                {!isConfirming ? (
                    <div className="space-y-5">
                        <p className={isGlass ? 'text-white/80 text-sm leading-relaxed' : 'text-gray-700 text-sm leading-relaxed'}>
                            Si querés comenzar desde cero, esta opción limpiará completamente la base de datos vinculada a tus ahorros e inversiones:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold ${isGlass ? 'bg-white/5 text-white/80 border border-white/10' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>
                                <FileText size={16} className="text-red-400 shrink-0" />
                                <span>Todas las operaciones y movimientos</span>
                            </div>
                            <div className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold ${isGlass ? 'bg-white/5 text-white/80 border border-white/10' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>
                                <Target size={16} className="text-red-400 shrink-0" />
                                <span>Metas y objetivos fijados</span>
                            </div>
                            <div className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold ${isGlass ? 'bg-white/5 text-white/80 border border-white/10' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>
                                <Wallet size={16} className="text-red-400 shrink-0" />
                                <span>Carteras personalizadas creadas</span>
                            </div>
                            <div className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold ${isGlass ? 'bg-white/5 text-white/80 border border-white/10' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>
                                <BellOff size={16} className="text-red-400 shrink-0" />
                                <span>Alertas de Stop Loss configuradas</span>
                            </div>
                        </div>

                        <div className={`p-3.5 rounded-2xl flex items-center gap-3 ${isGlass ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                            <AlertTriangle size={18} className="shrink-0" />
                            <span className="text-xs font-medium">Esta acción es irreversible y no se puede deshacer una vez confirmada.</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsConfirming(true)}
                            className="w-full flex justify-center items-center gap-2.5 py-3.5 px-4 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold transition-all shadow-lg shadow-red-500/20"
                        >
                            <Trash2 size={18} />
                            <span>Eliminar todo y empezar de vuelta</span>
                        </button>
                    </div>
                ) : (
                    <div className={`p-5 rounded-2xl border space-y-4 animate-fade-in ${isGlass ? 'bg-red-950/30 border-red-500/30' : 'bg-red-50/80 border-red-200'}`}>
                        <div className="flex items-center gap-2 text-red-500 font-bold">
                            <AlertTriangle size={20} />
                            <h4>Confirmación de seguridad</h4>
                        </div>
                        <p className={`text-sm ${isGlass ? 'text-red-200/90' : 'text-red-800'}`}>
                            Para confirmar la eliminación permanente de toda la base de datos de Ahorros, escribí la palabra <strong className="underline uppercase tracking-wide text-red-400">borrar</strong> abajo:
                        </p>
                        
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder='Escribí "borrar"'
                            autoFocus
                            disabled={isDeleting}
                            className={`w-full p-3.5 rounded-xl font-bold text-center text-base transition-all ${
                                isGlass 
                                ? 'bg-black/40 border border-red-500/40 text-white placeholder-white/30 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none' 
                                : 'bg-white border border-red-300 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none shadow-inner'
                            }`}
                        />

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirming(false);
                                    setConfirmText('');
                                }}
                                disabled={isDeleting}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                                    isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                }`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAll}
                                disabled={isDeleting || confirmText.trim().toLowerCase() !== 'borrar'}
                                className="flex-1 flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md shadow-red-600/30"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Borrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Confirmar Borrado</span>
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
