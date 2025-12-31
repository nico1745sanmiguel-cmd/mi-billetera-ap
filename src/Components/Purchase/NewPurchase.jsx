import React, { useState, useEffect } from 'react';
import { useFinancialProjections } from '../../hooks/useFinancialProjections';

export default function NewPurchase({ cards, onSave, transactions, privacyMode, currentDate, isGlass, householdId }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('cash'); // 'cash' | 'credit'
    const [selectedCardId, setSelectedCardId] = useState('');
    const [installments, setInstallments] = useState(1);
    const [category, setCategory] = useState('varios');
    const [isShared, setIsShared] = useState(true);

    // --- PROJECTIONS HOOK ---
    const projections = useFinancialProjections(
        transactions,
        cards,
        currentDate,
        (type === 'credit' && amount) ? { amount, installments, cardId: selectedCardId } : null
    );

    // --- MÁQUINA DEL TIEMPO ⏳ ---
    useEffect(() => {
        if (currentDate) {
            const realToday = new Date();
            const isSameMonth = currentDate.getMonth() === realToday.getMonth() && currentDate.getFullYear() === realToday.getFullYear();
            if (isSameMonth) setDate(realToday.toISOString().split('T')[0]);
            else {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                setDate(`${year}-${month}-01`);
            }
        }
    }, [currentDate]);

    // Auto-select card
    useEffect(() => {
        if (type === 'credit' && cards.length === 1 && !selectedCardId) {
            setSelectedCardId(cards[0].id);
        } else if (type === 'credit' && cards.length > 0 && !selectedCardId) {
            setSelectedCardId(cards[0].id);
        }
    }, [type, cards, selectedCardId]);

    const getBrandLogo = (cardName) => {
        const name = cardName ? cardName.toLowerCase() : '';
        let src = '';
        if (name.includes('visa')) src = '/logos/visa.png';
        else if (name.includes('master')) src = '/logos/mastercard.png';
        else if (name.includes('amex') || name.includes('american')) src = '/logos/amex.png';

        if (src) return <img src={src} alt="Logo" loading="lazy" className="h-6 w-auto object-contain drop-shadow-sm opacity-80" />;
        return <span className="text-[10px] font-bold bg-gray-100 px-1 rounded text-gray-500">{cardName?.substring(0, 3)}</span>;
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!amount) return;

        const transactionData = {
            amount: Number(amount),
            description: description || 'Gasto General',
            date,
            category,
            type,
            createdAt: new Date().toISOString(),
            isShared
        };

        if (type === 'credit') {
            if (!selectedCardId) {
                alert("Selecciona una tarjeta");
                return;
            }
            transactionData.cardId = selectedCardId;
            transactionData.installments = Number(installments);
            transactionData.monthlyInstallment = transactionData.amount / transactionData.installments;
        }

        onSave(transactionData);
    };

    const getSelectedCardInfo = () => cards.find(c => c.id === selectedCardId);

    const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="animate-fade-in max-w-lg mx-auto pb-32">

            <form onSubmit={handleSave} className="space-y-6">

                {/* 1. PAYMENT METHOD (TOP) */}
                <div className={`flex p-1 rounded-2xl mx-1 ${isGlass ? 'bg-white/5' : 'bg-gray-200'}`}>
                    <button
                        type="button"
                        onClick={() => setType('cash')}
                        className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'cash' ? (isGlass ? 'bg-white/10 text-green-300 shadow-sm border border-white/5' : 'bg-white text-green-600 shadow-sm') : (isGlass ? 'text-white/30 hover:text-white/60' : 'text-gray-400')}`}
                    >
                        <span>💵</span> Efectivo / Débito
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('credit')}
                        className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'credit' ? (isGlass ? 'bg-white/10 text-blue-300 shadow-sm border border-white/5' : 'bg-white text-blue-600 shadow-sm') : (isGlass ? 'text-white/30 hover:text-white/60' : 'text-gray-400')}`}
                    >
                        <span>💳</span> Crédito
                    </button>
                </div>

                {/* 2. AMOUNT INPUT (HUGE) */}
                <div className="text-center py-4">
                    <div className="flex justify-center items-center gap-1">
                        <span className={`text-4xl font-bold ${isGlass ? 'text-white/30' : 'text-gray-300'}`}>$</span>
                        <input
                            type="tel"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                            className={`text-5xl font-bold w-full text-center outline-none bg-transparent tracking-tighter ${isGlass ? 'text-white placeholder-white/10' : 'text-gray-800 placeholder-gray-200'}`}
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                </div>

                {/* 3. CREDIT CARD PANEL (If Credit) */}
                {type === 'credit' && (
                    <div className={`p-5 rounded-[30px] border relative overflow-hidden transition-all ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>

                        {/* Selector Tarjetas */}
                        <div className="mb-6">
                            <label className={`block text-xs font-bold uppercase mb-3 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Seleccionar Tarjeta</label>
                            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                {cards.map((card) => (
                                    <div
                                        key={card.id}
                                        onClick={() => setSelectedCardId(card.id)}
                                        className={`flex-shrink-0 cursor-pointer border-2 rounded-2xl p-4 w-40 relative transition-all ${selectedCardId === card.id
                                            ? (isGlass ? 'border-blue-400/50 bg-blue-600/20' : 'border-blue-500 bg-blue-50')
                                            : (isGlass ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-gray-100 bg-white hover:border-gray-200')
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            {getBrandLogo(card.name)}
                                            {selectedCardId === card.id && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>}
                                        </div>
                                        <p className={`text-sm font-bold truncate ${isGlass ? 'text-white' : 'text-gray-700'}`}>{card.name}</p>
                                        <div className="flex justify-between items-end mt-2">
                                            <div>
                                                <p className={`text-[9px] uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Límite</p>
                                                <p className={`text-[10px] font-mono ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>{card.limit ? formatMoney(card.limit) : '---'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-[9px] uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Cierre</p>
                                                <p className={`text-[10px] font-mono ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>{card.closingDate ? new Date(card.closingDate).getDate() : '25'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Slider Cuotas */}
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-2">
                                <label className={`text-xs font-bold uppercase ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Cuotas</label>
                                <span className={`text-2xl font-bold ${isGlass ? 'text-blue-300' : 'text-blue-600'}`}>{installments}x</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="12"
                                step="1"
                                value={installments}
                                onChange={(e) => setInstallments(Number(e.target.value))}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isGlass ? 'bg-white/10' : 'bg-gray-200'} accent-blue-500`}
                            />
                            {amount > 0 && (
                                <p className={`text-center text-xs mt-3 font-medium ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                                    Cuota Mensual: <span className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{formatMoney(amount / installments)}</span>
                                </p>
                            )}
                        </div>

                        {/* FUTURE IMPACT CHART */}
                        <div className={`rounded-2xl p-4 ${isGlass ? 'bg-black/20 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                            <h4 className={`text-[10px] font-bold uppercase mb-3 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Tu Compromiso Futuro (6 Meses)</h4>
                            <div className="space-y-2">
                                {projections.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-xs">
                                        <div className={`w-8 font-bold ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>{p.monthLabel}</div>
                                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-200'}`}>
                                            <div className="h-full bg-blue-500/30" style={{ width: `${(p.existing / (p.total * 1.2 || 1)) * 100}%` }}></div> {/* Base Debt */}
                                            {p.newImpact > 0 && (
                                                <div className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" style={{ width: `${(p.newImpact / (p.total * 1.2 || 1)) * 100}%`, marginLeft: `-${(p.existing / (p.total * 1.2 || 1)) * 100}%`, transform: `translateX(${(p.existing / (p.total * 1.2 || 1)) * 100}%)` }}></div>
                                            )}
                                            {/* Fix overlapping logic visually simplified */}
                                        </div>
                                        <div className={`w-20 text-right font-mono font-bold ${p.newImpact > 0 ? (isGlass ? 'text-blue-300' : 'text-blue-600') : (isGlass ? 'text-white/40' : 'text-gray-400')}`}>
                                            {formatMoney(p.total)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* 4. DETAILS (Category & Desc) */}
                <div className={`p-5 rounded-[30px] border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                    <label className={`block text-xs font-bold uppercase mb-3 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Categoría</label>
                    <div className="flex flex-wrap gap-2">
                        {['supermarket', 'food', 'transport', 'services', 'home', 'health', 'shopping', 'education', 'varios'].map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(cat)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${category === cat
                                    ? (isGlass ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900')
                                    : (isGlass ? 'bg-white/5 text-white/60 border-transparent hover:bg-white/10' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200')}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`w-full bg-transparent border-b p-2 font-bold outline-none text-sm transition-colors ${isGlass ? 'border-white/10 text-white placeholder-white/20 focus:border-white/50' : 'border-gray-200 text-gray-700 focus:border-blue-500'}`}
                            placeholder="Descripción (Opcional)"
                        />
                    </div>
                </div>

                {/* 5. SAVE BUTTON */}
                <button
                    type="submit"
                    className={`w-full py-4 rounded-[30px] font-bold shadow-lg active:scale-95 transition-all text-lg ${isGlass ? 'bg-white text-indigo-900 border border-white/50 hover:bg-indigo-50' : 'bg-gray-900 text-white shadow-gray-400'}`}
                >
                    Confirmar Gasto
                </button>

            </form>
        </div>
    );
}