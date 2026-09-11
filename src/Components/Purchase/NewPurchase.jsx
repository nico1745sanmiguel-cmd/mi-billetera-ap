import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Coffee, CreditCard, Banknote, CalendarDays, Receipt, Package, CarFront, Utensils, X, CheckCircle2, ChevronRight, Calculator, Plus, Minus, X as MultiplyIcon } from 'lucide-react';
import { useFinancialProjections } from '../../hooks/useFinancialProjections';
import { formatInputNumber, parseInputNumber } from '../../utils';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useCards } from '../../context/CardsContext';
import Skeleton from '../UI/Skeleton';

const getBrandLogo = (cardName) => {
    const name = cardName ? cardName.toLowerCase() : '';
    let src = '';
    if (name.includes('visa')) src = '/logos/visa.png';
    else if (name.includes('master')) src = '/logos/mastercard.png';
    else if (name.includes('amex') || name.includes('american')) src = '/logos/amex.png';

    if (src) return <img src={src} alt="Logo" loading="lazy" className="h-6 w-auto object-contain drop-shadow-sm opacity-80" />;
    return <span className="text-[10px] font-bold bg-gray-100 px-1 rounded text-gray-500">{cardName?.substring(0, 3)}</span>;
};

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const formatMoney = (val) => arsFormatter.format(val);

