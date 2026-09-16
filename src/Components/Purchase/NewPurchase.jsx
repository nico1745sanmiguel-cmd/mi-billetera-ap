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

const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function NewPurchase({ onSave }) {
    const navigate = useNavigate();
    const { cards = [], transactions = [], addTransaction, loadingCards } = useCards();
    const { user } = useAuth();
    const householdId = user?.householdId;
    const { showToast, currentDate, isGlass } = useUI();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(() => {
        if (currentDate) {
            const realToday = new Date();
            const isSameMonth = currentDate.getMonth() === realToday.getMonth() && currentDate.getFullYear() === realToday.getFullYear();
            if (!isSameMonth) {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                return `${year}-${month}-01`;
            }
        }
        return getLocalDateString();
    });
    const [type, setType] = useState('cash'); // 'cash' | 'credit'
    const [selectedCardId, setSelectedCardId] = useState('');
    const [installments, setInstallments] = useState(1);
    const [category, setCategory] = useState('varios');
    const [isShared, setIsShared] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);

    const setDateToday = () => setDate(getLocalDateString(new Date()));
    const setDateYesterday = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        setDate(getLocalDateString(d));
    };

    // --- PROJECTIONS HOOK ---
    const projections = useFinancialProjections(
        transactions,
        cards,
        currentDate,
        (type === 'credit' && amount) ? { amount, installments, cardId: selectedCardId } : null
    );

    // --- MÁQUINA DEL TIEMPO ⏳ (Sincronización limpia en useEffect) ---
    useEffect(() => {
        if (!currentDate) return;
        const realToday = new Date();
        const isSameMonth = currentDate.getMonth() === realToday.getMonth() && currentDate.getFullYear() === realToday.getFullYear();
        if (isSameMonth) {
            setDate(getLocalDateString(realToday));
        } else {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            setDate(`${year}-${month}-01`);
        }
    }, [currentDate]);

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
        setSubmitAttempted(true);
        if (isSaving) return;

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            showToast("Ingresa un monto válido mayor a $ 0", "warning");
            return;
        }

        if (type === 'credit') {
            if (!selectedCardId || !cards.some(c => c.id === selectedCardId)) {
                showToast("Debes seleccionar una tarjeta para compras con crédito", "warning");
                return;
            }
        }

        setIsSaving(true);
        const transactionData = {
            amount: numAmount,
            description: (description || '').trim() || 'Gasto General',
            date: date || getLocalDateString(),
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

    const isCreditMissingCard = type === 'credit' && (!selectedCardId || cards.length === 0);
    const amountHasError = submitAttempted && (!amount || Number(amount) <= 0);
    const creditCardHasError = submitAttempted && isCreditMissingCard;

    return (
        <div className="animate-fade-in max-w-lg mx-auto pb-32">

            <form onSubmit={handleSave} className="space-y-6">

                {/* 1. PAYMENT METHOD (TOP) */}
                <div className={`flex p-1 rounded-2xl mx-1 ${isGlass ? 'bg-white/5' : 'bg-gray-200'}`}>
                    <button aria-label="Efectivo o Débito"
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                            if (submitAttempted) setSubmitAttempted(false);
                            setType('cash');
                        }}
                        className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'cash' ? (isGlass ? 'bg-white/10 text-green-300 shadow-sm border border-white/5' : 'bg-white text-green-600 shadow-sm') : (isGlass ? 'text-white/60 hover:text-white' : 'text-gray-600')} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Banknote size={18} /> Efectivo / Débito
                    </button>
                    <button aria-label="Crédito"
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                            if (submitAttempted) setSubmitAttempted(false);
                            setType('credit');
                        }}
                        className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'credit' ? (isGlass ? 'bg-white/10 text-blue-300 shadow-sm border border-white/5' : 'bg-white text-blue-600 shadow-sm') : (isGlass ? 'text-white/60 hover:text-white' : 'text-gray-600')} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <CreditCard size={18} /> Crédito
                    </button>
                </div>

                {/* 2. AMOUNT INPUT (HUGE) */}
                <div className={`text-center py-4 px-3 rounded-3xl transition-all border-2 ${
                    amountHasError
                        ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/20'
                        : 'border-transparent'
                }`}>
                    <div className="flex justify-center items-center gap-1">
                        <span className={`text-4xl font-bold ${amountHasError ? 'text-red-400' : (isGlass ? 'text-white/60' : 'text-gray-500')}`}>$</span>
                        <input
                            autoComplete="off"
                            id="purchase-amount"
                            aria-label="Monto de la compra"
                            type="tel"
                            disabled={isSaving}
                            value={amount === '' ? '' : formatInputNumber(amount)}
                            onChange={(e) => {
                                if (submitAttempted) setSubmitAttempted(false);
                                const raw = e.target.value;
                                setAmount(raw === '' ? '' : parseInputNumber(raw));
                            }}
                            className={`text-5xl font-bold w-full text-center outline-none bg-transparent tracking-tighter ${
                                amountHasError
                                    ? 'text-red-500 placeholder-red-300'
                                    : (isGlass ? 'text-white placeholder-white/10' : 'text-gray-800 placeholder-gray-200')
                            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="0"
                        />
                    </div>
                    {amountHasError && (
                        <p className="text-xs text-red-400 font-medium mt-1">El monto debe ser mayor a 0</p>
                    )}
                </div>

                {/* 3. CREDIT CARD PANEL (If Credit) */}
                {type === 'credit' && (
                    <div className={`p-5 rounded-[30px] border relative overflow-hidden transition-all ${
                        creditCardHasError ? 'border-red-500 ring-2 ring-red-500/20' : (isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100')
                    }`}>

                        {/* Selector Tarjetas */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3 ml-1">
                                <p className={`block text-xs font-bold uppercase ${creditCardHasError ? 'text-red-400' : (isGlass ? 'text-white/70' : 'text-gray-600')}`}>Seleccionar Tarjeta</p>
                                {creditCardHasError && <span className="text-xs text-red-400 font-medium">Obligatorio</span>}
                            </div>
                            
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
                                        <button aria-label={`Seleccionar tarjeta ${card.name}`} type="button"
                                            key={card.id}
                                            disabled={isSaving}
                                            onClick={() => {
                                                if (submitAttempted) setSubmitAttempted(false);
                                                setSelectedCardId(card.id);
                                            }}
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

                        {/* Slider y Selector de Cuotas (1 a 60) */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="purchase-installments-input" className={`text-xs font-bold uppercase ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>Cuotas (1 a 60)</label>
                                <div className="flex items-center gap-1">
                                    <input
                                        id="purchase-installments-input"
                                        aria-label="Número de cuotas"
                                        type="number"
                                        min="1"
                                        max="60"
                                        disabled={isSaving}
                                        value={installments}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (!isNaN(val)) {
                                                setInstallments(Math.max(1, Math.min(60, val)));
                                            } else {
                                                setInstallments(1);
                                            }
                                        }}
                                        className={`w-14 text-right text-2xl font-bold bg-transparent outline-none border-b border-dashed ${
                                            isGlass ? 'text-blue-300 border-blue-400/40 focus:border-blue-400' : 'text-blue-600 border-blue-300 focus:border-blue-600'
                                        }`}
                                    />
                                    <span className={`text-2xl font-bold ${isGlass ? 'text-blue-300' : 'text-blue-600'}`}>x</span>
                                </div>
                            </div>

                            {/* Chips de planes de cuotas frecuentes */}
                            <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Planes frecuentes de cuotas">
                                {[1, 3, 6, 12, 18, 24, 36, 60].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        disabled={isSaving}
                                        aria-pressed={installments === n}
                                        aria-label={`${n} cuotas`}
                                        onClick={() => setInstallments(n)}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                                            installments === n
                                                ? (isGlass ? 'bg-blue-500 text-white border-blue-400 shadow-sm' : 'bg-blue-600 text-white border-blue-600 shadow-sm')
                                                : (isGlass ? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200')
                                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {n}x
                                    </button>
                                ))}
                            </div>

                            <input
                                autoComplete="off"
                                id="purchase-installments"
                                aria-label="Cantidad de cuotas"
                                type="range"
                                min="1"
                                max="60"
                                step="1"
                                disabled={isSaving}
                                value={installments}
                                onChange={(e) => setInstallments(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isGlass ? 'bg-white/10' : 'bg-gray-200'} accent-blue-500 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            {Number(amount) > 0 && installments > 0 && (
                                <p className={`text-center text-xs mt-3 font-medium ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
                                    Cuota Mensual: <span className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{formatMoney(Math.round((Number(amount) / installments) * 100) / 100)}</span>
                                </p>
                            )}
                        </div>

                        {/* FUTURE IMPACT CHART */}
                        <div className={`rounded-2xl p-4 ${isGlass ? 'bg-black/20 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                            <h4 className={`text-[10px] font-bold uppercase mb-3 ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>Tu Compromiso Futuro (6 Meses)</h4>
                            <div className="space-y-2">
                                {projections.map((p, idx) => (
                                    <div key={p.monthLabel || idx} className="flex items-center gap-3 text-xs">
                                        <div className={`w-8 font-bold ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>{p.monthLabel}</div>
                                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-200'}`}>
                                            <div className="h-full bg-blue-500/30" style={{ width: `${(p.existing / (p.total * 1.2 || 1)) * 100}%` }}></div> {/* Base Debt */}
                                            {p.newImpact > 0 && (
                                                <div className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" style={{ width: `${(p.newImpact / (p.total * 1.2 || 1)) * 100}%`, marginLeft: `-${(p.existing / (p.total * 1.2 || 1)) * 100}%`, transform: `translateX(${(p.existing / (p.total * 1.2 || 1)) * 100}%)` }}></div>
                                            )}
                                            {/* Fix overlapping logic visually simplified */}
                                        </div>
                                        <div className={`w-20 text-right font-mono font-bold ${p.newImpact > 0 ? (isGlass ? 'text-blue-300' : 'text-blue-600') : (isGlass ? 'text-white/60' : 'text-gray-500')}`}>
                                            {formatMoney(p.total)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* 4. DETAILS (Category, Date & Desc) */}
                <div className={`p-5 rounded-[30px] border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                    <label className={`block text-xs font-bold uppercase mb-3 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Categoría</label>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Seleccionar categoría">
                        {['supermarket', 'food', 'transport', 'services', 'home', 'health', 'shopping', 'education', 'varios'].map(cat => (
                            <button
                                aria-label={`Categoría ${cat}`}
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

                    {/* Fecha del Gasto */}
                    <div className="mt-5">
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="purchase-date" className={`text-xs font-bold uppercase ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                                Fecha del Gasto
                            </label>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={setDateToday}
                                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center transition-all border ${
                                        date === getLocalDateString(new Date())
                                            ? (isGlass ? 'bg-white/20 text-white border-white/30' : 'bg-gray-200 text-gray-800 border-gray-300')
                                            : (isGlass ? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200')
                                    }`}
                                >
                                    Hoy
                                 </button>
                                 <button
                                     type="button"
                                     disabled={isSaving}
                                     onClick={setDateYesterday}
                                     className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center transition-all border ${
                                         isGlass ? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                     }`}
                                 >
                                     Ayer
                                 </button>
                            </div>
                        </div>
                        <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all ${isGlass ? 'bg-white/5 border-white/10 text-white focus-within:border-blue-400/50 focus-within:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-800 focus-within:border-blue-500 focus-within:bg-white'}`}>
                            <CalendarDays size={18} className={isGlass ? 'text-white/60' : 'text-gray-500'} />
                            <input
                                id="purchase-date"
                                aria-label="Fecha del gasto"
                                type="date"
                                disabled={isSaving}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-transparent font-bold outline-none text-sm cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label htmlFor="purchase-description" className={`block text-xs font-bold uppercase mb-1.5 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
                            Descripción
                        </label>
                        <input
                            autoComplete="off"
                            id="purchase-description"
                            aria-label="Descripción del gasto"
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
                            <p className={`text-[10px] ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>Visible para el reparto proporcional</p>
                        </div>
                        <button aria-label="Alternar compartir gasto en el hogar" type="button" disabled={isSaving} onClick={() => setIsShared(!isShared)} className={`min-h-[44px] min-w-[48px] inline-flex items-center justify-center focus:outline-none flex-shrink-0 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div className={`w-12 h-7 rounded-full transition-colors relative ${isShared ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${isShared ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </button>
                    </div>
                )}

                {/* 5. SAVE BUTTON */}
                <button
                    aria-label="Confirmar gasto"
                    type="submit"
                    disabled={isSaving}
                    className={`w-full py-4 rounded-[30px] font-bold shadow-lg transition-all text-lg flex justify-center items-center gap-2 ${
                        isSaving
                            ? (isGlass ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                            : (isGlass ? 'bg-white text-indigo-900 border border-white/50 hover:bg-indigo-50 active:scale-95' : 'bg-gray-900 text-white shadow-gray-400 active:scale-95')
                    }`}
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Guardando...
                        </>
                    ) : isCreditMissingCard ? (
                        cards.length === 0 ? "Agregá una tarjeta para continuar" : "Seleccioná una tarjeta"
                    ) : (
                        "Confirmar Gasto"
                    )}
                </button>

            </form>
        </div>
    );
}