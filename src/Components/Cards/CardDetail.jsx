import React, { useState, useMemo, useEffect } from 'react';
import { formatInputNumber, parseInputNumber } from '../../utils';
import StatementUploader from './StatementUploader';
import StatementDashboard from './StatementDashboard';
import CardVisual from './CardVisual';
import ConfirmDialog from '../UI/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useUI, useUIDispatch } from '../../context/UIContext';
import { useCardsDispatch } from '../../context/CardsContext';
import { Sparkles, ArrowLeft, CreditCard as CreditCardIcon, Trash2, Loader2, Users } from 'lucide-react';
import { formatMonthKey } from '../../utils/cardDebtUtils';
import { ENABLE_HOUSEHOLD } from '../../config/constants';

const PRESET_COLORS = [
    '#1a1a1a', '#005f73', '#0a9396', '#ae2012',
    '#6a4c93', '#ca6702', '#2d3277', '#e63946', '#457b9d', '#ff006e'
];

export default function CardDetail({ card, isNewCard, currentDate, onBack }) {
    const { userData } = useAuth();
    const { isGlass, privacyMode } = useUI();
    const { showToast } = useUIDispatch();
    const { addCard, updateCard, deleteCard, saveStatement } = useCardsDispatch();

    const [activeTab, setActiveTab] = useState(isNewCard ? 'card' : 'statement');
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const isHouseholdEnabled = Boolean(ENABLE_HOUSEHOLD && userData?.householdId);
    const monthKey = formatMonthKey(currentDate);

    const [form, setForm] = useState({
        name: card?.name || '',
        bank: card?.bank || '',
        last4: card?.last4 != null ? String(card.last4) : '',
        closeDay: card?.closeDay != null ? String(card.closeDay) : '',
        dueDay: card?.dueDay != null ? String(card.dueDay) : '',
        color: card?.color || PRESET_COLORS[0],
        isShared: card?.isShared !== undefined ? card.isShared : true
    });

    const [statement, setStatement] = useState({
        totalDue: card?.monthlyStatements?.[monthKey]?.totalDue != null ? String(card.monthlyStatements[monthKey].totalDue) : '',
        dueDate: card?.monthlyStatements?.[monthKey]?.dueDate || '',
        nextCloseDate: card?.monthlyStatements?.[monthKey]?.nextCloseDate || '',
        nextDueDate: card?.monthlyStatements?.[monthKey]?.nextDueDate || '',
        isPaid: Boolean(card?.paidPeriods?.includes(monthKey)),
        transactions: card?.monthlyStatements?.[monthKey]?.transactions || []
    });

    const [prevCardId, setPrevCardId] = useState(card?.id || null);
    const [prevIsNewCard, setPrevIsNewCard] = useState(isNewCard);
    const [prevMonthKey, setPrevMonthKey] = useState(monthKey);
    const [prevCardUpdatedAt, setPrevCardUpdatedAt] = useState(card?.updatedAt || null);

    // Sincronización limpia al cambiar de tarjeta, modo, mes o actualización externa
    if (card?.id !== prevCardId || isNewCard !== prevIsNewCard || monthKey !== prevMonthKey || (!isSaving && card?.updatedAt !== prevCardUpdatedAt)) {
        setPrevCardId(card?.id || null);
        setPrevIsNewCard(isNewCard);
        setPrevMonthKey(monthKey);
        setPrevCardUpdatedAt(card?.updatedAt || null);
        setFormErrors({});

        if (card && !isNewCard) {
            setForm({
                name: card.name || '',
                bank: card.bank || '',
                last4: card.last4 != null ? String(card.last4) : '',
                closeDay: card.closeDay != null ? String(card.closeDay) : '',
                dueDay: card.dueDay != null ? String(card.dueDay) : '',
                color: card.color || PRESET_COLORS[0],
                isShared: card.isShared !== undefined ? card.isShared : true
            });
            const st = card.monthlyStatements?.[monthKey];
            if (st) {
                setStatement({
                    totalDue: st.totalDue != null ? String(st.totalDue) : '',
                    dueDate: st.dueDate || '',
                    nextCloseDate: st.nextCloseDate || '',
                    nextDueDate: st.nextDueDate || '',
                    isPaid: Boolean(card.paidPeriods?.includes(monthKey)),
                    transactions: st.transactions || []
                });
            } else {
                setStatement({
                    totalDue: '',
                    dueDate: '',
                    nextCloseDate: '',
                    nextDueDate: '',
                    isPaid: Boolean(card?.paidPeriods?.includes(monthKey)),
                    transactions: []
                });
            }
        } else {
            setForm({
                name: '',
                bank: '',
                last4: '',
                closeDay: '',
                dueDay: '',
                color: PRESET_COLORS[0],
                isShared: true
            });
            setStatement({ totalDue: '', dueDate: '', nextCloseDate: '', nextDueDate: '', isPaid: false, transactions: [] });
        }
    }

    const validateForm = () => {
        const errors = {};
        const trimmedName = form.name.trim();
        const trimmedBank = form.bank.trim();
        const close = parseInt(form.closeDay, 10);
        const due = parseInt(form.dueDay, 10);

        if (!trimmedName) {
            errors.name = 'El nombre es obligatorio.';
        } else if (trimmedName.length > 50) {
            errors.name = 'Máximo 50 caracteres.';
        }

        if (!trimmedBank) {
            errors.bank = 'El banco emisor es obligatorio.';
        } else if (trimmedBank.length > 50) {
            errors.bank = 'Máximo 50 caracteres.';
        }

        if (form.last4 && form.last4.trim() !== '') {
            const trimmedLast4 = form.last4.trim();
            if (!/^\d{4}$/.test(trimmedLast4)) {
                errors.last4 = 'Deben ser exactamente 4 números (ej: 4589).';
            }
        }

        if (!form.closeDay || isNaN(close) || close < 1 || close > 31 || Number(form.closeDay) % 1 !== 0) {
            errors.closeDay = 'Día entero entre 1 y 31.';
        }

        if (!form.dueDay || isNaN(due) || due < 1 || due > 31 || Number(form.dueDay) % 1 !== 0) {
            errors.dueDay = 'Día entero entre 1 y 31.';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveCard = async (e) => {
        e.preventDefault();
        if (isSaving || isDeleting || !validateForm()) return;

        setIsSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                bank: form.bank.trim(),
                closeDay: parseInt(form.closeDay, 10),
                dueDay: parseInt(form.dueDay, 10),
                color: form.color,
                isShared: form.isShared,
                last4: form.last4 && form.last4.trim() ? form.last4.trim() : null
            };

            if (isNewCard) {
                await addCard(payload);
            } else {
                await updateCard(card.id, payload);
            }
            onBack();
        } catch {
            // El toast de error lo emite CardsContext
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!card?.id || isDeleting || isSaving) return;
        setIsDeleting(true);
        try {
            await deleteCard(card.id);
            setIsDeleteOpen(false);
            onBack();
        } catch {
            // El toast de error lo emite CardsContext
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveStatement = async (e) => {
        e.preventDefault();
        if (!card?.id || isSaving || isDeleting) return;

        setIsSaving(true);
        try {
            await saveStatement(card.id, monthKey, {
                totalDue: statement.totalDue,
                dueDate: statement.dueDate,
                nextCloseDate: statement.nextCloseDate,
                nextDueDate: statement.nextDueDate,
                isPaid: statement.isPaid,
                transactions: statement.transactions || []
            });
            onBack();
        } catch {
            // El toast de error lo emite CardsContext
        } finally {
            setIsSaving(false);
        }
    };

    // Tarjeta reactiva para el preview visual en vivo mientras el usuario edita
    const previewCard = useMemo(() => {
        const baseName = isNewCard ? (form.name || 'Nueva Tarjeta') : (form.name || card?.name || 'Tarjeta');
        const baseBank = isNewCard ? (form.bank || 'Banco Emisor') : (form.bank || card?.bank || 'Banco Emisor');
        const baseColor = form.color || card?.color || PRESET_COLORS[0];
        const baseClose = form.closeDay ? parseInt(form.closeDay, 10) : (card?.closeDay || null);
        const baseDue = form.dueDay ? parseInt(form.dueDay, 10) : (card?.dueDay || null);
        const baseLast4 = form.last4 ? form.last4.trim() : (card?.last4 || null);

        const currentStmt = {
            ...(card?.monthlyStatements?.[monthKey] || {}),
            totalDue: statement.totalDue,
            dueDate: statement.dueDate,
            nextCloseDate: statement.nextCloseDate,
            nextDueDate: statement.nextDueDate,
            transactions: statement.transactions || []
        };

        const currentPaidPeriods = statement.isPaid
            ? Array.from(new Set([...(card?.paidPeriods || []), monthKey]))
            : (card?.paidPeriods || []).filter(p => p !== monthKey);

        return {
            id: card?.id || 'preview',
            name: baseName,
            bank: baseBank,
            last4: baseLast4,
            color: baseColor,
            closeDay: baseClose,
            dueDay: baseDue,
            isShared: form.isShared,
            monthlyStatements: {
                ...(card?.monthlyStatements || {}),
                [monthKey]: currentStmt
            },
            paidPeriods: currentPaidPeriods
        };
    }, [card, form, statement, monthKey, isNewCard]);

    // Resumen actual priorizando datos recién analizados por IA o editados localmente
    const currentStatement = useMemo(() => {
        if (statement.transactions && statement.transactions.length > 0) {
            return statement;
        }
        if (card?.monthlyStatements?.[monthKey]) {
            return {
                ...card.monthlyStatements[monthKey],
                ...(statement.totalDue !== '' ? { totalDue: statement.totalDue } : {})
            };
        }
        return statement.totalDue ? statement : null;
    }, [card?.monthlyStatements, monthKey, statement]);

    // Estilos modulares
    const headerClass = isGlass ? 'bg-white/10 border-white/10 text-white' : 'bg-brand-primary border-brand-primary text-white shadow-md shadow-blue-200';
    const tabClass = (active) => active
        ? isGlass ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-brand-dark shadow-sm'
        : isGlass ? 'text-white/60 hover:bg-white/10' : 'text-surface-dark hover:bg-gray-100';
    const labelClass = `block text-xs font-bold mb-1.5 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-500'}`;
    const inputClass = `w-full px-4 py-3 rounded-xl border outline-none transition-all ${isGlass ? 'bg-white/5 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`;

    // Si la tarjeta fue eliminada por otra sesión mientras se visualiza, volver al panel mediante efecto limpio
    useEffect(() => {
        if (!isNewCard && !card) {
            onBack();
        }
    }, [isNewCard, card, onBack]);

    if (!isNewCard && !card) {
        return null;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header / Nav */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 border ${headerClass}`}>
                <button
                    aria-label="Volver al listado"
                    type="button"
                    disabled={isSaving || isDeleting}
                    onClick={onBack}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95 disabled:opacity-50"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <CreditCardIcon size={18} />
                        <h2 className="font-bold text-lg truncate leading-tight">
                            {isNewCard ? 'Nueva Tarjeta' : form.name || 'Detalle de Tarjeta'}
                        </h2>
                    </div>
                </div>
                {!isNewCard && (
                    <button
                        aria-label="Eliminar tarjeta"
                        type="button"
                        disabled={isDeleting || isSaving}
                        onClick={() => setIsDeleteOpen(true)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-500/20 text-red-100 hover:bg-red-500/40 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                )}
            </div>

            {/* Tabs */}
            {!isNewCard && (
                <div className={`flex p-1.5 rounded-2xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                    <button aria-label="Pestaña Resumen Actual" type="button" onClick={() => setActiveTab('statement')} className={`flex-1 py-2.5 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${tabClass(activeTab === 'statement')}`}>
                        <span className="hidden sm:inline">Resumen Actual</span>
                        <span className="sm:hidden">Resumen</span>
                    </button>
                    <button aria-label="Pestaña PDF Automático" type="button" onClick={() => setActiveTab('pdf')} className={`flex-1 py-2.5 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${tabClass(activeTab === 'pdf')}`}>
                        <span className="hidden sm:inline">PDF con IA</span>
                        <span className="sm:hidden">PDF / IA</span>
                    </button>
                    <button aria-label="Pestaña Historial" type="button" onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${tabClass(activeTab === 'history')}`}>Historial</button>
                    <button aria-label="Pestaña Ajustes" type="button" onClick={() => setActiveTab('card')} className={`flex-1 py-2.5 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${tabClass(activeTab === 'card')}`}>Ajustes</button>
                </div>
            )}

            {/* Content */}
            <div className={`rounded-3xl p-5 sm:p-6 border ${isGlass ? 'bg-white/10 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                {/* Tab: Card Settings */}
                {activeTab === 'card' && (
                    <form onSubmit={handleSaveCard} className="space-y-4">
                        {/* Vista previa en tiempo real mientras se personaliza */}
                        <div className="flex justify-center mb-5">
                            <CardVisual card={previewCard} monthKey={monthKey} privacyMode={privacyMode} isSelected={true} />
                        </div>

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
                            <label className={labelClass} htmlFor="cardName">Nombre de la Tarjeta (ej. Visa Oro)</label>
                            <input
                                autoComplete="off"
                                id="cardName"
                                required
                                value={form.name}
                                onChange={e => {
                                    setForm({ ...form, name: e.target.value });
                                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                                }}
                                className={`${inputClass} ${formErrors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                placeholder="Descripción corta"
                            />
                            {formErrors.name && (
                                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="cardBank">Banco Emisor</label>
                            <input
                                autoComplete="off"
                                id="cardBank"
                                required
                                value={form.bank}
                                onChange={e => {
                                    setForm({ ...form, bank: e.target.value });
                                    if (formErrors.bank) setFormErrors({ ...formErrors, bank: null });
                                }}
                                className={`${inputClass} ${formErrors.bank ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                placeholder="Galicia, Santander, BBVA, etc."
                            />
                            {formErrors.bank && (
                                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formErrors.bank}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="cardLast4">Últimos 4 dígitos (opcional)</label>
                            <input
                                autoComplete="off"
                                id="cardLast4"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={form.last4}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setForm({ ...form, last4: val });
                                    if (formErrors.last4) setFormErrors({ ...formErrors, last4: null });
                                }}
                                className={`${inputClass} font-mono tracking-widest ${formErrors.last4 ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                placeholder="Ej: 4589"
                            />
                            {formErrors.last4 && (
                                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formErrors.last4}</p>
                            )}
                        </div>

                        <div>
                            <label className={`${labelClass} mb-2`} id="cardColorLabel">Color de Tarjeta</label>
                            <div className="flex flex-wrap gap-2.5 p-2 items-center" aria-labelledby="cardColorLabel">
                                {PRESET_COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        aria-label={`Seleccionar color ${color}`}
                                        onClick={() => setForm({ ...form, color })}
                                        className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-95 ${form.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass} htmlFor="cardCloseDay">Día de Cierre</label>
                                <input
                                    autoComplete="off"
                                    id="cardCloseDay"
                                    required
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={form.closeDay}
                                    onChange={e => {
                                        setForm({ ...form, closeDay: e.target.value });
                                        if (formErrors.closeDay) setFormErrors({ ...formErrors, closeDay: null });
                                    }}
                                    className={`${inputClass} text-center ${formErrors.closeDay ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                    placeholder="Ej: 5"
                                />
                                {formErrors.closeDay && (
                                    <p className="text-red-500 text-xs mt-1 text-center font-medium">{formErrors.closeDay}</p>
                                )}
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="cardDueDay">Día de Vencimiento</label>
                                <input
                                    autoComplete="off"
                                    id="cardDueDay"
                                    required
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={form.dueDay}
                                    onChange={e => {
                                        setForm({ ...form, dueDay: e.target.value });
                                        if (formErrors.dueDay) setFormErrors({ ...formErrors, dueDay: null });
                                    }}
                                    className={`${inputClass} text-center ${formErrors.dueDay ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                    placeholder="Ej: 20"
                                />
                                {formErrors.dueDay && (
                                    <p className="text-red-500 text-xs mt-1 text-center font-medium">{formErrors.dueDay}</p>
                                )}
                            </div>
                        </div>

                        {/* Selector de compartir en el hogar si aplica */}
                        {isHouseholdEnabled && (
                            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                        <Users size={16} />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Tarjeta compartida</p>
                                        <p className={`text-[10px] ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Visible para el resto del hogar</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    disabled={isSaving || isDeleting}
                                    aria-checked={form.isShared}
                                    aria-label="Alternar tarjeta compartida en el hogar"
                                    onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))}
                                    className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-0.5 min-h-[44px] ${form.isShared ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-white/20'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${form.isShared ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                aria-label="Cancelar edición"
                                type="button"
                                disabled={isSaving || isDeleting}
                                onClick={onBack}
                                className={`flex-1 py-3.5 min-h-[48px] rounded-xl font-bold text-sm transition-all ${isGlass ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                aria-label={isNewCard ? 'Crear tarjeta' : 'Guardar cambios'}
                                type="submit"
                                disabled={isSaving || isDeleting}
                                className={`flex-1 py-3.5 min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''} ${isGlass ? 'bg-surface-light text-brand-dark hover:bg-gray-200' : 'bg-brand-primary text-surface-light hover:bg-blue-700 shadow-md shadow-blue-500/20'}`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    isNewCard ? 'Crear Tarjeta' : 'Guardar Cambios'
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tab: Manual Statement (Resumen Actual) */}
                {activeTab === 'statement' && (
                    <div className="space-y-4 max-w-sm mx-auto">
                        {/* Mini preview en tiempo real */}
                        <div className="flex justify-center mb-4">
                            <CardVisual card={previewCard} monthKey={monthKey} privacyMode={privacyMode} isSelected={true} />
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
                                        role="switch"
                                        aria-checked={statement.isPaid}
                                        disabled={isSaving || isDeleting}
                                        aria-label={statement.isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                                        onClick={() => setStatement(s => ({ ...s, isPaid: !s.isPaid }))}
                                        className={`w-14 h-8 rounded-full transition-all relative flex items-center px-1 min-h-[44px] ${statement.isPaid ? 'bg-status-success' : 'bg-white/10 border border-gray-300 dark:border-white/20'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm ${statement.isPaid ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <p className={`text-[10px] font-bold uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'} ml-1`}>Datos del período</p>

                                <div>
                                    <label className={labelClass} htmlFor="statementTotalDue">Total a Pagar ($)</label>
                                    <input
                                        autoComplete="off"
                                        id="statementTotalDue"
                                        type="text"
                                        inputMode="numeric"
                                        value={formatInputNumber(statement.totalDue)}
                                        onChange={e => setStatement({ ...statement, totalDue: e.target.value === '' ? '' : parseInputNumber(e.target.value) })}
                                        className={inputClass}
                                        placeholder="Ej: 85.000"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="statementDueDate">Fecha de Vencimiento</label>
                                    <input
                                        autoComplete="off"
                                        id="statementDueDate"
                                        type="date"
                                        value={statement.dueDate}
                                        onChange={e => setStatement({ ...statement, dueDate: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>

                                <div className={`p-3 rounded-xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase mb-3 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Próximo período</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass} htmlFor="statementNextCloseDate">Próximo Cierre</label>
                                            <input
                                                autoComplete="off"
                                                id="statementNextCloseDate"
                                                type="date"
                                                value={statement.nextCloseDate}
                                                onChange={e => setStatement({ ...statement, nextCloseDate: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass} htmlFor="statementNextDueDate">Próximo Vencimiento</label>
                                            <input
                                                autoComplete="off"
                                                id="statementNextDueDate"
                                                type="date"
                                                value={statement.nextDueDate}
                                                onChange={e => setStatement({ ...statement, nextDueDate: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    aria-label="Guardar resumen mensual"
                                    type="submit"
                                    disabled={isSaving || isDeleting}
                                    className={`w-full py-3.5 min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isSaving || isDeleting ? 'opacity-70 cursor-not-allowed' : ''} ${isGlass ? 'bg-surface-light text-brand-dark hover:bg-gray-200' : 'bg-brand-primary text-surface-light hover:bg-blue-700 shadow-md shadow-blue-500/20'}`}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        'Guardar Resumen'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab: PDF Parsing */}
                {activeTab === 'pdf' && (
                    <div className="max-w-md mx-auto py-2">
                        <StatementUploader 
                            card={card} 
                            currentMonthKey={monthKey} 
                            onBack={onBack} 
                            onAnalysisComplete={async (result) => {
                                if (result && result.summary) {
                                    setIsSaving(true);
                                    try {
                                        const totalConsumption = result.summary.totalConsumption || 0;
                                        const newTransactions = result.transactions || [];
                                        await saveStatement(card.id, monthKey, {
                                            totalDue: totalConsumption,
                                            dueDate: result.summary.dueDate || '',
                                            nextCloseDate: result.summary.nextClosingDate || '',
                                            nextDueDate: result.summary.nextDueDate || '',
                                            transactions: newTransactions,
                                            isPaid: statement.isPaid
                                        });
                                        setStatement(prev => ({
                                            ...prev,
                                            totalDue: String(totalConsumption),
                                            dueDate: result.summary.dueDate || '',
                                            nextCloseDate: result.summary.nextClosingDate || '',
                                            nextDueDate: result.summary.nextDueDate || '',
                                            transactions: newTransactions
                                        }));
                                        setActiveTab('history');
                                    } catch {
                                        showToast('Error al procesar el resumen con IA.', 'error');
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }
                            }}
                        />
                    </div>
                )}

                {/* Tab: History */}
                {activeTab === 'history' && (
                    <StatementDashboard 
                        statement={currentStatement} 
                        isGlass={isGlass}
                        onReload={() => setActiveTab('pdf')}
                    />
                )}
            </div>
            
            <ConfirmDialog
                isOpen={isDeleteOpen}
                title="¿Eliminar tarjeta?"
                message={`¿Eliminar la tarjeta ${card?.name || ''}? Se borrará todo el historial de resúmenes de esta tarjeta.`}
                confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                isDanger={true}
                onConfirm={handleDelete}
                onCancel={() => { if (!isDeleting) setIsDeleteOpen(false); }}
            />
        </div>
    );
}
