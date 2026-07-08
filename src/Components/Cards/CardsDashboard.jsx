import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { formatInputNumber, parseInputNumber, formatMoney } from '../../utils';
import StatementUploader from './StatementUploader';
import StatementReviewer from './StatementReviewer';
import StatementDashboard from './StatementDashboard';
import { Sparkles, ArrowLeft, Plus, CreditCard as CreditCardIcon, ChevronRight } from 'lucide-react';
import { CARD_LOGO_MAP } from '../../config/constants';
import { useCards } from '../../context/CardsContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

const PRESET_COLORS = [
    '#1a1a1a', '#005f73', '#0a9396', '#ae2012',
    '#6a4c93', '#ca6702', '#2d3277', '#e63946', '#457b9d', '#ff006e'
];

const getMonthKey = (date) => {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getCardLogo = (name) => {
    const n = (name || '').toLowerCase();
    const match = CARD_LOGO_MAP.find(({ keywords }) => keywords.some(kw => n.includes(kw)));
    return match?.path || null;
};

// ── Mini tarjeta visual para el carrusel ─────────────────────────────────────
function CardVisual({ card, monthKey, privacyMode, onClick, isSelected }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
    const logo = getCardLogo(card.name);
    const stmt = card.monthlyStatements?.[monthKey];

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer flex-shrink-0 w-[82%] max-w-[280px] h-48 rounded-[28px] shadow-sm p-5 text-white flex flex-col relative overflow-hidden snap-center transition-all duration-200 active:scale-95 group ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-[1.02]' : 'hover:scale-[1.01]'}`}
            style={{ backgroundColor: card.color || 'var(--card-color)' }}
        >
            {/* Glow */}
            <div className="absolute top-0 end-0 w-32 h-32 bg-white/5 rounded-full -me-10 -mt-10 blur-xl pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-auto relative z-10">
                {logo ? (
                    <img src={logo} alt={`Logo de ${card.name}`} className="h-6 object-contain filter brightness-200 contrast-200 drop-shadow-sm" loading="lazy" />
                ) : (
                    <span className="font-bold text-sm tracking-wider uppercase opacity-90">{card.name}</span>
                )}
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono backdrop-blur-sm uppercase tracking-wide">{card.bank}</span>
            </div>

            {/* Días */}
            <div className="relative z-10 flex gap-4 mb-3">
                <div>
                    <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Cierre</p>
                    <p className="font-mono text-sm font-bold opacity-90">Día {card.closeDay}</p>
                </div>
                <div>
                    <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Vence</p>
                    <p className="font-mono text-sm font-bold opacity-90">Día {card.dueDay}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="z-10 border-t border-white/20 pt-2 flex justify-between items-end">
                <div>
                    <p className="text-[9px] opacity-70 uppercase mb-0.5 font-medium tracking-wide">Total a pagar</p>
                    <p className="font-mono text-xl font-bold tracking-tight">
                        {stmt ? showMoney(stmt.totalDue) : <span className="text-sm opacity-50">Sin resumen</span>}
                    </p>
                </div>
                <div className="flex items-center gap-1 text-white/60 text-[10px] font-bold uppercase tracking-wide">
                    Ver <ChevronRight size={12} />
                </div>
            </div>
        </div>
    );
}

