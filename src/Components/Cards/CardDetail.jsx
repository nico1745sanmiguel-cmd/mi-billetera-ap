import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc, updateDoc, setDoc, collection, arrayUnion, arrayRemove } from 'firebase/firestore';
import { formatInputNumber, parseInputNumber } from '../../utils';
import StatementUploader from './StatementUploader';
import StatementDashboard from './StatementDashboard';
import CardVisual from './CardVisual';
import { Sparkles, ArrowLeft, CreditCard as CreditCardIcon } from 'lucide-react';
import { formatMonthKey } from '../../utils/cardDebtUtils';

const PRESET_COLORS = [
    '#1a1a1a', '#005f73', '#0a9396', '#ae2012',
    '#6a4c93', '#ca6702', '#2d3277', '#e63946', '#457b9d', '#ff006e'
];

export default function CardDetail({ card, isNewCard, currentDate, privacyMode, isGlass, householdId, onBack }) {
    const [activeTab, setActiveTab] = useState(isNewCard ? 'card' : 'statement');
    const [form, setForm] = useState({
        name: card?.name || '',
        bank: card?.bank || '',
        closeDay: card?.closeDay || '',
        dueDay: card?.dueDay || '',
        color: card?.color || PRESET_COLORS[0]
    });
    const [statement, setStatement] = useState({
        totalDue: '',
        dueDate: '',
        nextCloseDate: '',
        nextDueDate: '',
        isPaid: false
    });


    const monthKey = formatMonthKey(currentDate);

    const [prevCardId, setPrevCardId] = useState(card?.id || null);
    const [prevMonthKey, setPrevMonthKey] = useState(monthKey);

    // Sync state when props change (evita el bug de useEffect sincronizando props)
    if (card?.id !== prevCardId || monthKey !== prevMonthKey) {
        setPrevCardId(card?.id || null);
        setPrevMonthKey(monthKey);
        
        if (card && !isNewCard) {
            setForm({
                name: card.name || '',
                bank: card.bank || '',
                closeDay: card.closeDay || '',
                dueDay: card.dueDay || '',
                color: card.color || PRESET_COLORS[0]
            });
            const st = card.monthlyStatements?.[monthKey];
            if (st) {
                setStatement({
                    totalDue: st.totalDue || '',
                    dueDate: st.dueDate || '',
                    nextCloseDate: st.nextCloseDate || '',
                    nextDueDate: st.nextDueDate || '',
                    isPaid: card.paidPeriods?.includes(monthKey) || false
                });
            } else {
                setStatement({ totalDue: '', dueDate: '', nextCloseDate: '', nextDueDate: '', isPaid: false });
            }
        } else {
            setForm({
                name: '', bank: '', closeDay: '', dueDay: '', color: PRESET_COLORS[0]
            });
            setStatement({ totalDue: '', dueDate: '', nextCloseDate: '', nextDueDate: '', isPaid: false });
        }
    }

    const handleSaveCard = async (e) => {
        e.preventDefault();
        try {
            if (isNewCard) {
                const newRef = doc(collection(db, 'cards'));
                await setDoc(newRef, {
                    ...form,
                    householdId,
                    createdAt: new Date().toISOString()
                });
            } else {
                await updateDoc(doc(db, 'cards', card.id), { ...form });
            }
            onBack();
        } catch (error) {
            console.error('Error guardando tarjeta:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`¿Eliminar la tarjeta ${card.name}? Se borrará el historial de resúmenes.`)) return;
        try {
            await deleteDoc(doc(db, 'cards', card.id));
            onBack();
        } catch (error) {
            console.error('Error eliminando:', error);
        }
    };

    const handleSaveStatement = async (e) => {
        e.preventDefault();
        try {
            const cardRef = doc(db, 'cards', card.id);
            const updates = {
                [`monthlyStatements.${monthKey}`]: {
                    totalDue: Number(statement.totalDue) || 0,
                    dueDate: statement.dueDate,
                    nextCloseDate: statement.nextCloseDate,
                    nextDueDate: statement.nextDueDate,
                    updatedAt: new Date().toISOString()
                }
            };
            if (statement.isPaid && !card.paidPeriods?.includes(monthKey)) {
                updates.paidPeriods = arrayUnion(monthKey);
            } else if (!statement.isPaid && card.paidPeriods?.includes(monthKey)) {
                updates.paidPeriods = arrayRemove(monthKey);
            }
            await updateDoc(cardRef, updates);
            onBack();
        } catch (error) {
            console.error('Error guardando resumen:', error);
        }
    };

    // Estilos modulares
    const headerClass = isGlass ? 'bg-white/10 border-white/10 text-white' : 'bg-brand-primary border-brand-primary text-white shadow-md';
    const tabClass = (active) => active
        ? isGlass ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-brand-dark shadow-sm'
        : isGlass ? 'text-white/60 hover:bg-white/10' : 'text-surface-dark hover:bg-gray-100';
    const labelClass = `block text-xs font-bold mb-1.5 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-500'}`;
    const inputClass = `w-full px-4 py-3 rounded-xl border outline-none transition-all ${isGlass ? 'bg-white/5 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`;

    return (
        <div className="space-y-4">
            {/* Header / Nav */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 border ${headerClass}`}>
                <button type="button" onClick={onBack} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <CreditCardIcon size={18} />
                        <h2 className="font-bold text-lg truncate leading-tight">
                            {isNewCard ? 'Nueva Tarjeta' : form.name || 'Editar Tarjeta'}
                        </h2>
                    </div>
                </div>
                {!isNewCard && (
                    <button type="button" onClick={handleDelete} className="p-2 rounded-xl text-red-100 bg-red-500/20 hover:bg-red-500/40 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                )}
            </div>

            {/* Tabs */}
            {!isNewCard && (
                <div className={`flex p-1.5 rounded-2xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                    <button type="button" onClick={() => setActiveTab('statement')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tabClass(activeTab === 'statement')}`}>Resumen Actual</button>
                    <button type="button" onClick={() => setActiveTab('pdf')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tabClass(activeTab === 'pdf')}`}>PDF Automático</button>
                    <button type="button" onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tabClass(activeTab === 'history')}`}>Historial</button>
                    <button type="button" onClick={() => setActiveTab('card')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tabClass(activeTab === 'card')}`}>Ajustes</button>
                </div>
            )}

            {/* Content */}
            <div className={`rounded-3xl p-5 sm:p-6 border ${isGlass ? 'bg-white/10 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                {/* Tab: Card Settings */}
                {activeTab === 'card' && (
                    <form onSubmit={handleSaveCard} className="space-y-4">
                        {!isNewCard && (
                            <div className={`p-4 rounded-xl mb-4 border ${isGlass ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                                <div className="flex gap-3">
                                    <Sparkles size={20} className="flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm mb-0.5">Vista visual automática</p>
                                        <p className="text-xs opacity-80">Escribí "Galicia Visa", "BBVA Master", "Naranja" etc., para mostrar el logo real.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={labelClass} htmlFor="cardName">Nombre (ej. Visa Oro)</label>
                            <input id="cardName" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Descripción corta" />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="cardBank">Banco Emisor</label>
                            <input id="cardBank" required value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} className={inputClass} placeholder="Galicia, Santander, etc." />
                        </div>
                        <div>
                            <label className={`${labelClass} mb-2`} id="cardColorLabel">Color de Tarjeta</label>
                            <div className="flex flex-wrap gap-2 p-2" aria-labelledby="cardColorLabel">
                                {PRESET_COLORS.map(color => (
                                    <button key={color} type="button" onClick={() => setForm({ ...form, color })} className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: color }} />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass} htmlFor="cardCloseDay">Día de Cierre</label>
                                <input id="cardCloseDay" required type="number" min="1" max="31" value={form.closeDay} onChange={e => setForm({ ...form, closeDay: e.target.value })} className={`${inputClass} text-center`} placeholder="Ej: 5" />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="cardDueDay">Día de Vencimiento</label>
                                <input id="cardDueDay" required type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} className={`${inputClass} text-center`} placeholder="Ej: 20" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            {card && (
                                <button type="button" onClick={onBack} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${isGlass ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${isGlass ? 'bg-surface-light text-brand-dark hover:bg-gray-200' : 'bg-brand-primary text-surface-light hover:bg-blue-700'}`}>
                                {isNewCard ? 'Crear Tarjeta' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tab: Manual Statement (Resumen Actual) */}
                {activeTab === 'statement' && (
                    <div className="space-y-4 max-w-sm mx-auto">
                        {/* Mini preview */}
                        <div className="flex justify-center mb-6">
                            <CardVisual card={card} monthKey={monthKey} privacyMode={privacyMode} isSelected={true} />
                        </div>

                        <form onSubmit={handleSaveStatement} className="space-y-4">
                            <div className={`p-4 rounded-2xl space-y-4 border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Estado de pago</p>
                                        <p className={`text-sm font-bold ${statement.isPaid ? 'text-emerald-500' : isGlass ? 'text-white' : 'text-gray-800'}`}>
                                            {statement.isPaid ? 'Resumen Pagado' : 'Pendiente de Pago'}
                                        </p>
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
                                    <label className={labelClass} htmlFor="statementTotalDue">Total a Pagar ($)</label>
                                    <input
                                        id="statementTotalDue"
                                        type="text" inputMode="numeric"
                                        value={formatInputNumber(statement.totalDue)}
                                        onChange={e => setStatement({ ...statement, totalDue: parseInputNumber(e.target.value) })}
                                        className={inputClass} placeholder="Ej: 85.000"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="statementDueDate">Fecha de Vencimiento</label>
                                    <input id="statementDueDate" type="date" value={statement.dueDate} onChange={e => setStatement({ ...statement, dueDate: e.target.value })} className={inputClass} />
                                </div>

                                <div className={`p-3 rounded-xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase mb-3 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Próximo período</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass} htmlFor="statementNextCloseDate">Próximo Cierre</label>
                                            <input id="statementNextCloseDate" type="date" value={statement.nextCloseDate} onChange={e => setStatement({ ...statement, nextCloseDate: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass} htmlFor="statementNextDueDate">Próximo Vencimiento</label>
                                            <input id="statementNextDueDate" type="date" value={statement.nextDueDate} onChange={e => setStatement({ ...statement, nextDueDate: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isGlass ? 'bg-surface-light text-brand-dark hover:bg-gray-200' : 'bg-brand-primary text-surface-light hover:bg-blue-700'}`}>
                                    Guardar Resumen
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab: PDF Parsing */}
                {activeTab === 'pdf' && (
                    <div className="max-w-md mx-auto py-2">
                        <StatementUploader card={card} currentMonthKey={monthKey} onBack={onBack} />
                    </div>
                )}

                {/* Tab: History */}
                {activeTab === 'history' && (
                    <StatementDashboard card={card} />
                )}
            </div>
        </div>
    );
}
