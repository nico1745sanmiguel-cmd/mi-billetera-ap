import React, { useState, useMemo } from 'react';
import { X, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { formatInputNumber, parseInputNumber } from '../../utils';

export default function AddSavingsModal({ onClose, isGlass }) {
    const { addSavingsTransaction, savingsTransactions } = useSavings();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        tipo: 'ingreso',
        cartera: '',
        especie: '',
        cantidad: '',
        nota: ''
    });

    // Autocompletado nativo extrayendo datos previos + defaults
    const carterasOpciones = useMemo(() => {
        const set = new Set(['Efectivo', 'Balanz', 'Nexo', 'Binance', 'MercadoPago']);
        (savingsTransactions || []).forEach(tx => {
            if (tx.cartera) set.add(tx.cartera);
        });
        return Array.from(set);
    }, [savingsTransactions]);

    const especiesOpciones = useMemo(() => {
        const set = new Set(['ARS', 'USD', 'BTC', 'USDT', 'CEDEARs']);
        (savingsTransactions || []).forEach(tx => {
            if (tx.especie) set.add(tx.especie);
        });
        return Array.from(set);
    }, [savingsTransactions]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.cartera || !formData.especie || !formData.cantidad) return;
        
        setLoading(true);
        try {
            await addSavingsTransaction({
                tipo: formData.tipo,
                cartera: formData.cartera.trim(),
                especie: formData.especie.trim().toUpperCase(),
                cantidad: parseFloat(formData.cantidad),
                nota: formData.nota.trim()
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        }
        setLoading(false);
    };

    const inputClasses = `w-full p-3 rounded-xl border transition-all outline-none ${
        isGlass 
        ? 'bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-green-400 focus:bg-white/20' 
        : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10'
    }`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 animate-scale-in shadow-2xl ${isGlass ? 'bg-[#0f0c29]/90 border border-white/20 backdrop-blur-xl' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-black ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                        Nuevo Movimiento
                    </h2>
                    <button aria-label="Acción" type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* TIPO */}
                    <div className="grid grid-cols-2 gap-3">
                        <button aria-label="Acción"
                            type="button"
                            onClick={() => setFormData({...formData, tipo: 'ingreso'})}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${
                                formData.tipo === 'ingreso'
                                ? (isGlass ? 'bg-green-500/30 text-green-300 border border-green-500/50' : 'bg-green-100 text-green-700 border-2 border-green-500')
                                : (isGlass ? 'bg-white/5 text-white/50 border border-transparent' : 'bg-gray-50 text-gray-400 border-2 border-transparent')
                            }`}
                        >
                            <TrendingUp size={18} />
                            Ingreso
                        </button>
                        <button aria-label="Acción"
                            type="button"
                            onClick={() => setFormData({...formData, tipo: 'egreso'})}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${
                                formData.tipo === 'egreso'
                                ? (isGlass ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'bg-red-100 text-red-700 border-2 border-red-500')
                                : (isGlass ? 'bg-white/5 text-white/50 border border-transparent' : 'bg-gray-50 text-gray-400 border-2 border-transparent')
                            }`}
                        >
                            <TrendingDown size={18} />
                            Egreso
                        </button>
                    </div>

                    {/* CARTERA */}
                    <div>
                        <label htmlFor="input-field" className={`block text-sm font-bold mb-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Cartera</label>
                        <input autoComplete="off" id="input-field"
                            list="carteras-list"
                            required
                            value={formData.cartera}
                            onChange={(e) => setFormData({...formData, cartera: e.target.value})}
                            placeholder="Ej: Balanz, Efectivo, Nexo..."
                            className={inputClasses}
                        />
                        <datalist id="carteras-list">
                            {carterasOpciones.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* ESPECIE */}
                        <div>
                            <label htmlFor="input-field" className={`block text-sm font-bold mb-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Especie</label>
                            <input autoComplete="off" id="input-field"
                                list="especies-list"
                                required
                                value={formData.especie}
                                onChange={(e) => setFormData({...formData, especie: e.target.value})}
                                placeholder="Ej: ARS, USD..."
                                className={inputClasses}
                            />
                            <datalist id="especies-list">
                                {especiesOpciones.map(e => <option key={e} value={e} />)}
                            </datalist>
                        </div>

                        {/* CANTIDAD */}
                        <div>
                            <label htmlFor="input-field" className={`block text-sm font-bold mb-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Cantidad</label>
                            <input autoComplete="off" id="input-field"
                                type="tel"
                                required
                                value={formatInputNumber(formData.cantidad)}
                                onChange={(e) => setFormData({...formData, cantidad: parseInputNumber(e.target.value)})}
                                placeholder="0"
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    {/* NOTA */}
                    <div>
                        <label htmlFor="input-field" className={`block text-sm font-bold mb-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Nota (Opcional)</label>
                        <input autoComplete="off" id="input-field"
                            type="text"
                            value={formData.nota}
                            onChange={(e) => setFormData({...formData, nota: e.target.value})}
                            placeholder="Ej: Compra de CEDEARs"
                            className={inputClasses}
                        />
                    </div>

                    <button aria-label="Acción"
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-4 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 mt-4"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save size={20} />
                                Guardar Movimiento
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