// ── Panel resumen del mes (total tarjetas) ───────────────────────────────────
function MonthlyCardsSummary({ cards, monthKey, privacyMode, isGlass }) {
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-500';

    // Sumamos el totalDue de cada tarjeta para el mes activo
    const cardsWithData = cards.map(card => ({
        card,
        stmt: card.monthlyStatements?.[monthKey] || null,
        isPaid: card.paidPeriods?.includes(monthKey) || false,
    }));

    const grandTotal = cardsWithData.reduce((acc, { stmt }) => acc + (stmt?.totalDue || 0), 0);
    const pendingTotal = cardsWithData
        .filter(({ isPaid }) => !isPaid)
        .reduce((acc, { stmt }) => acc + (stmt?.totalDue || 0), 0);

    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    // Formateamos la fecha de vencimiento de forma legible
    const formatDueDate = (dateStr) => {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}`;
    };

    if (cards.length === 0) return null;

    return (
        <div className={`rounded-2xl overflow-hidden ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
            {/* Header del panel */}
            <div className={`px-5 pt-4 pb-3 flex justify-between items-center border-b ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${sub}`}>Total tarjetas · este mes</p>
                    <p className={`text-2xl font-black tracking-tight ${text}`}>{showMoney(grandTotal)}</p>
                </div>
                {pendingTotal > 0 && pendingTotal < grandTotal && (
                    <div className="text-right">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${sub}`}>Pendiente</p>
                        <p className="text-lg font-black text-amber-500 tracking-tight">{showMoney(pendingTotal)}</p>
                    </div>
                )}
                {grandTotal > 0 && pendingTotal === 0 && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-xs font-bold text-emerald-500">Todo pagado</span>
                    </div>
                )}
            </div>

            {/* Detalle por tarjeta */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
                {cardsWithData.map(({ card, stmt, isPaid }) => (
                    <div key={card.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Dot de color de la tarjeta */}
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: card.color || '#888' }} />
                            <div className="min-w-0">
                                <p className={`text-sm font-bold truncate ${text}`}>{card.name}</p>
                                {stmt?.dueDate ? (
                                    <p className={`text-[10px] ${sub}`}>Vence {formatDueDate(stmt.dueDate)}</p>
                                ) : (
                                    <p className="text-[10px] text-amber-500 font-semibold">Resumen pendiente</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {stmt ? (
                                <span className={`text-sm font-black ${text}`}>{showMoney(stmt.totalDue)}</span>
                            ) : (
                                <span className={`text-xs font-bold ${sub}`}>—</span>
                            )}
                            {isPaid ? (
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓</span>
                            ) : stmt ? (
                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">⏳</span>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Vista lista (carrusel + nueva tarjeta) ────────────────────────────────────
function CardsList({ cards, monthKey, privacyMode, isGlass, onSelectCard, onNewCard, onBack }) {
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-200'}`}>
                <div className="flex items-center gap-3">
                    <button type="button"
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <CreditCardIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Tarjetas de Crédito</h2>
                            <p className="text-white/70 text-xs">{cards.length} tarjeta{cards.length !== 1 ? 's' : ''} registrada{cards.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel resumen del mes */}
            <MonthlyCardsSummary cards={cards} monthKey={monthKey} privacyMode={privacyMode} isGlass={isGlass} />

            {/* Carrusel */}
            {cards.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-4 px-2 snap-x snap-mandatory hide-scrollbar">
                    {cards.map(card => (
                        <CardVisual
                            key={card.id}
                            card={card}
                            monthKey={monthKey}
                            privacyMode={privacyMode}
                            onClick={() => onSelectCard(card)}
                            isSelected={false}
                        />
                    ))}
                </div>
            ) : (
                <div className={`rounded-2xl p-8 text-center ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isGlass ? 'bg-white/10' : 'bg-blue-50'}`}>
                        <CreditCardIcon size={28} className={isGlass ? 'text-white/40' : 'text-blue-300'} />
                    </div>
                    <p className={`font-bold text-base mb-1 ${text}`}>Sin tarjetas aún</p>
                    <p className={`text-sm ${sub}`}>Agregá tu primera tarjeta para empezar a registrar resúmenes.</p>
                </div>
            )}

            {/* Botón nueva tarjeta */}
            <button type="button"
                onClick={onNewCard}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isGlass ? 'bg-surface-glass border border-white/10 text-white hover:bg-white/20' : 'bg-brand-primary text-surface-light hover:bg-blue-700'}`}
            >
                <Plus size={18} />
                Agregar Tarjeta
            </button>

            {/* Tip */}
            {cards.length > 0 && (
                <p className={`text-xs text-center px-4 ${sub}`}>
                    Tocá una tarjeta para ver o cargar el resumen del mes.
                </p>
            )}
        </div>
    );
}

// ── Vista detalle (formulario inline sin modal) ───────────────────────────────
function CardDetail({ card, isNewCard, currentDate, privacyMode, isGlass, householdId, onBack }) {
    const [activeTab, setActiveTab] = useState(isNewCard ? 'card' : 'statement');
    const [form, setForm] = useState({
        name: card?.name || '',
        bank: card?.bank || '',
        closeDay: card?.closeDay || '',
        dueDay: card?.dueDay || '',
        color: card?.color || PRESET_COLORS[0],
        isShared: card?.isShared !== undefined ? card.isShared : true,
    });
    const [statement, setStatement] = useState({ totalDue: '', dueDate: '', nextCloseDate: '', nextDueDate: '', isPaid: false, transactions: [] });
    const [aiState, setAiState] = useState('idle');
    const [aiData, setAiData] = useState(null);

    const monthKey = getMonthKey(currentDate);
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const monthLabel = currentDate
        ? currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        : '';

    useEffect(() => {
        if (card && !isNewCard) {
            setForm({
                name: card.name || '',
                bank: card.bank || '',
                closeDay: card.closeDay || '',
                dueDay: card.dueDay || '',
                color: card.color || PRESET_COLORS[0],
                isShared: card.isShared !== undefined ? card.isShared : true,
            });
            const saved = card.monthlyStatements?.[monthKey] || {};
            setStatement({
                totalDue: saved.totalDue || '',
                dueDate: saved.dueDate || '',
                nextCloseDate: saved.nextCloseDate || '',
                nextDueDate: saved.nextDueDate || '',
                isPaid: card.paidPeriods?.includes(monthKey) || false,
                transactions: saved.transactions || [],
            });
        }
    }, [card, monthKey, isNewCard]);

    const handleSaveCard = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        const dataToSave = {
            name: form.name,
            bank: form.bank,
            closeDay: Number(form.closeDay),
            dueDay: Number(form.dueDay),
            color: form.color,
            userId: auth.currentUser.uid,
            ...(householdId && { householdId, ownerId: auth.currentUser.uid, isShared: form.isShared }),
        };
        try {
            if (card?.id) await updateDoc(doc(db, 'cards', card.id), dataToSave);
            else { const newId = Date.now().toString(); await setDoc(doc(db, 'cards', newId), dataToSave); }
            onBack();
        } catch (error) { console.error(error); alert('Error al guardar.'); }
    };

    const handleSaveStatement = async (e) => {
        e.preventDefault();
        if (!auth.currentUser || !card?.id) return;
        const statementData = {
            totalDue: Number(statement.totalDue) || 0,
            dueDate: statement.dueDate,
            nextCloseDate: statement.nextCloseDate,
            nextDueDate: statement.nextDueDate,
            transactions: statement.transactions || []
        };
        try {
            const currentPaidPeriods = card.paidPeriods || [];
            let newPaidPeriods = [...currentPaidPeriods];
            if (statement.isPaid) { if (!newPaidPeriods.includes(monthKey)) newPaidPeriods.push(monthKey); }
            else { newPaidPeriods = newPaidPeriods.filter(p => p !== monthKey); }
            await updateDoc(doc(db, 'cards', card.id), {
                [`monthlyStatements.${monthKey}`]: statementData,
                paidPeriods: newPaidPeriods,
            });
            onBack();
        } catch (error) { console.error(error); alert('Error al guardar el resumen.'); }
    };

    const handleDelete = async () => {
        if (window.confirm('¿Seguro que querés borrar esta tarjeta?')) {
            try {
                await deleteDoc(doc(db, 'cards', card.id));
                onBack();
            } catch (e) { console.error(e); }
        }
    };

    const handleAIConfirm = async (confirmedData) => {
        if (!auth.currentUser || !card?.id) return;

        // Calculamos el total desde las transacciones (más confiable que el campo de la IA)
        // La IA puede devolver el campo con distintos nombres o nulo
        const totalFromTransactions = (confirmedData.transactions || [])
            .filter(t => !t.isPayment)
            .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

        const newTotalDue = 
            Number(confirmedData.summary?.totalConsumption) ||
            Number(confirmedData.summary?.currentBalance) ||
            Number(confirmedData.summary?.totalDue) ||
            totalFromTransactions ||
            0;


        const newDueDate = confirmedData.summary?.dueDate || statement.dueDate;
        const newNextCloseDate = confirmedData.summary?.nextClosingDate || statement.nextCloseDate;
        const newNextDueDate = confirmedData.summary?.nextDueDate || statement.nextDueDate;
        setStatement(s => ({ ...s, totalDue: newTotalDue, dueDate: newDueDate, nextCloseDate: newNextCloseDate, nextDueDate: newNextDueDate }));
        const statementData = {
            totalDue: newTotalDue,
            dueDate: newDueDate,
            nextCloseDate: newNextCloseDate,
            nextDueDate: newNextDueDate,
            transactions: confirmedData.transactions
        };
        try {
            const updates = { [`monthlyStatements.${monthKey}`]: statementData };
            const [year, month] = monthKey.split('-').map(Number);
            confirmedData.transactions.forEach(tx => {
                if (tx.isInstallment && tx.installmentTotal > 1 && tx.installmentCurrent < tx.installmentTotal) {
                    const remaining = tx.installmentTotal - tx.installmentCurrent;
                    for (let i = 1; i <= remaining; i++) {
                        const nextMonth = month + i;
                        const nextYear = year + Math.floor((nextMonth - 1) / 12);
                        const nextMonthNormalized = ((nextMonth - 1) % 12) + 1;
                        const futureMonthKey = `${nextYear}-${String(nextMonthNormalized).padStart(2, '0')}`;
                        const futureTx = { ...tx, installmentCurrent: tx.installmentCurrent + i };
                        if (!updates[`monthlyStatements.${futureMonthKey}`]) {
                            const existingFuture = card.monthlyStatements?.[futureMonthKey] || { totalDue: 0, transactions: [] };
                            updates[`monthlyStatements.${futureMonthKey}`] = { ...existingFuture, transactions: existingFuture.transactions ? [...existingFuture.transactions] : [] };
                        }
                        updates[`monthlyStatements.${futureMonthKey}`].transactions.push(futureTx);
                        updates[`monthlyStatements.${futureMonthKey}`].totalDue = (updates[`monthlyStatements.${futureMonthKey}`].totalDue || 0) + (tx.amount || 0);
                    }
                }
            });
            await updateDoc(doc(db, 'cards', card.id), updates);
            setAiState('idle');
            setStatement(s => ({ ...s, transactions: confirmedData.transactions }));
        } catch (error) { console.error(error); alert('Error al guardar los datos de la IA.'); }
    };

    const inputClass = `w-full p-3 rounded-xl outline-none font-medium transition-colors ${isGlass ? 'bg-surface-glass border border-white/10 text-white placeholder-white/30 focus:bg-white/10 focus:border-white/30' : 'bg-surface-DEFAULT border border-gray-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary'}`;
    const labelClass = `block text-xs font-bold mb-1 ms-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-200'}`}>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={onBack} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${form.color}40` }}>
                            <CreditCardIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">{isNewCard ? 'Nueva Tarjeta' : form.name || 'Tarjeta'}</h2>
                            <p className="text-white/70 text-xs">{isNewCard ? 'Completá los datos' : form.bank}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs (solo si hay tarjeta existente) */}
            {!isNewCard && card && (
                <div className={`flex rounded-2xl overflow-hidden ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    {['card', 'statement'].map(tab => (
                        <button type="button"
                            key={tab}
                            onClick={() => { setActiveTab(tab); setAiState('idle'); }}
                            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === tab
                                ? (isGlass ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600')
                                : (isGlass ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600')}`}
                        >
                            {tab === 'card' ? '💳 Tarjeta' : `📋 Resumen · ${monthLabel}`}
                        </button>
                    ))}
                </div>
            )}

            {/* ── TAB: DATOS DE TARJETA ── */}
            {activeTab === 'card' && (
                <div className={`rounded-2xl p-5 space-y-4 ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    {/* Preview */}
                    <div className="rounded-2xl p-4 text-white shadow-sm flex flex-col min-h-[160px] relative overflow-hidden" style={{ backgroundColor: form.color }}>
                        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                        <div className="flex justify-between items-start mb-auto relative z-10">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-90">{form.bank || 'BANCO'}</span>
                            <span className="font-bold">{form.name || 'TARJETA'}</span>
                        </div>
                        <div className="relative z-10 text-end">
                            <p className="text-[10px] opacity-70 uppercase tracking-widest">Cierre · Vencimiento</p>
                            <p className="font-mono text-sm font-bold">{form.closeDay || '--'} · {form.dueDay || '--'}</p>
                        </div>
                        {householdId && (
                            <div className="z-10 mt-2 flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-md self-start">
                                <span className={`w-2 h-2 rounded-full ${form.isShared ? 'bg-status-success' : 'bg-status-danger'}`} />
                                <span className="text-[8px] uppercase tracking-wide opacity-80">{form.isShared ? 'Compartida' : 'Privada'}</span>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSaveCard} className="space-y-4">
                        {householdId && (
                            <div className={`p-4 rounded-xl flex items-center justify-between ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                                <div>
                                    <p className={`text-sm font-bold ${text}`}>Compartir en Hogar</p>
                                    <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Visible para tu pareja</p>
                                </div>
                                <button type="button" aria-label="Alternar tarjeta compartida" onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))} className={`w-12 h-7 rounded-full transition-colors relative ${form.isShared ? 'bg-brand-primary' : 'bg-gray-400'}`}>
                                    <div className={`absolute top-1 start-1 w-5 h-5 bg-white rounded-full transition-transform ${form.isShared ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>Nombre (ej. Visa Oro)</label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Descripción corta" />
                        </div>
                        <div>
                            <label className={labelClass}>Banco Emisor</label>
                            <input required value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} className={inputClass} placeholder="Galicia, Santander, etc." />
                        </div>
                        <div>
                            <label className={`${labelClass} mb-2`}>Color de Tarjeta</label>
                            <div className="flex flex-wrap gap-2 p-2">
                                {PRESET_COLORS.map(color => (
                                    <button key={color} type="button" onClick={() => setForm({ ...form, color })} className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: color }} />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Día de Cierre</label>
                                <input required type="number" min="1" max="31" value={form.closeDay} onChange={e => setForm({ ...form, closeDay: e.target.value })} className={`${inputClass} text-center`} placeholder="Ej: 5" />
                            </div>
                            <div>
                                <label className={labelClass}>Día de Vencimiento</label>
                                <input required type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} className={`${inputClass} text-center`} placeholder="Ej: 20" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            {card && (
                                <button type="button" onClick={handleDelete} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors border ${isGlass ? 'text-status-danger bg-status-danger/10 hover:bg-status-danger/20 border-status-danger/20' : 'text-status-danger bg-surface-light hover:bg-red-50 border-red-200'}`}>Eliminar</button>
                            )}
                            <button type="submit" className={`flex-[2] py-3 rounded-xl font-bold text-sm transition-all ${isGlass ? 'bg-surface-light text-brand-dark hover:bg-gray-200' : 'bg-brand-primary text-surface-light hover:bg-blue-700'}`}>Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── TAB: RESUMEN DEL MES ── */}
            {activeTab === 'statement' && card && (
                <div className={`rounded-2xl p-5 space-y-4 ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    {aiState === 'uploading' && (
                        <div className="py-2 animate-in fade-in">
                            <StatementUploader onAnalysisComplete={data => { setAiData(data); setAiState('reviewing'); }} />
                            <button type="button" onClick={() => setAiState('idle')} className={`w-full mt-4 text-xs font-bold uppercase tracking-wider ${isGlass ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>Cancelar</button>
                        </div>
                    )}

                    {aiState === 'reviewing' && aiData && (
                        <StatementReviewer data={aiData} onConfirm={handleAIConfirm} onCancel={() => { setAiState('idle'); setAiData(null); }} />
                    )}

                    {aiState === 'idle' && (
                        <>
                            {(!statement.transactions || statement.transactions.length === 0) && (
                                <>
                                    <button type="button"
                                        onClick={() => setAiState('uploading')}
                                        className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Cargar Resumen con IA
                                    </button>
                                    <div className="relative flex items-center py-2">
                                        <div className={`flex-grow border-t ${isGlass ? 'border-white/10' : 'border-gray-200'}`} />
                                        <span className={`flex-shrink-0 mx-4 text-xs font-bold uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>O carga manual</span>
                                        <div className={`flex-grow border-t ${isGlass ? 'border-white/10' : 'border-gray-200'}`} />
                                    </div>
                                </>
                            )}

                            <form onSubmit={handleSaveStatement} className="space-y-4">
                                {/* Toggle pagado */}
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${statement.isPaid ? 'bg-emerald-500 text-white' : 'bg-white/10 text-emerald-500/50'}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${text}`}>¿Ya pagaste esta tarjeta?</p>
                                            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider">{statement.isPaid ? 'Marcada como pagada' : 'Pendiente de pago'}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Marcar como pagado"
                                        onClick={() => setStatement(s => ({ ...s, isPaid: !s.isPaid }))}
                                        className={`w-12 h-7 rounded-full transition-all relative ${statement.isPaid ? 'bg-status-success' : 'bg-white/10 border border-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 start-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${statement.isPaid ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <p className={`text-[10px] font-bold uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'} ml-1`}>Datos del período</p>

                                <div>
                                    <label className={labelClass}>Total a Pagar ($)</label>
                                    <input
                                        type="text" inputMode="numeric"
                                        value={formatInputNumber(statement.totalDue)}
                                        onChange={e => setStatement({ ...statement, totalDue: parseInputNumber(e.target.value) })}
                                        className={inputClass} placeholder="Ej: 85.000"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Fecha de Vencimiento</label>
                                    <input type="date" value={statement.dueDate} onChange={e => setStatement({ ...statement, dueDate: e.target.value })} className={inputClass} />
                                </div>

                                <div className={`p-3 rounded-xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase mb-3 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Próximo período</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Próximo Cierre</label>
                                            <input type="date" value={statement.nextCloseDate} onChange={e => setStatement({ ...statement, nextCloseDate: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Próximo Vencimiento</label>
                                            <input type="date" value={statement.nextDueDate} onChange={e => setStatement({ ...statement, nextDueDate: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isGlass ? 'bg-surface-light text-brand-dark hover:bg-gray-200' : 'bg-brand-primary text-surface-light hover:bg-blue-700'}`}>
                                    Guardar Resumen
                                </button>
                            </form>

                            {statement.transactions && statement.transactions.length > 0 && (
                                <div className={`pt-4 border-t ${isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                                    <StatementDashboard statement={statement} isGlass={isGlass} onReload={() => setAiState('uploading')} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CardsDashboard({ initialCard }) {
    const { isGlass, privacyMode, currentDate } = useUI();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const householdId = userData?.householdId;
    const { cards } = useCards();
    const [selectedCard, setSelectedCard] = useState(null);
    const [isNew, setIsNew] = useState(false);

    // Si viene una tarjeta pre-seleccionada desde el dashboard, la abrimos directamente
    useEffect(() => {
        if (initialCard) {
            setSelectedCard(initialCard);
            setIsNew(false);
        }
    }, [initialCard]);

    const monthKey = getMonthKey(currentDate);

    if (selectedCard || isNew) {
        return (
            <CardDetail
                card={selectedCard}
                isNewCard={isNew}
                currentDate={currentDate}
                privacyMode={privacyMode}
                isGlass={isGlass}
                householdId={householdId}
                onBack={() => { setSelectedCard(null); setIsNew(false); }}
            />
        );
    }

    return (
        <CardsList
            cards={cards}
            monthKey={monthKey}
            privacyMode={privacyMode}
            isGlass={isGlass}
            onSelectCard={(card) => { setSelectedCard(card); setIsNew(false); }}
            onNewCard={() => { setSelectedCard(null); setIsNew(true); }}
            onBack={() => { setSelectedCard(null); navigate('/dashboard'); }}
        />
    );
}