export default function NewPurchase({ onSave }) {
    const navigate = useNavigate();
    const { cards = [], transactions = [], addTransaction, loadingCards } = useCards();
    const { user } = useAuth();
    const householdId = user?.householdId;
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('cash'); // 'cash' | 'credit'
    const [selectedCardId, setSelectedCardId] = useState('');
    const [installments, setInstallments] = useState(1);
    const [category, setCategory] = useState('varios');
    const [isShared, setIsShared] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast, currentDate, isGlass } = useUI();

    // --- PROJECTIONS HOOK ---
    const projections = useFinancialProjections(
        transactions,
        cards,
        currentDate,
        (type === 'credit' && amount) ? { amount, installments, cardId: selectedCardId } : null
    );

    // --- MÁQUINA DEL TIEMPO ⏳ ---
    const [prevCurrentDate, setPrevCurrentDate] = useState(null);

    if (currentDate && currentDate !== prevCurrentDate) {
        setPrevCurrentDate(currentDate);
        if (!date) {
            const realToday = new Date();
            const isSameMonth = currentDate.getMonth() === realToday.getMonth() && currentDate.getFullYear() === realToday.getFullYear();
            if (isSameMonth) setDate(realToday.toISOString().split('T')[0]);
            else {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                setDate(`${year}-${month}-01`);
            }
        }
    }

    // Auto-selección limpia de tarjeta mediante useEffect (sin setState en cuerpo de render)
    useEffect(() => {
        if (type === 'credit' && cards && cards.length > 0) {
            const cardStillExists = cards.some(c => c.id === selectedCardId);
            if (!selectedCardId || !cardStillExists) {
                setSelectedCardId(cards[0].id);
            }
        }
    }, [type, cards, selectedCardId]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            showToast("Ingresa un monto válido mayor a $ 0", "error");
            return;
        }

        if (type === 'credit') {
            if (!selectedCardId || !cards.some(c => c.id === selectedCardId)) {
                showToast("Debes seleccionar una tarjeta para compras con crédito", "error");
                return;
            }
        }

        setIsSaving(true);
        const transactionData = {
            amount: numAmount,
            description: (description || '').trim() || 'Gasto General',
            date: date || new Date().toISOString().split('T')[0],
            category,
            type,
            createdAt: new Date().toISOString(),
            isShared
        };

        if (type === 'credit') {
            const safeInstallments = Math.max(1, Math.min(60, parseInt(installments, 10) || 1));
            transactionData.cardId = selectedCardId;
            transactionData.installments = safeInstallments;
            transactionData.monthlyInstallment = Math.round((transactionData.amount / safeInstallments) * 100) / 100;
        }

        try {
            await addTransaction(transactionData);
            if (onSave) onSave(); // Para cerrar la vista o volver al dashboard
            showToast('¡Gasto guardado con éxito!', 'success');
        } catch (error) {
            console.error("Error al guardar gasto:", error);
            showToast('Hubo un error al guardar el gasto.', 'error');
        } finally {
            setIsSaving(false);
        }
    };




    return (
        <div className="animate-fade-in max-w-lg mx-auto pb-32">

            <form onSubmit={handleSave} className="space-y-6">

                {/* 1. PAYMENT METHOD (TOP) */}
                <div className={`flex p-1 rounded-2xl mx-1 ${isGlass ? 'bg-white/5' : 'bg-gray-200'}`}>
                    <button aria-label="Acción"
                        type="button"
                        disabled={isSaving}
                        onClick={() => setType('cash')}
                        className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'cash' ? (isGlass ? 'bg-white/10 text-green-300 shadow-sm border border-white/5' : 'bg-white text-green-600 shadow-sm') : (isGlass ? 'text-white/30 hover:text-white/60' : 'text-gray-400')} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Banknote size={18} /> Efectivo / Débito
                    </button>
                    <button aria-label="Acción"
                        type="button"
                        disabled={isSaving}
                        onClick={() => setType('credit')}
                        className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'credit' ? (isGlass ? 'bg-white/10 text-blue-300 shadow-sm border border-white/5' : 'bg-white text-blue-600 shadow-sm') : (isGlass ? 'text-white/30 hover:text-white/60' : 'text-gray-400')} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <CreditCard size={18} /> Crédito
                    </button>
                </div>

                {/* 2. AMOUNT INPUT (HUGE) */}
                <div className="text-center py-4">
                    <div className="flex justify-center items-center gap-1">
                        <span className={`text-4xl font-bold ${isGlass ? 'text-white/30' : 'text-gray-300'}`}>$</span>
                        <input autoComplete="off" id="input-field"
                            type="tel"
                            disabled={isSaving}
                            value={amount === '' ? '' : formatInputNumber(amount)}
                            onChange={(e) => {
                                const raw = e.target.value;
                                setAmount(raw === '' ? '' : parseInputNumber(raw));
                            }}
                            className={`text-5xl font-bold w-full text-center outline-none bg-transparent tracking-tighter ${isGlass ? 'text-white placeholder-white/10' : 'text-gray-800 placeholder-gray-200'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* 3. CREDIT CARD PANEL (If Credit) */}
                {type === 'credit' && (
                    <div className={`p-5 rounded-[30px] border relative overflow-hidden transition-all ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>

                        {/* Selector Tarjetas */}
                        <div className="mb-6">
                            <label htmlFor="input-field" className={`block text-xs font-bold uppercase mb-3 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Seleccionar Tarjeta</label>
                            
                            {loadingCards ? (
                                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                    <Skeleton className="h-28 w-40 rounded-2xl flex-shrink-0" />
                                    <Skeleton className="h-28 w-40 rounded-2xl flex-shrink-0" />
                                </div>
                            ) : cards.length === 0 ? (
                                <div className={`text-center py-6 px-4 border border-dashed rounded-2xl ${isGlass ? 'border-white/20 bg-white/5 text-white/70' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                                    <CreditCard className="mx-auto mb-2 opacity-50" size={28} />
                                    <p className="text-xs font-semibold mb-1">No tenés ninguna tarjeta de crédito registrada.</p>
                                    <p className="text-[11px] opacity-70 mb-3">Registrá una tarjeta para poder cargar compras en cuotas.</p>
                                    <button 
                                        type="button" 
                                        disabled={isSaving}
                                        onClick={() => navigate('/cards')} 
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 transition-colors"
                                    >
                                        + Ir a Mis Tarjetas
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                    {cards.map((card) => (
                                        <button aria-label="Acción" type="button"
                                            key={card.id}
                                            disabled={isSaving}
                                            onClick={() => setSelectedCardId(card.id)}
                                            className={`flex-shrink-0 cursor-pointer border-2 rounded-2xl p-4 w-40 relative transition-all text-left ${selectedCardId === card.id
                                                ? (isGlass ? 'border-blue-400/50 bg-blue-600/20' : 'border-blue-500 bg-blue-50')
                                                : (isGlass ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-gray-100 bg-white hover:border-gray-200')
                                                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                {getBrandLogo(card.name)}
                                                {selectedCardId === card.id && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>}
                                            </div>
                                            <p className={`text-sm font-bold truncate ${isGlass ? 'text-white' : 'text-gray-700'}`}>{card.name}</p>
                                            <div className="flex justify-between items-end mt-2">
                                                <div>
                                                    <p className={`text-[9px] uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Cierre</p>
                                                    <p className={`text-[10px] font-mono ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>Día {card.closeDay || '--'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-[9px] uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Vence</p>
                                                    <p className={`text-[10px] font-mono ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>Día {card.dueDay || '--'}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Slider Cuotas */}
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-2">
                                <label htmlFor="input-field" className={`text-xs font-bold uppercase ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Cuotas</label>
                                <span className={`text-2xl font-bold ${isGlass ? 'text-blue-300' : 'text-blue-600'}`}>{installments}x</span>
                            </div>
                            <input autoComplete="off" id="input-field"
                                type="range"
                                min="1"
                                max="12"
                                step="1"
                                disabled={isSaving}
                                value={installments}
                                onChange={(e) => setInstallments(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isGlass ? 'bg-white/10' : 'bg-gray-200'} accent-blue-500 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            {Number(amount) > 0 && installments > 0 && (
                                <p className={`text-center text-xs mt-3 font-medium ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                                    Cuota Mensual: <span className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{formatMoney(Math.round((Number(amount) / installments) * 100) / 100)}</span>
                                </p>
                            )}
                        </div>

                        {/* FUTURE IMPACT CHART */}
                        <div className={`rounded-2xl p-4 ${isGlass ? 'bg-black/20 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                            <h4 className={`text-[10px] font-bold uppercase mb-3 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Tu Compromiso Futuro (6 Meses)</h4>
                            <div className="space-y-2">
                                {projections.map((p, idx) => (
                                    <div key={p.monthLabel || idx} className="flex items-center gap-3 text-xs">
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
                    <label htmlFor="input-field" className={`block text-xs font-bold uppercase mb-3 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Categoría</label>
                    <div className="flex flex-wrap gap-2">
                        {['supermarket', 'food', 'transport', 'services', 'home', 'health', 'shopping', 'education', 'varios'].map(cat => (
                            <button aria-label="Acción"
                                key={cat}
                                type="button"
                                disabled={isSaving}
                                onClick={() => setCategory(cat)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${category === cat
                                    ? (isGlass ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900')
                                    : (isGlass ? 'bg-white/5 text-white/60 border-transparent hover:bg-white/10' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200')} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        <input autoComplete="off" id="input-field"
                            type="text"
                            disabled={isSaving}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`w-full bg-transparent border-b p-2 font-bold outline-none text-sm transition-colors ${isGlass ? 'border-white/10 text-white placeholder-white/20 focus:border-white/50' : 'border-gray-200 text-gray-700 focus:border-blue-500'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="Descripción (Opcional)"
                        />
                    </div>
                </div>

                {/* COMPARTIR TOGGLE */}
                {householdId && (
                    <div className={`p-4 mb-6 rounded-[24px] border flex items-center justify-between ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                        <div>
                            <p className={`text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Compartir en Hogar</p>
                            <p className={`text-[10px] ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Visible para el reparto proporcional</p>
                        </div>
                        <button aria-label="Acción" type="button" disabled={isSaving} onClick={() => setIsShared(!isShared)} className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none flex-shrink-0 ${isShared ? 'bg-indigo-600' : 'bg-gray-400'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${isShared ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                )}

                {/* 5. SAVE BUTTON */}
                <button aria-label="Acción"
                    type="submit"
                    disabled={isSaving || !amount || Number(amount) <= 0}
                    className={`w-full py-4 rounded-[30px] font-bold shadow-lg transition-all text-lg flex justify-center items-center gap-2 ${
                        isSaving || !amount || Number(amount) <= 0
                            ? (isGlass ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                            : (isGlass ? 'bg-white text-indigo-900 border border-white/50 hover:bg-indigo-50 active:scale-95' : 'bg-gray-900 text-white shadow-gray-400 active:scale-95')
                    }`}
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Guardando...
                        </>
                    ) : (
                        "Confirmar Gasto"
                    )}
                </button>

            </form>
        </div>
    );
}